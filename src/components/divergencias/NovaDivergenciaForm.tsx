import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Upload, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ItemForm {
  codigoInterno: string;
  descricaoProduto: string;
  referencia: string;
  quantidade: string;
  unidadeMedida: string;
}

const emptyItem = (): ItemForm => ({
  codigoInterno: "", descricaoProduto: "", referencia: "", quantidade: "", unidadeMedida: "UN",
});

export default function NovaDivergenciaForm({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [salvando, setSalvando] = useState(false);
  const [loja, setLoja] = useState("");
  const [requisicaoRc, setRequisicaoRc] = useState("");
  const [codigoFornecedor, setCodigoFornecedor] = useState("");
  const [nomeFornecedor, setNomeFornecedor] = useState("");
  const [notaFiscal, setNotaFiscal] = useState("");
  const [ocorrencia, setOcorrencia] = useState<string>("");
  const [requisicaoDc, setRequisicaoDc] = useState("");
  const [anotacoes, setAnotacoes] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [itens, setItens] = useState<ItemForm[]>([emptyItem()]);

  const isDefeito = ocorrencia === "Defeito";

  const updateItem = (index: number, field: keyof ItemForm, value: string) => {
    setItens(prev => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  };
  const addItem = () => setItens(prev => [...prev, emptyItem()]);
  const removeItem = (index: number) => { if (itens.length <= 1) return; setItens(prev => prev.filter((_, i) => i !== index)); };

  const handleSubmit = async () => {
    if (!loja || !ocorrencia || !codigoFornecedor) { toast.error("Preencha os campos obrigatórios."); return; }
    const validItens = itens.filter(it => it.codigoInterno.trim());
    if (validItens.length === 0) { toast.error("Adicione pelo menos um item."); return; }
    if (validItens.some(it => !it.quantidade || parseFloat(it.quantidade) <= 0)) { toast.error("Todos os itens devem ter quantidade > 0."); return; }
    if (isDefeito && arquivos.length === 0) { toast.error("Para Defeito, anexe pelo menos uma imagem."); return; }
    if (isDefeito && !anotacoes.trim()) { toast.error("Para Defeito, preencha as anotações."); return; }

    setSalvando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Você precisa estar logado."); setSalvando(false); return; }

      const { data: div, error: divErr } = await supabase.from("divergencias" as any).insert({
        loja, requisicao_rc: requisicaoRc || null, codigo_fornecedor: codigoFornecedor,
        nome_fornecedor: nomeFornecedor || "Não cadastrado", nota_fiscal: notaFiscal || null,
        ocorrencia, requisicao_dc: requisicaoDc || null, anotacoes: anotacoes || null,
        criado_por: user.id, atualizado_por: user.id,
      }).select("id").single();
      if (divErr) throw divErr;

      const itensBatch = validItens.map(it => ({
        divergencia_id: (div as any).id, codigo_interno: it.codigoInterno.trim(),
        descricao_produto: it.descricaoProduto || "Não cadastrado",
        referencia: it.referencia || null, quantidade: parseFloat(it.quantidade) || 0, unidade_medida: it.unidadeMedida || "UN",
      }));
      await supabase.from("divergencia_itens" as any).insert(itensBatch);
      await supabase.from("divergencia_historico" as any).insert({ divergencia_id: (div as any).id, status: "Novo", observacao: "Cartão criado", usuario_id: user.id });

      for (const file of arquivos) {
        const path = `${(div as any).id}/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage.from("divergencias").upload(path, file);
        if (upErr) continue;
        const { data: urlData } = supabase.storage.from("divergencias").getPublicUrl(path);
        await supabase.from("divergencia_anexos" as any).insert({ divergencia_id: (div as any).id, nome_arquivo: file.name, url: urlData.publicUrl, tipo: "ocorrencia", uploaded_by: user.id });
      }

      toast.success("Divergência criada com sucesso!");
      onClose();
      navigate(`/compras/divergencias/${(div as any).id}`);
    } catch (err: any) { toast.error(err.message || "Erro ao criar divergência."); }
    finally { setSalvando(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Novo Cartão de Divergência</h2>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Informações do Cartão</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Loja *</Label>
              <Select value={loja} onValueChange={setLoja}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="001">Loja 001</SelectItem><SelectItem value="002">Loja 002</SelectItem><SelectItem value="003">Loja 003</SelectItem><SelectItem value="004">Loja 004</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Requisição (RC)</Label><Input value={requisicaoRc} onChange={e => setRequisicaoRc(e.target.value)} placeholder="Ex: RC-12345" /></div>
            <div className="space-y-2"><Label>Nota Fiscal</Label><Input value={notaFiscal} onChange={e => setNotaFiscal(e.target.value)} placeholder="Ex: NF-55231" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Código Fornecedor *</Label><Input value={codigoFornecedor} onChange={e => setCodigoFornecedor(e.target.value)} placeholder="Código" /></div>
            <div className="space-y-2 md:col-span-2"><Label>Nome do Fornecedor</Label><Input value={nomeFornecedor} onChange={e => setNomeFornecedor(e.target.value)} placeholder="Nome do fornecedor" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Ocorrência *</Label>
              <Select value={ocorrencia} onValueChange={setOcorrencia}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="Falta">Falta</SelectItem><SelectItem value="Sobra">Sobra</SelectItem><SelectItem value="Defeito">Defeito</SelectItem><SelectItem value="Devolução">Devolução</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Requisição (DC)</Label><Input value={requisicaoDc} onChange={e => setRequisicaoDc(e.target.value)} placeholder="Ex: DC-98765" /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Itens da Divergência</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Adicionar Item</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {itens.map((item, idx) => (
            <div key={idx}>
              {idx > 0 && <Separator className="mb-4" />}
              <div className="flex items-start gap-2">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Código Interno *</Label><Input value={item.codigoInterno} onChange={e => updateItem(idx, "codigoInterno", e.target.value)} className="text-sm" /></div>
                  <div className="space-y-1 md:col-span-2"><Label className="text-xs">Descrição</Label><Input value={item.descricaoProduto} onChange={e => updateItem(idx, "descricaoProduto", e.target.value)} className="text-sm" /></div>
                  <div className="space-y-1"><Label className="text-xs">Quantidade</Label><Input type="number" value={item.quantidade} onChange={e => updateItem(idx, "quantidade", e.target.value)} className="text-sm" min="0" /></div>
                  <div className="space-y-1"><Label className="text-xs">Unidade</Label>
                    <Select value={item.unidadeMedida} onValueChange={v => updateItem(idx, "unidadeMedida", v)}><SelectTrigger className="text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="UN">UN</SelectItem><SelectItem value="CX">CX</SelectItem><SelectItem value="KG">KG</SelectItem><SelectItem value="PC">PC</SelectItem></SelectContent></Select>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" className="mt-6 text-destructive" onClick={() => removeItem(idx)} disabled={itens.length <= 1}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Anotações e Anexos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1">Anotações {isDefeito && <span className="text-destructive">*</span>}</Label>
            <Textarea value={anotacoes} onChange={e => setAnotacoes(e.target.value)} placeholder="Observações..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">Imagens {isDefeito && <span className="text-destructive">*</span>}</Label>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("div-file-upload")?.click()}><Upload className="h-4 w-4 mr-2" /> Selecionar</Button>
              <input id="div-file-upload" type="file" accept="image/*,.pdf" multiple className="hidden" onChange={e => { if (e.target.files) { setArquivos(prev => [...prev, ...Array.from(e.target.files!)]); e.target.value = ""; } }} />
              {arquivos.length > 0 && <span className="text-sm text-muted-foreground">{arquivos.length} arquivo(s)</span>}
            </div>
            {arquivos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {arquivos.map((f, i) => (
                  <span key={i} className="text-xs bg-muted px-2 py-1 rounded-md flex items-center gap-1">
                    {f.name}
                    <button type="button" onClick={() => setArquivos(prev => prev.filter((_, idx) => idx !== i))} className="ml-1 text-destructive">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Criar Divergência</Button>
      </div>
    </div>
  );
}
