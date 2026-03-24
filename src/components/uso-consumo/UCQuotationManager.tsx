import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, BarChart3, Loader2, Trash2, Download } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface PurchaseRequest {
  id: string;
  req_number: string;
  store: string | null;
  department: string | null;
  delivery_deadline: string | null;
  selected_quotation_id: string | null;
  [key: string]: any;
}

interface PurchaseRequestItem {
  id: string;
  item_name: string;
  quantity: number;
  reference_models: string | null;
  destinado_a: string | null;
  quotation_batch: number | null;
}

interface Quotation {
  id: string;
  supplier_name: string;
  file_name: string | null;
  file_path: string | null;
  quotation_batch: number;
  total_value: number | null;
  selected: boolean;
  created_at: string;
}

interface QuotationItem {
  id: string;
  quotation_id: string;
  item_id: string | null;
  item_name: string;
  unit_price: number | null;
  total_price: number | null;
  quantity: number | null;
}

interface Props {
  request: PurchaseRequest;
  items: PurchaseRequestItem[];
  onUpdate: () => void;
}

export default function UCQuotationManager({ request, items, onUpdate }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    items.forEach((it) => { map[it.id] = !it.quotation_batch; });
    return map;
  });
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const pdfDocRef = useRef<jsPDF | null>(null);

  const currentBatch = Math.max(1, ...items.filter(i => i.quotation_batch).map(i => i.quotation_batch!));

  useEffect(() => { fetchQuotations(); }, [request.id]);

  const fetchQuotations = async () => {
    const { data: quots } = await supabase
      .from("quotations")
      .select("*")
      .eq("request_id", request.id)
      .order("created_at");
    if (quots && quots.length > 0) {
      setQuotations(quots as Quotation[]);
      const quotIds = quots.map(q => q.id);
      const { data: qItems } = await supabase
        .from("quotation_items")
        .select("*")
        .in("quotation_id", quotIds);
      setQuotationItems((qItems as QuotationItem[]) || []);
    } else {
      setQuotations([]);
      setQuotationItems([]);
    }
  };

  const buildPdf = (selectedItemsList: PurchaseRequestItem[], batchNum: number) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("SOLICITAÇÃO DE COTAÇÃO", pageWidth / 2, 25, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Nº: ${request.req_number} - Lote ${batchNum}`, pageWidth / 2, 33, { align: "center" });
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, pageWidth / 2, 39, { align: "center" });
    doc.line(14, 44, pageWidth - 14, 44);

    let y = 52;
    doc.setFont("helvetica", "bold"); doc.text("Loja:", 14, y);
    doc.setFont("helvetica", "normal"); doc.text(request.store || "—", 40, y);
    y += 7;
    doc.setFont("helvetica", "bold"); doc.text("Depto:", 14, y);
    doc.setFont("helvetica", "normal"); doc.text(request.department || "—", 40, y);
    if (request.delivery_deadline) {
      y += 7;
      doc.setFont("helvetica", "bold"); doc.text("Prazo:", 14, y);
      doc.setFont("helvetica", "normal"); doc.text(new Date(request.delivery_deadline).toLocaleDateString("pt-BR"), 40, y);
    }
    y += 12;

    const tableData = selectedItemsList.map((item, i) => [
      String(i + 1), item.item_name, item.reference_models || "—", String(item.quantity), item.destinado_a || "—", "", "",
    ]);

    (doc as any).autoTable({
      startY: y,
      head: [["#", "Item", "Ref./Modelo", "Qtd", "Destinado a", "Preço Unit.", "Total"]],
      body: tableData,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [232, 82, 10], textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 10 }, 5: { cellWidth: 25 }, 6: { cellWidth: 25 } },
      theme: "grid",
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(9);
    doc.text("Condições de pagamento: ___________________________________", 14, finalY);
    doc.text("Prazo de entrega: ___________________________________", 14, finalY + 8);
    doc.text("Validade da proposta: ___________________________________", 14, finalY + 16);
    return doc;
  };

  const generateQuotationPDF = async () => {
    const selectedItemsList = items.filter(i => selectedItems[i.id]);
    if (selectedItemsList.length === 0) {
      toast({ title: "Selecione ao menos um item", variant: "destructive" });
      return;
    }
    setLoading(true);
    const batchNum = currentBatch || 1;
    for (const item of selectedItemsList) {
      await supabase.from("purchase_request_items").update({ quotation_batch: batchNum }).eq("id", item.id);
    }

    const doc = buildPdf(selectedItemsList, batchNum);
    pdfDocRef.current = doc;
    const blob = doc.output("blob");
    if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    setPdfBlobUrl(URL.createObjectURL(blob));
    setPdfPreviewOpen(true);

    toast({ title: "Cotação gerada!", description: `Lote ${batchNum} com ${selectedItemsList.length} item(ns).` });
    setLoading(false);
    onUpdate();
  };

  const handleDownloadPdf = () => {
    if (pdfDocRef.current) {
      const batchNum = currentBatch || 1;
      pdfDocRef.current.save(`Cotacao_${request.req_number}_Lote${batchNum}.pdf`);
    }
  };

  const handleSupplierUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !supplierName.trim() || !user) {
      toast({ title: "Informe o nome do fornecedor", variant: "destructive" });
      return;
    }
    setUploading(true);
    const file = e.target.files[0];
    const filePath = `quotations/${request.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("request-attachments").upload(filePath, file);
    if (uploadError) {
      toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    await supabase.from("quotations").insert({
      request_id: request.id,
      supplier_name: supplierName.trim(),
      file_name: file.name,
      file_path: filePath,
      quotation_batch: currentBatch || 1,
      created_by: user.id,
    });
    toast({ title: "Cotação importada!" });
    setSupplierName("");
    e.target.value = "";
    setUploading(false);
    fetchQuotations();
    onUpdate();
  };

  const handleDeleteQuotation = async (quotId: string) => {
    await supabase.from("quotation_items").delete().eq("quotation_id", quotId);
    await supabase.from("quotations").delete().eq("id", quotId);
    toast({ title: "Cotação removida" });
    fetchQuotations();
  };

  const handleSelectQuotation = async (quotId: string) => {
    for (const q of quotations) {
      await supabase.from("quotations").update({ selected: q.id === quotId }).eq("id", q.id);
    }
    await supabase.from("purchase_requests").update({ selected_quotation_id: quotId }).eq("id", request.id);
    toast({ title: "Cotação selecionada!" });
    fetchQuotations();
    onUpdate();
  };

  const quotsByBatch: Record<number, Quotation[]> = {};
  quotations.forEach(q => {
    if (!quotsByBatch[q.quotation_batch]) quotsByBatch[q.quotation_batch] = [];
    quotsByBatch[q.quotation_batch].push(q);
  });

  const unbatchedItems = items.filter(i => !i.quotation_batch);
  const hasUnbatched = unbatchedItems.length > 0;

  return (
    <>
      {hasUnbatched && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="font-barlow text-base">Selecionar Itens para Cotação</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Marque os itens que serão cotados agora.</p>
            {items.map((item) => (
              <div key={item.id} className={`flex items-center gap-3 p-3 rounded-md ${item.quotation_batch ? "bg-muted/30 opacity-60" : "bg-muted/50"}`}>
                <Checkbox
                  checked={selectedItems[item.id] ?? false}
                  disabled={!!item.quotation_batch}
                  onCheckedChange={(checked) => setSelectedItems(prev => ({ ...prev, [item.id]: !!checked }))}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.item_name}</p>
                  <p className="text-xs text-muted-foreground">Qtd: {item.quantity}{item.quotation_batch ? ` · Lote ${item.quotation_batch}` : ""}</p>
                </div>
              </div>
            ))}
            <Button onClick={generateQuotationPDF} disabled={loading} className="w-full">
              <FileText className="h-4 w-4 mr-2" /> {loading ? "Gerando..." : "Gerar PDF de Cotação"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="font-barlow text-base">Importar Cotação de Fornecedor</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Nome do fornecedor" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
          <div className="relative">
            <input type="file" accept=".pdf" onChange={handleSupplierUpload} disabled={uploading || !supplierName.trim()} className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" />
            <Button variant="outline" className="w-full" disabled={uploading || !supplierName.trim()}>
              {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</> : <><Upload className="h-4 w-4 mr-2" /> Enviar PDF do Fornecedor</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {Object.keys(quotsByBatch).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-barlow text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Comparação de Cotações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(quotsByBatch).map(([batch, quots]) => (
              <div key={batch} className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lote {batch}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 text-xs font-semibold text-muted-foreground">Item</th>
                        {quots.map(q => <th key={q.id} className="text-right py-2 px-2 text-xs font-semibold text-muted-foreground">{q.supplier_name}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {items.filter(i => i.quotation_batch === Number(batch)).map(item => {
                        const prices = quots.map(q => {
                          const qi = quotationItems.find(qi => qi.quotation_id === q.id && qi.item_id === item.id);
                          return { quotId: q.id, price: qi?.total_price ?? null };
                        });
                        const validPrices = prices.filter(p => p.price !== null);
                        const minPrice = validPrices.length > 0 ? Math.min(...validPrices.map(p => p.price!)) : null;
                        return (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="py-2 px-2 text-sm">{item.item_name} (x{item.quantity})</td>
                            {prices.map((p, i) => (
                              <td key={i} className={`py-2 px-2 text-right text-sm font-medium ${p.price !== null && p.price === minPrice ? "text-emerald-600 font-bold" : ""}`}>
                                {p.price !== null ? `R$ ${p.price.toFixed(2)}` : "—"}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                      <tr className="border-t-2 font-bold">
                        <td className="py-2 px-2">Total</td>
                        {quots.map(q => <td key={q.id} className="py-2 px-2 text-right">{q.total_value ? `R$ ${Number(q.total_value).toFixed(2)}` : "—"}</td>)}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {quots.map(q => (
                    <div key={q.id} className="flex items-center gap-1">
                      <Button size="sm" variant={q.selected ? "default" : "outline"} onClick={() => handleSelectQuotation(q.id)} className="text-xs">
                        {q.selected ? "✓ Selecionado" : `Selecionar ${q.supplier_name}`}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteQuotation(q.id)} className="text-destructive h-8 w-8 p-0">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>

      {/* PDF Preview Dialog */}
      <Dialog open={pdfPreviewOpen} onOpenChange={(open) => { if (!open) setPdfPreviewOpen(false); }}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-barlow">Pré-visualização da Cotação</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {pdfBlobUrl && (
              <iframe src={pdfBlobUrl} className="w-full h-full rounded-md border" title="PDF Preview" />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPdfPreviewOpen(false)}>Fechar</Button>
            <Button onClick={handleDownloadPdf}>
              <Download className="h-4 w-4 mr-2" /> Baixar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
