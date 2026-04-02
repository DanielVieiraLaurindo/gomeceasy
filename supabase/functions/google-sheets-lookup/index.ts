import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SHEET_ID = '1VqGKyjTfa80V1EgRWT-SrEcoMSrNvNSTPXB10_TXWPs';

async function fetchSheetData(sheetName: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch sheet ${sheetName}: ${res.status}`);
  const csv = await res.text();
  
  const rows: string[][] = [];
  const lines = csv.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    rows.push(cells);
  }
  return rows;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { type, codigo } = await req.json();

    if (type === 'fornecedor') {
      const rows = await fetchSheetData('FORNECEDOR');
      if (codigo) {
        const found = rows.find(r => r[0]?.trim() === String(codigo).trim());
        return new Response(
          JSON.stringify({ success: true, nome: found ? found[1] || 'Não cadastrado' : 'Não cadastrado' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const fornecedores = rows.slice(1).filter(r => r[0]).map(r => ({ codigo: r[0], nome: r[1] || '' }));
      return new Response(
        JSON.stringify({ success: true, data: fornecedores }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (type === 'produto') {
      const rows = await fetchSheetData('PRODUTOS');
      if (codigo) {
        const found = rows.find(r => r[0]?.trim() === String(codigo).trim());
        return new Response(
          JSON.stringify({ success: true, descricao: found ? found[2] || 'Não cadastrado' : 'Não cadastrado' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const produtos = rows.slice(1).filter(r => r[0]).map(r => ({ codigo: r[0], descricao: r[2] || '' }));
      return new Response(
        JSON.stringify({ success: true, data: produtos }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Tipo inválido' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('google-sheets-lookup error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno ao consultar dados' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
