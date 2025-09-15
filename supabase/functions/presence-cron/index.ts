import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { getAdminClient, getThresholds, countActiveConnections, upsertPresence, setAwayTTL, clearActivityTTL, corsHeaders, ok, err } from '../_shared/presence.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const sb = getAdminClient()
    const {
      IDLE_TO_AWAY_MINUTES,
      AWAY_TO_OFFLINE_MINUTES,
      DISCONNECT_GRACE_SECONDS,
    } = getThresholds()

    const now = new Date()
    const nowIso = now.toISOString()

    // 1) Mark stale device connections as disconnected if missed heartbeats beyond DISCONNECT_GRACE
    const hbDeadline = new Date(now.getTime() - DISCONNECT_GRACE_SECONDS * 1000).toISOString()
    const { data: staleDevs, error: staleErr } = await sb
      .from('device_connections')
      .select('id,user_id')
      .is('disconnected_at', null)
      .lt('last_heartbeat_at', hbDeadline)
    if (staleErr) throw staleErr
    if (staleDevs && staleDevs.length > 0) {
      const ids = staleDevs.map((d: any) => d.id)
      await sb.from('device_connections').update({ connection_status: 'disconnected', disconnected_at: nowIso }).in('id', ids)
    }

    // For users whose devices were closed, if they now have 0 connections, create disconnect grace if not exists
    if (staleDevs && staleDevs.length > 0) {
      const affectedUserIds = [...new Set(staleDevs.map((d: any) => d.user_id))]
      for (const uid of affectedUserIds) {
        const count = await countActiveConnections(sb, uid)
        if (count === 0) {
          // Only set if not exists
          const { data: grace } = await sb.from('presence_disconnect_grace').select('user_id').eq('user_id', uid).maybeSingle()
          if (!grace) {
            const expires = new Date(now.getTime() + DISCONNECT_GRACE_SECONDS * 1000).toISOString()
            await sb.from('presence_disconnect_grace').upsert({ user_id: uid, expires_at: expires })
          }
        }
      }
    }

    // 2) Expire activity -> set AWAY and set away TTL
    const { data: expiredActivity, error: actErr } = await sb
      .from('presence_activity_ttl')
      .select('user_id,expires_at')
      .lte('expires_at', nowIso)
    if (actErr) throw actErr
    if (expiredActivity && expiredActivity.length) {
      for (const row of expiredActivity) {
        const uid = row.user_id as string
        const connectedCount = await countActiveConnections(sb, uid)
        // Move to AWAY regardless of connections; OFFLINE is handled elsewhere
        await upsertPresence(sb, uid, 'AWAY', connectedCount)
        // Set away TTL only once: AWAY_TO_OFFLINE - IDLE_TO_AWAY minutes
        const delta = Math.max(AWAY_TO_OFFLINE_MINUTES - IDLE_TO_AWAY_MINUTES, 0)
        if (delta > 0) {
          await setAwayTTL(sb, uid, delta)
        }
        await clearActivityTTL(sb, uid)
      }
    }

    // 3) Expire away -> OFFLINE only if no connections
    const { data: expiredAway, error: awayErr } = await sb
      .from('presence_away_ttl')
      .select('user_id,expires_at')
      .lte('expires_at', nowIso)
    if (awayErr) throw awayErr
    if (expiredAway && expiredAway.length) {
      for (const row of expiredAway) {
        const uid = row.user_id as string
        const connectedCount = await countActiveConnections(sb, uid)
        if (connectedCount === 0) {
          await upsertPresence(sb, uid, 'OFFLINE', 0)
        } else {
          // Remain AWAY
          await upsertPresence(sb, uid, 'AWAY', connectedCount)
        }
        await sb.from('presence_away_ttl').delete().eq('user_id', uid)
      }
    }

    // 4) Expire disconnect grace -> OFFLINE if still 0 connections
    const { data: expiredGrace, error: graceErr } = await sb
      .from('presence_disconnect_grace')
      .select('user_id,expires_at')
      .lte('expires_at', nowIso)
    if (graceErr) throw graceErr
    if (expiredGrace && expiredGrace.length) {
      for (const row of expiredGrace) {
        const uid = row.user_id as string
        const connectedCount = await countActiveConnections(sb, uid)
        if (connectedCount === 0) {
          await upsertPresence(sb, uid, 'OFFLINE', 0)
        } else {
          // Still connected; keep current state (ONLINE or AWAY) - noop
          await upsertPresence(sb, uid, 'AWAY', connectedCount)
        }
        await sb.from('presence_disconnect_grace').delete().eq('user_id', uid)
      }
    }

    return ok({ ok: true })
  } catch (e) {
    console.error('presence-cron error', e)
    return err()
  }
})
