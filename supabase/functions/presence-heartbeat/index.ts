import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { getAdminClient, corsHeaders, ok, err, ensureUsersRow } from '../_shared/presence.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const sb = getAdminClient()
    const authHeader = req.headers.get('Authorization')
    const { data: { user }, error: uerr } = await sb.auth.getUser(authHeader?.replace('Bearer ', '') ?? undefined)
    if (uerr || !user) return err('Unauthorized', 401)

    const body = await req.json().catch(() => ({})) as { deviceId?: string }
    const deviceId = body.deviceId || req.headers.get('x-device-id')

    const okUser = await ensureUsersRow(sb, user as any)
    if (!okUser) return err('User not provisioned', 500)
    if (!deviceId) return ok({ ok: true })

    const nowIso = new Date().toISOString()
    await sb
      .from('device_connections')
      .update({ last_heartbeat_at: nowIso })
      .eq('user_id', user.id)
      .eq('device_id', deviceId)
      .is('disconnected_at', null)

    return ok({ ok: true })
  } catch (e) {
    console.error('presence-heartbeat error', e)
    return err()
  }
})
