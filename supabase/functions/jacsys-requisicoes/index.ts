import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JACSYS_ENDPOINTS: Record<string, { path: string; maxIds: number }> = {
  requisicoes: { path: '/webhook/jacsys/requisicoes', maxIds: 50 },
  saldo: { path: '/webhook/jacsys/clientes/saldo', maxIds: 50 },
  credito: { path: '/webhook/jacsys/clientes/credito', maxIds: 50 },
  extrato: { path: '/webhook/jacsys/clientes/extrato', maxIds: 1 },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { ids, endpoint = 'requisicoes' } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return new Response(JSON.stringify({ error: 'ids array required' }), { status: 400, headers: corsHeaders });
    }

    const endpointConfig = JACSYS_ENDPOINTS[endpoint];
    if (!endpointConfig) {
      return new Response(JSON.stringify({ error: `Invalid endpoint: ${endpoint}` }), { status: 400, headers: corsHeaders });
    }

    const validIds = ids.filter((id: string) => /^\d{1,7}$/.test(String(id))).slice(0, endpointConfig.maxIds);
    if (validIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid IDs provided' }), { status: 400, headers: corsHeaders });
    }

    const apiUser = Deno.env.get('JACSYS_API_USER');
    const apiPassword = Deno.env.get('JACSYS_API_PASSWORD');
    if (!apiUser || !apiPassword) {
      return new Response(JSON.stringify({ error: 'API credentials not configured' }), { status: 500, headers: corsHeaders });
    }

    const basicAuth = btoa(`${apiUser}:${apiPassword}`);
    const url = `https://gomec-n8n.cloudfy.live${endpointConfig.path}?ids=${validIds.join(',')}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Basic ${basicAuth}` },
    });

    const rawText = await response.text();

    if (!response.ok) {
      throw new Error(`Jacsys API error [${response.status}]: ${rawText}`);
    }

    if (!rawText || rawText.trim().length === 0) {
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error('Failed to parse Jacsys response:', rawText.substring(0, 500));
      throw new Error('Invalid JSON response from Jacsys API');
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error fetching jacsys data:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
