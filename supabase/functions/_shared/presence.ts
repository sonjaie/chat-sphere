// Shared helpers for presence Edge Functions
// Deno runtime (Supabase Edge Functions)
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2'

export type PresenceState = 'ONLINE' | 'AWAY' | 'OFFLINE'

export const corsHeaders: HeadersInit = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export function getAdminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  const key = serviceKey || anon
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or service key for Edge Function')
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function getThresholds() {
  const IDLE_TO_AWAY_MINUTES = parseInt(Deno.env.get('IDLE_TO_AWAY') ?? '5', 10)
  const AWAY_TO_OFFLINE_MINUTES = parseInt(Deno.env.get('AWAY_TO_OFFLINE') ?? '30', 10)
  const DISCONNECT_GRACE_SECONDS = parseInt(Deno.env.get('DISCONNECT_GRACE') ?? '60', 10)
  const ACTIVITY_THROTTLE_SECONDS = parseInt(Deno.env.get('ACTIVITY_THROTTLE_WINDOW') ?? '30', 10)
  return {
    IDLE_TO_AWAY_MINUTES,
    AWAY_TO_OFFLINE_MINUTES,
    DISCONNECT_GRACE_SECONDS,
    ACTIVITY_THROTTLE_SECONDS,
  }
}

export async function ensureUsersRow(sb: SupabaseClient, user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) {
  // Already exists by id?
  const { data: existingById, error: idErr } = await sb
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()
  if (!idErr && existingById) return true

  const displayName = (user.user_metadata as any)?.full_name || user.email || 'User'
  const primaryEmail = user.email || `${user.id}@example.local`
  const fallbackEmail = `${user.id}@presence.local`

  // Try insert with primary email
  let insert = await sb.from('users').insert({
    id: user.id,
    email: primaryEmail,
    name: displayName,
    password: 'supabase_auth_handled',
  })
  if (insert.error) {
    // If duplicate email, try with fallback email to satisfy unique constraint
    const code = (insert.error as any).code
    if (code === '23505') {
      insert = await sb.from('users').insert({
        id: user.id,
        email: fallbackEmail,
        name: displayName,
        password: 'supabase_auth_handled',
      })
      if (insert.error) return false
    } else {
      return false
    }
  }

  // Ensure created
  const { data: ensured } = await sb
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()
  return !!ensured
}

export async function fetchConnectedCount(sb: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await sb
    .from('device_connections')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('disconnected_at', null)
  if (error) throw error
  return data === null ? 0 : (data as unknown as any).length ?? 0 // count available via head:true? fallback query below
}

export async function countActiveConnections(sb: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await sb
    .from('device_connections')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('disconnected_at', null)
  if (error) throw error
  return count ?? 0
}

export async function hasFreshActivity(sb: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await sb
    .from('presence_activity_ttl')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return !!data
}

export async function upsertPresence(
  sb: SupabaseClient,
  userId: string,
  next: PresenceState,
  connectedCount: number,
  lastActivityAt?: string | null,
) {
  // Fetch current to decide changed_at
  const { data: current, error: fetchErr } = await sb
    .from('presence_state')
    .select('state')
    .eq('user_id', userId)
    .maybeSingle()
  if (fetchErr) throw fetchErr
  const changed = current?.state !== next

  const patch: any = {
    user_id: userId,
    state: next,
    connected_device_count: connectedCount,
  }
  if (lastActivityAt) patch.last_activity_at = lastActivityAt
  if (changed) patch.changed_at = new Date().toISOString()

  const { error: upErr } = await sb.from('presence_state').upsert(patch)
  if (upErr) throw upErr

  // Also mirror into users.status for existing UI (lowercase)
  await updateUsersStatus(sb, userId, next)
}

export async function updateUsersStatus(sb: SupabaseClient, userId: string, state: PresenceState) {
  const status = state.toLowerCase()
  const { error } = await sb
    .from('users')
    .update({ status, last_seen: new Date().toISOString() })
    .eq('id', userId)
  if (error) throw error
}

export function ok(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

export function err(message = 'Internal Error', status = 500) {
  return new Response(JSON.stringify({ error: message }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

export async function setActivityTTL(sb: SupabaseClient, userId: string, minutes: number) {
  const expires = new Date(Date.now() + minutes * 60_000).toISOString()
  const { error } = await sb
    .from('presence_activity_ttl')
    .upsert({ user_id: userId, expires_at: expires })
  if (error) throw error
}

export async function clearActivityTTL(sb: SupabaseClient, userId: string) {
  await sb.from('presence_activity_ttl').delete().eq('user_id', userId)
}

export async function setAwayTTL(sb: SupabaseClient, userId: string, minutes: number) {
  const expires = new Date(Date.now() + minutes * 60_000).toISOString()
  const { error } = await sb
    .from('presence_away_ttl')
    .upsert({ user_id: userId, expires_at: expires })
  if (error) throw error
}

export async function clearAwayTTL(sb: SupabaseClient, userId: string) {
  await sb.from('presence_away_ttl').delete().eq('user_id', userId)
}

export async function setDisconnectGrace(sb: SupabaseClient, userId: string, seconds: number) {
  const expires = new Date(Date.now() + seconds * 1000).toISOString()
  const { error } = await sb
    .from('presence_disconnect_grace')
    .upsert({ user_id: userId, expires_at: expires })
  if (error) throw error
}

export async function clearDisconnectGrace(sb: SupabaseClient, userId: string) {
  await sb.from('presence_disconnect_grace').delete().eq('user_id', userId)
}
