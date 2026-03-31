import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return new Response(JSON.stringify({ error: 'ids array required' }), { status: 400, headers: corsHeaders });
    }

    // Validate: only 7-digit numeric codes, max 50
    const validIds = ids.filter((id: string) => /^\d{1,7}$/.test(String(id))).slice(0, 50);
    if (validIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid IDs provided' }), { status: 400, headers: corsHeaders });
    }

    const apiUser = Deno.env.get('JACSYS_API_USER');
    const apiPassword = Deno.env.get('JACSYS_API_PASSWORD');
    if (!apiUser || !apiPassword) {
      return new Response(JSON.stringify({ error: 'API credentials not configured' }), { status: 500, headers: corsHeaders });
    }

    const basicAuth = btoa(`${apiUser}:${apiPassword}`);
    const url = `https://gomec-n8n.cloudfy.live/webhook/jacsys/requisicoes?ids=${validIds.join(',')}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Jacsys API error [${response.status}]: ${body}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error fetching requisicoes:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
