import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { pdfText } = await req.json();
    if (!pdfText) throw new Error("pdfText is required");

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableApiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You extract structured data from PDF text of Brazilian "Análise de Pedidos" reports. 
Return ONLY a JSON array of objects. Each object represents one row from the table with these exact keys:
- pedido (string - the order number/ID)
- data_pedido (string - date in ISO format YYYY-MM-DD)
- id_cliente (string - the ID number)
- seq_venda (string)
- cnpj_cpf (string - digits only, no formatting)
- cliente (string - client name)
- grupo_cliente (string)
- inscricao (string)
- valor (number)
- uf (string - 2 letter state code)
- percentual (number)
- forma_pagamento (string)
- condicao_pagamento (string)
- quantidade (number)
- bloqueio_sistema (string - date/time if present, empty string if not)
- bloqueio_credito (string)
- liberado_credito (string)
Return valid JSON only, no markdown.`
          },
          { role: "user", content: `Extract all rows from this PDF text:\n\n${pdfText}` }
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error("AI API returned invalid JSON response: " + rawText.substring(0, 200));
    }
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Clean potential markdown wrapping and extract JSON array
    let cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    // Extract first JSON array if there's extra text
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) cleaned = arrayMatch[0];
    const rows = JSON.parse(cleaned);

    return new Response(JSON.stringify({ rows }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
