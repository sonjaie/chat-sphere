import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { getAdminClient, corsHeaders, ok, err } from '../_shared/presence.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')
    const idsParam = url.searchParams.get('ids')

    const sb = getAdminClient()

    if (userId) {
      const { data, error } = await sb.from('presence_state').select('*').eq('user_id', userId).maybeSingle()
      if (error) throw error
      return ok(data ?? null)
    }

    if (idsParam) {
      const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean)
      const { data, error } = await sb.from('presence_state').select('*').in('user_id', ids)
      if (error) throw error
      return ok(data ?? [])
    }

    const { data, error } = await sb.from('presence_state').select('*')
    if (error) throw error
    return ok(data ?? [])
  } catch (e) {
    console.error('presence-get error', e)
    return err()
  }
})
