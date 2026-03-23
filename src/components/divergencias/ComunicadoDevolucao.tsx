import type { DivergenciaDB, DivergenciaItem } from "@/types/divergencia";
import logoGomec from "@/assets/logo-gomec.jpg";

interface Props {
  divergencia: DivergenciaDB;
  itens: DivergenciaItem[];
}

export function gerarComunicadoDevolucao({ divergencia: d, itens }: Props) {
  const itensRows = itens
    .map(
      (it) =>
        `<tr>
          <td style="border:1px solid #ccc;padding:6px 10px;font-size:13px;">${d.nota_fiscal || "—"}</td>
          <td style="border:1px solid #ccc;padding:6px 10px;font-size:13px;">${it.codigo_interno}</td>
          <td style="border:1px solid #ccc;padding:6px 10px;font-size:13px;">${it.referencia || "—"}</td>
          <td style="border:1px solid #ccc;padding:6px 10px;font-size:13px;">${it.quantidade} ${it.unidade_medida}</td>
        </tr>`
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Comunicado de Devolução</title>
  <style>
    @media print { body { margin: 0; } }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px 50px; color: #222; line-height: 1.7; }
    .header { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; }
    .header img { height: 60px; }
    h1 { font-size: 20px; text-align: center; margin: 20px 0 5px; }
    .loja { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 25px; color: #333; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0 25px; }
    th { background: #f0f0f0; border: 1px solid #ccc; padding: 8px 10px; font-size: 13px; text-align: left; }
    p { font-size: 14px; margin: 8px 0; }
    .section-title { font-weight: bold; font-size: 15px; margin-top: 25px; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    ul { padding-left: 20px; }
    li { font-size: 14px; margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="${logoGomec}" alt="Logo" />
  </div>
  <h1>Comunicado de Devolução: Divergência de Itens</h1>
  <div class="loja">LOJA ${d.loja}</div>

  <p>Prezados,</p>
  <p>Gostaríamos de informar que identificamos uma divergência entre o item físico entregue e a nossa necessidade de compra.</p>

  <p class="section-title">Itens para Devolução</p>
  <table>
    <thead><tr><th>NF</th><th>Código</th><th>Referência</th><th>Quantidade</th></tr></thead>
    <tbody>${itensRows}</tbody>
  </table>

  <p class="section-title">Procedimento para Regularização</p>
  <ul>
    <li><strong>Emissão de Nota Fiscal de Devolução</strong></li>
    <li><strong>Logística de Retorno:</strong> Solicitamos orientações sobre a coleta.</li>
    <li><strong>Regularização:</strong> Solicitamos crédito financeiro ou substituição.</li>
  </ul>

  <p>Solicitamos que confirmem o recebimento desta notificação.</p>

  <script>window.print();</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); }
}
