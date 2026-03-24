import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const excludedStatuses = ["Finalizado", "Follow - Up", "Atribuído a garantia"];

  const { data: divergencias, error: fetchError } = await supabase
    .from("divergencias")
    .select("id, created_at, status, ocorrencia")
    .not("status", "in", `(${excludedStatuses.map((s) => `"${s}"`).join(",")})`);

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
  }

  const now = new Date();

  const eligibleIds = (divergencias || [])
    .filter((d) => {
      const created = new Date(d.created_at);
      let businessDays = 0;
      const current = new Date(created);
      while (current < now) {
        current.setDate(current.getDate() + 1);
        const day = current.getDay();
        if (day !== 0 && day !== 6) businessDays++;
        if (businessDays >= 7) break;
      }
      return businessDays >= 7;
    })
    .map((d) => d.id);

  if (eligibleIds.length === 0) {
    return new Response(JSON.stringify({ updated: 0, checked: divergencias?.length || 0 }));
  }

  const { error: updateError } = await supabase
    .from("divergencias")
    .update({ status: "Follow - Up" })
    .in("id", eligibleIds);

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
  }

  const historyRows = eligibleIds.map((id) => ({
    divergencia_id: id,
    status: "Follow - Up",
    observacao: "Status alterado automaticamente: sem interação por 7 dias úteis desde o lançamento",
  }));

  await supabase.from("divergencia_historico").insert(historyRows);

  return new Response(JSON.stringify({ updated: eligibleIds.length, checked: divergencias?.length || 0 }));
});
