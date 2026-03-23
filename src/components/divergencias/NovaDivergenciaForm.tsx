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
import { Plus, Trash2, Upload, Loader2, Search, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ItemForm {
  codigoInterno: string;
  descricaoProduto: string;
  referencia: string;
  quantidade: string;
  unidadeMedida: string;
  buscando: boolean;
}

const emptyItem = (): ItemForm => ({
  codigoInterno: "", descricaoProduto: "", referencia: "", quantidade: "", unidadeMedida: "UN", buscando: false,
});

export default function NovaDivergenciaForm({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [salvando, setSalvando] = useState(false);
  const [loja, setLoja] = useState("");
  const [requisicaoRc, setRequisicaoRc] = useState("");
  const [codigoFornecedor, setCodigoFornecedor] = useState("");
  const [nomeFornecedor, setNomeFornecedor] = useState("");
  const [buscandoFornecedor, setBuscandoFornecedor] = useState(false);
  const [notaFiscal, setNotaFiscal] = useState("");
  const [ocorrencia, setOcorrencia] = useState<string>("");
  const [requisicaoDc, setRequisicaoDc] = useState("");
  const [anotacoes, setAnotacoes] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [itens, setItens] = useState<ItemForm[]>([emptyItem()]);

  const isDefeito = ocorrencia === "Defeito";

  const buscarFornecedor = useCallback(async (codigo: string) => {
    if (!codigo.trim()) return;
    setBuscandoFornecedor(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-lookup", {
        body: { type: "fornecedor", codigo: codigo.trim() },
      });
      if (error) throw error;
      setNomeFornecedor(data.nome || "Não cadastrado");
    } catch {
      setNomeFornecedor("Não cadastrado");
    } finally {
      setBuscandoFornecedor(false);
    }
  }, []);

  const buscarProduto = useCallback(async (index: number, codigo: string) => {
    if (!codigo.trim()) return;
    setItens((prev) => prev.map((it, i) => (i === index ? { ...it, buscando: true } : it)));
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-lookup", {
        body: { type: "produto", codigo: codigo.trim() },
      });
      if (error) throw error;
      setItens((prev) =>
        prev.map((it, i) =>
          i === index ? { ...it, descricaoProduto: data.descricao || "Não cadastrado", buscando: false } : it
        )
      );
    } catch {
      setItens((prev) =>
        prev.map((it, i) =>
          i === index ? { ...it, descricaoProduto: "Não cadastrado", buscando: false } : it
        )
      );
    }
  }, []);

  const updateItem = (index: number, field: keyof ItemForm, value: string) => {
    setItens(prev => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  };
  const addItem = () => setItens(prev => [...prev, emptyItem()]);
  const removeItem = (index: number) => { if (itens.length <= 1) return; setItens(prev => prev.filter((_, i) => i !== index)); };

  const handleSubmit = async () => {
    if (!loja || !ocorrencia || !codigoFornecedor) { toast.error("Preencha os campos obrigatórios: Loja, Código do Fornecedor e Ocorrência."); return; }
    const validItens = itens.filter(it => it.codigoInterno.trim());
    if (validItens.length === 0) { toast.error("Adicione pelo menos um item com código interno."); return; }
    if (validItens.some(it => !it.quantidade || parseFloat(it.quantidade) <= 0)) { toast.error("Todos os itens devem ter quantidade maior que zero."); return; }
    if (isDefeito && arquivos.length === 0) { toast.error("Para ocorrências de Defeito, é obrigatório anexar pelo menos uma imagem."); return; }
    if (isDefeito && !anotacoes.trim()) { toast.error("Para ocorrências de Defeito, é obrigatório preencher as anotações."); return; }

    setSalvando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Você precisa estar logado."); setSalvando(false); return; }

      const { data: div, error: divErr } = await supabase.from("divergencias").insert({
        loja, requisicao_rc: requisicaoRc || null, codigo_fornecedor: codigoFornecedor,
        nome_fornecedor: nomeFornecedor || "Não cadastrado", nota_fiscal: notaFiscal || null,
        ocorrencia: ocorrencia as "Falta" | "Sobra" | "Defeito" | "Devolução",
        requisicao_dc: requisicaoDc || null, anotacoes: anotacoes || null,
        criado_por: user.id, atualizado_por: user.id,
      } as any).select("id").single();
      if (divErr) throw divErr;

      const itensBatch = validItens.map(it => ({
        divergencia_id: (div as any).id, codigo_interno: it.codigoInterno.trim(),
        descricao_produto: it.descricaoProduto || "Não cadastrado",
        referencia: it.referencia || null, quantidade: parseFloat(it.quantidade) || 0, unidade_medida: it.unidadeMedida || "UN",
      }));
      await supabase.from("divergencia_itens").insert(itensBatch as any);
      await supabase.from("divergencia_historico").insert({ divergencia_id: (div as any).id, status: "Novo", observacao: "Cartão criado", usuario_id: user.id } as any);

      for (const file of arquivos) {
        const path = `${(div as any).id}/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage.from("divergencias").upload(path, file);
        if (upErr) continue;
        const { data: urlData } = supabase.storage.from("divergencias").getPublicUrl(path);
        await supabase.from("divergencia_anexos").insert({ divergencia_id: (div as any).id, nome_arquivo: file.name, url: urlData.publicUrl, tipo: "ocorrencia", uploaded_by: user.id } as any);
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
            <div className="space-y-2">
              <Label>Código Fornecedor *</Label>
              <div className="flex gap-2">
                <Input value={codigoFornecedor} onChange={e => setCodigoFornecedor(e.target.value)} placeholder="Código" onBlur={() => buscarFornecedor(codigoFornecedor)} />
                <Button type="button" variant="outline" size="icon" onClick={() => buscarFornecedor(codigoFornecedor)} disabled={buscandoFornecedor}>
                  {buscandoFornecedor ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2"><Label>Nome do Fornecedor</Label><Input value={nomeFornecedor} readOnly className="bg-muted" placeholder="Preenchido automaticamente" /></div>
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
                <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Código Interno *</Label>
                    <div className="flex gap-1">
                      <Input value={item.codigoInterno} onChange={e => updateItem(idx, "codigoInterno", e.target.value)} placeholder="Código" className="text-sm" onBlur={() => buscarProduto(idx, item.codigoInterno)} />
                      <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => buscarProduto(idx, item.codigoInterno)} disabled={item.buscando}>
                        {item.buscando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1 md:col-span-2"><Label className="text-xs">Descrição</Label><Input value={item.descricaoProduto} readOnly className="bg-muted text-sm" placeholder="Automático" /></div>
                  <div className="space-y-1"><Label className="text-xs">Referência</Label><Input value={item.referencia} onChange={e => updateItem(idx, "referencia", e.target.value)} className="text-sm" /></div>
                  <div className="space-y-1"><Label className="text-xs">Quantidade</Label><Input type="number" value={item.quantidade} onChange={e => updateItem(idx, "quantidade", e.target.value)} className="text-sm" min="0" /></div>
                  <div className="space-y-1"><Label className="text-xs">Unidade</Label>
                    <Select value={item.unidadeMedida} onValueChange={v => updateItem(idx, "unidadeMedida", v)}><SelectTrigger className="text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="UN">UN</SelectItem><SelectItem value="CX">CX</SelectItem><SelectItem value="KG">KG</SelectItem><SelectItem value="PC">PC</SelectItem><SelectItem value="MT">MT</SelectItem><SelectItem value="LT">LT</SelectItem></SelectContent></Select>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" className="mt-6 text-destructive hover:text-destructive" onClick={() => removeItem(idx)} disabled={itens.length <= 1}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Anotações e Anexos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Anotações {isDefeito && <span className="text-destructive">*</span>}
              {isDefeito && (
                <span className="text-xs text-destructive flex items-center gap-1 ml-2">
                  <AlertCircle className="h-3 w-3" />
                  Obrigatório para Defeito
                </span>
              )}
            </Label>
            <Textarea value={anotacoes} onChange={e => setAnotacoes(e.target.value)} placeholder="Observações sobre a divergência..." rows={3} className={isDefeito && !anotacoes.trim() ? "border-destructive" : ""} />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Imagens da Ocorrência {isDefeito && <span className="text-destructive">*</span>}
              {isDefeito && (
                <span className="text-xs text-destructive flex items-center gap-1 ml-2">
                  <AlertCircle className="h-3 w-3" />
                  Obrigatório para Defeito
                </span>
              )}
            </Label>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("div-file-upload")?.click()} className={isDefeito && arquivos.length === 0 ? "border-destructive" : ""}>
                <Upload className="h-4 w-4 mr-2" /> Selecionar Arquivos
              </Button>
              <input id="div-file-upload" type="file" accept="image/*,.pdf" multiple className="hidden" onChange={e => { if (e.target.files) { setArquivos(prev => [...prev, ...Array.from(e.target.files!)]); e.target.value = ""; } }} />
              {arquivos.length > 0 && <span className="text-sm text-muted-foreground">{arquivos.length} arquivo{arquivos.length > 1 ? "s" : ""} selecionado{arquivos.length > 1 ? "s" : ""}</span>}
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
