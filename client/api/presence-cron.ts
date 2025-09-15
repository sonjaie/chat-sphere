export default async function handler(req: Request): Promise<Response> {
  try {
    const supabaseUrl = (globalThis as any).process?.env?.VITE_SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL
    const anon = (globalThis as any).process?.env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY
    if (!supabaseUrl || !anon) {
      return new Response(JSON.stringify({ error: 'Missing env' }), { status: 500 })
    }
    const resp = await fetch(`${supabaseUrl}/functions/v1/presence-cron`, {
      method: 'POST',
      headers: {
        apikey: anon,
      },
    })
    const text = await resp.text()
    return new Response(text, { status: resp.status, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'proxy error' }), { status: 500 })
  }
}


