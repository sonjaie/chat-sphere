import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { getAdminClient, getThresholds, countActiveConnections, upsertPresence, setActivityTTL, clearAwayTTL, corsHeaders, ok, err } from '../_shared/presence.ts'

// Records user activity (mouse/keyboard/touch/nav), throttled server-side.
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const sb = getAdminClient()
    const { IDLE_TO_AWAY_MINUTES, ACTIVITY_THROTTLE_SECONDS } = getThresholds()

    const authHeader = req.headers.get('Authorization')
    const { data: { user }, error: uerr } = await sb.auth.getUser(authHeader?.replace('Bearer ', '') ?? undefined)
    if (uerr || !user) return err('Unauthorized', 401)

    const body = await req.json().catch(() => ({})) as { deviceId?: string }
    const deviceId = body.deviceId || req.headers.get('x-device-id')

    const now = Date.now()
    const nowIso = new Date(now).toISOString()

    // Throttle by per-user memory using a keyed table via RPC-less simple table
    // We'll leverage device_connections.last_activity_at as the throttle basis per device
    if (deviceId) {
      // Fetch current last_activity_at
      const { data: dev } = await sb
        .from('device_connections')
        .select('id,last_activity_at')
        .eq('user_id', user.id)
        .eq('device_id', deviceId)
        .is('disconnected_at', null)
        .maybeSingle()

      const last = dev?.last_activity_at ? new Date(dev.last_activity_at).getTime() : 0
      if (!dev || now - last >= ACTIVITY_THROTTLE_SECONDS * 1000) {
        // Update device activity timestamp
        await sb
          .from('device_connections')
          .upsert({
            id: dev?.id,
            user_id: user.id,
            device_id: deviceId,
            connection_status: 'connected',
            last_activity_at: nowIso,
            last_heartbeat_at: nowIso,
            connected_at: dev?.id ? undefined : nowIso,
          }, { onConflict: 'id' })
      }
    }

    // Refresh activity TTL and ensure presence is ONLINE
    await setActivityTTL(sb, user.id, IDLE_TO_AWAY_MINUTES)
    await clearAwayTTL(sb, user.id)

    const connectedCount = await countActiveConnections(sb, user.id)
    await upsertPresence(sb, user.id, 'ONLINE', connectedCount, nowIso)

    return ok({ ok: true, state: 'ONLINE', connectedDeviceCount: connectedCount })
  } catch (e) {
    console.error('presence-activity error', e)
    return err()
  }
})
