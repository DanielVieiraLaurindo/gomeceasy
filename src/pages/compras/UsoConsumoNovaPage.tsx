import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, X, Plus, Trash2 } from "lucide-react";

interface ItemLine {
  item_name: string;
  quantity: number;
  reference_models: string;
  destinado_a: string;
  files: File[];
}

const emptyItem = (): ItemLine => ({ item_name: "", quantity: 1, reference_models: "", destinado_a: "", files: [] });

export default function UsoConsumoNovaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [items, setItems] = useState<ItemLine[]>([emptyItem()]);
  const [form, setForm] = useState({ store: "", delivery_deadline: "", department: "", observations: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index: number, field: keyof ItemLine, value: string | number) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemFileSelect = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).filter((f) => f.size <= 10 * 1024 * 1024);
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, files: [...item.files, ...files] } : item));
    if (fileInputRefs.current[index]) fileInputRefs.current[index]!.value = "";
  };

  const removeItemFile = (itemIndex: number, fileIndex: number) => {
    setItems((prev) => prev.map((item, i) => i === itemIndex ? { ...item, files: item.files.filter((_, fi) => fi !== fileIndex) } : item));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (items.some((it) => !it.item_name.trim())) {
      toast({ title: "Erro", description: "Preencha o nome de todos os itens.", variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
      const { data: mapping } = await supabase
        .from("manager_mappings")
        .select("gestor_id")
        .eq("solicitante_id", user.id)
        .single();

      const mainItemName = items.length === 1 ? items[0].item_name : `${items[0].item_name} (+${items.length - 1})`;

      const { data: reqData, error } = await supabase.from("purchase_requests").insert({
        requester_id: user.id,
        gestor_id: mapping?.gestor_id || null,
        item_name: mainItemName,
        quantity: items.reduce((sum, it) => sum + it.quantity, 0),
        delivery_deadline: form.delivery_deadline || null,
        store: form.store || null,
        department: form.department || null,
        observations: form.observations || null,
        req_number: "",
      }).select("id").single();

      if (error || !reqData) throw error || new Error("Falha ao criar solicitação");

      for (const it of items) {
        const { data: itemData } = await supabase.from("purchase_request_items").insert({
          request_id: reqData.id,
          item_name: it.item_name,
          quantity: it.quantity,
          reference_models: it.reference_models || null,
          destinado_a: it.destinado_a || null,
        }).select("id").single();

        if (itemData) {
          for (const file of it.files) {
            const filePath = `${user.id}/${reqData.id}/${itemData.id}/${Date.now()}-${file.name}`;
            const { error: uploadError } = await supabase.storage.from("request-attachments").upload(filePath, file);
            if (!uploadError) {
              await supabase.from("request_attachments").insert({
                request_id: reqData.id,
                file_name: file.name,
                file_path: filePath,
                file_size: file.size,
                content_type: file.type,
                uploaded_by: user.id,
              });
            }
          }
        }
      }

      toast({ title: "Solicitação criada!", description: "Sua solicitação foi enviada com sucesso." });
      navigate("/compras/uso-consumo");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-barlow text-xl font-bold">Nova Solicitação de Compra</h1>
        <button onClick={() => navigate("/compras/uso-consumo")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="font-barlow text-base">Informações da Solicitação</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="store">Loja *</Label>
                <Input id="store" name="store" value={form.store} onChange={handleChange} placeholder="Ex: 001" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Departamento</Label>
                <Input id="department" name="department" value={form.department} onChange={handleChange} placeholder="Ex: Manutenção" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery_deadline">Prazo de Entrega</Label>
                <Input id="delivery_deadline" name="delivery_deadline" type="date" value={form.delivery_deadline} onChange={handleChange} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-barlow text-base">Itens da Solicitação</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Adicionar Item</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Item {i + 1}</span>
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-xs">Item Solicitado *</Label>
                    <Input value={item.item_name} onChange={(e) => handleItemChange(i, "item_name", e.target.value)} placeholder="Ex: Parafuso sextavado M10" required />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Quantidade *</Label>
                    <Input type="number" min={1} value={item.quantity} onChange={(e) => handleItemChange(i, "quantity", parseInt(e.target.value) || 1)} required />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Referência</Label>
                    <Input value={item.reference_models} onChange={(e) => handleItemChange(i, "reference_models", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Destinado a</Label>
                    <Input value={item.destinado_a} onChange={(e) => handleItemChange(i, "destinado_a", e.target.value)} placeholder="Ex: Setor de manutenção" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Anexo</Label>
                    <input ref={(el) => { fileInputRefs.current[i] = el; }} type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp" onChange={(e) => handleItemFileSelect(i, e)} />
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRefs.current[i]?.click()} className="w-full border-dashed">
                      <Upload className="h-4 w-4 mr-2" /> Selecionar Arquivos
                    </Button>
                    {item.files.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {item.files.map((f, fi) => (
                          <div key={fi} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted">
                            <FileText className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate flex-1">{f.name}</span>
                            <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeItemFile(i, fi)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="font-barlow text-base">Anotações</CardTitle></CardHeader>
          <CardContent>
            <Textarea id="observations" name="observations" value={form.observations} onChange={handleChange} rows={3} placeholder="Observações sobre a solicitação..." />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/compras/uso-consumo")}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? "Enviando..." : "Criar Solicitação"}</Button>
        </div>
      </form>
    </div>
  );
}
