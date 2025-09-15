import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { getAdminClient, getThresholds, countActiveConnections, upsertPresence, setDisconnectGrace, corsHeaders, ok, err, ensureUsersRow } from '../_shared/presence.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const sb = getAdminClient()
    const { DISCONNECT_GRACE_SECONDS } = getThresholds()

    const authHeader = req.headers.get('Authorization')
    const { data: { user }, error: uerr } = await sb.auth.getUser(authHeader?.replace('Bearer ', '') ?? undefined)
    if (uerr || !user) return err('Unauthorized', 401)

    const body = await req.json().catch(() => ({})) as { deviceId?: string }
    const deviceId = body.deviceId || req.headers.get('x-device-id')
    if (!deviceId) return err('deviceId required', 400)

    const okUser = await ensureUsersRow(sb, user as any)
    if (!okUser) return err('User not provisioned', 500)

    // Mark device as disconnected
    const nowIso = new Date().toISOString()
    await sb.from('device_connections')
      .update({ connection_status: 'disconnected', disconnected_at: nowIso })
      .eq('user_id', user.id)
      .eq('device_id', deviceId)
      .is('disconnected_at', null)

    // Recompute connected device count
    const connectedCount = await countActiveConnections(sb, user.id)

    // If still >=1 connection, keep current ONLINE/AWAY state; else start grace
    if (connectedCount === 0) {
      await setDisconnectGrace(sb, user.id, DISCONNECT_GRACE_SECONDS)
    }

    // Do not force offline yet; update presence with new count only
    // Keep state unchanged if a presence row exists; otherwise OFFLINE when 0 connections
    const { data: current } = await sb
      .from('presence_state')
      .select('state')
      .eq('user_id', user.id)
      .maybeSingle()
    const nextState = current?.state as 'ONLINE' | 'AWAY' | 'OFFLINE' | undefined
    await upsertPresence(sb, user.id, nextState ?? (connectedCount > 0 ? 'AWAY' : 'OFFLINE'), connectedCount)

    return ok({ ok: true, connectedDeviceCount: connectedCount })
  } catch (e) {
    console.error('presence-disconnect error', e)
    return err()
  }
})
