import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { getAdminClient, getThresholds, countActiveConnections, hasFreshActivity, upsertPresence, clearDisconnectGrace, corsHeaders, ok, err, ensureUsersRow } from '../_shared/presence.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const sb = getAdminClient()
    const { IDLE_TO_AWAY_MINUTES } = getThresholds()

    const authHeader = req.headers.get('Authorization')
    const { data: { user }, error: uerr } = await sb.auth.getUser(authHeader?.replace('Bearer ', '') ?? undefined)
    if (uerr || !user) return err('Unauthorized', 401)

    const body = await req.json().catch(() => ({})) as { deviceId?: string }
    const deviceId = body.deviceId || req.headers.get('x-device-id') || crypto.randomUUID()

    // Ensure application users row exists to satisfy FK and status updates
    const okUser = await ensureUsersRow(sb, user as any)
    if (!okUser) return err('User not provisioned', 500)

    // Upsert device connection (active)
    // If an active record already exists, just update heartbeat
    const nowIso = new Date().toISOString()
    const { data: existing, error: exErr } = await sb
      .from('device_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('device_id', deviceId)
      .is('disconnected_at', null)
      .maybeSingle()
    if (exErr) throw exErr

    if (existing) {
      await sb.from('device_connections')
        .update({ last_heartbeat_at: nowIso })
        .eq('id', existing.id)
    } else {
      const { error: insErr } = await sb.from('device_connections').insert({
        user_id: user.id,
        device_id: deviceId,
        connection_status: 'connected',
        connected_at: nowIso,
        last_heartbeat_at: nowIso,
        last_activity_at: nowIso,
      })
      if (insErr) throw insErr
    }

    // Cancel disconnect grace if any
    await clearDisconnectGrace(sb, user.id)

    // Compute state and upsert presence
    const connectedCount = await countActiveConnections(sb, user.id)
    const fresh = await hasFreshActivity(sb, user.id)
    const nextState = fresh ? 'ONLINE' : 'AWAY'

    await upsertPresence(sb, user.id, nextState, connectedCount, fresh ? nowIso : undefined)

    // Ensure activity TTL exists when connecting; set to IDLE_TO_AWAY window
    if (fresh) {
      // nothing else; activity function manages TTL refreshes
    }

    return ok({ ok: true, deviceId, state: nextState, connectedDeviceCount: connectedCount })
  } catch (e) {
    console.error('presence-connect error', e)
    return err()
  }
})
