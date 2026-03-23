import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator, TrendingUp, Download, History, Trash2, BarChart2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

type Marketplace = 'mercadolivre' | 'shopee';
type TipoAnuncioML = 'premium' | 'classico';
type TipoProduto = 'unidade' | 'kit';

interface CalcInputs {
  quantidade: number;
  custoUnitario: number;
  tipoProduto: TipoProduto;
  kitQuantidade: number;
  kitCustoTotal: number;
  marketplace: Marketplace;
  tipoAnuncioML: TipoAnuncioML;
  precoVenda: number;
  custosExtras: number;
  margemAlvo: number;
  freteMediao: number;
}

interface CalcResult {
  custoTotalItem: number;
  comissaoValor: number;
  comissaoPercent: number;
  freteOuTarifa: number;
  lucroLiquido: number;
  margemLucro: number;
  precoMinimo: number;
  precoSugerido: number;
  marketplace: string;
}

interface HistoricoItem {
  id: string;
  timestamp: Date;
  inputs: CalcInputs;
  resultML?: CalcResult;
  resultShopee?: CalcResult;
}

const DEFAULT_INPUTS: CalcInputs = {
  quantidade: 1,
  custoUnitario: 0,
  tipoProduto: 'unidade',
  kitQuantidade: 2,
  kitCustoTotal: 0,
  marketplace: 'mercadolivre',
  tipoAnuncioML: 'premium',
  precoVenda: 0,
  custosExtras: 0,
  margemAlvo: 20,
  freteMediao: 18,
};

function calcularResultado(inputs: CalcInputs, mp: Marketplace): CalcResult {
  const custoItem = inputs.tipoProduto === 'kit'
    ? inputs.kitCustoTotal / Math.max(inputs.kitQuantidade, 1)
    : inputs.custoUnitario;
  const custoTotal = custoItem * inputs.quantidade + inputs.custosExtras;

  let comissaoPercent = 0;
  let freteOuTarifa = 0;

  if (mp === 'mercadolivre') {
    comissaoPercent = inputs.tipoAnuncioML === 'premium' ? 17 : 12;
    if (inputs.precoVenda >= 79) {
      freteOuTarifa = inputs.freteMediao;
    } else {
      freteOuTarifa = 6;
    }
  } else {
    comissaoPercent = 20;
    freteOuTarifa = 4;
  }

  const comissaoValor = (inputs.precoVenda * comissaoPercent) / 100;
  const lucroLiquido = inputs.precoVenda - custoTotal - comissaoValor - freteOuTarifa;
  const margemLucro = inputs.precoVenda > 0 ? (lucroLiquido / inputs.precoVenda) * 100 : 0;

  // Preço mínimo (break-even)
  const precoMinimo = mp === 'mercadolivre'
    ? (custoTotal + freteOuTarifa) / (1 - comissaoPercent / 100)
    : (custoTotal + 4) / (1 - 0.2);

  // Preço sugerido com margem
  const precoSugerido = mp === 'mercadolivre'
    ? (custoTotal + freteOuTarifa) / (1 - comissaoPercent / 100 - inputs.margemAlvo / 100)
    : (custoTotal + 4) / (1 - 0.2 - inputs.margemAlvo / 100);

  return {
    custoTotalItem: custoTotal,
    comissaoValor,
    comissaoPercent,
    freteOuTarifa,
    lucroLiquido,
    margemLucro,
    precoMinimo: Math.max(precoMinimo, 0),
    precoSugerido: Math.max(precoSugerido, 0),
    marketplace: mp === 'mercadolivre' ? 'Mercado Livre' : 'Shopee',
  };
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function ResultPanel({ result, color }: { result: CalcResult; color: string }) {
  return (
    <Card className={`border-t-4 ${color}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{result.marketplace}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Custo Total</span><span className="font-mono-data">{fmt(result.custoTotalItem)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Comissão ({result.comissaoPercent}%)</span><span className="font-mono-data">{fmt(result.comissaoValor)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Frete/Tarifa</span><span className="font-mono-data">{fmt(result.freteOuTarifa)}</span></div>
        <div className="border-t border-border pt-2" />
        <div className="flex justify-between font-bold">
          <span>Lucro Líquido</span>
          <span className={result.lucroLiquido >= 0 ? 'text-success' : 'text-destructive'}>{fmt(result.lucroLiquido)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Margem</span>
          <span className={result.margemLucro >= 0 ? 'text-success' : 'text-destructive'}>{result.margemLucro.toFixed(1)}%</span>
        </div>
        <div className="border-t border-border pt-2" />
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Preço Mínimo (break-even)</span><span className="font-mono-data">{fmt(result.precoMinimo)}</span></div>
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Preço Sugerido (margem alvo)</span><span className="font-mono-data font-bold text-primary">{fmt(result.precoSugerido)}</span></div>
      </CardContent>
    </Card>
  );
}

export default function PrecificacaoPage() {
  const [inputs, setInputs] = useState<CalcInputs>(DEFAULT_INPUTS);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [showHistorico, setShowHistorico] = useState(false);
  const [showSimulacao, setShowSimulacao] = useState(false);

  const set = useCallback((key: keyof CalcInputs, value: any) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  }, []);

  const resultML = useMemo(() => calcularResultado(inputs, 'mercadolivre'), [inputs]);
  const resultShopee = useMemo(() => calcularResultado(inputs, 'shopee'), [inputs]);

  const simulacao = useMemo(() => {
    if (!showSimulacao) return [];
    const rows: { preco: number; margemML: number; lucroML: number; margemShopee: number; lucroShopee: number }[] = [];
    const min = Math.max(resultML.precoMinimo, resultShopee.precoMinimo, 1);
    const max = min * 1.5;
    const step = Math.max((max - min) / 10, 1);
    for (let p = min; p <= max; p += step) {
      const inp = { ...inputs, precoVenda: p };
      const rML = calcularResultado(inp, 'mercadolivre');
      const rSH = calcularResultado(inp, 'shopee');
      rows.push({ preco: p, margemML: rML.margemLucro, lucroML: rML.lucroLiquido, margemShopee: rSH.margemLucro, lucroShopee: rSH.lucroLiquido });
    }
    return rows;
  }, [showSimulacao, inputs, resultML.precoMinimo, resultShopee.precoMinimo]);

  const salvarHistorico = () => {
    setHistorico(prev => [{ id: crypto.randomUUID(), timestamp: new Date(), inputs: { ...inputs }, resultML, resultShopee }, ...prev].slice(0, 20));
    toast.success('Cálculo salvo no histórico');
  };

  const exportarCSV = () => {
    const header = 'Marketplace,Custo Total,Comissão %,Comissão R$,Frete/Tarifa,Lucro Líquido,Margem %,Preço Mínimo,Preço Sugerido\n';
    const row = (r: CalcResult) => `${r.marketplace},${r.custoTotalItem.toFixed(2)},${r.comissaoPercent},${r.comissaoValor.toFixed(2)},${r.freteOuTarifa.toFixed(2)},${r.lucroLiquido.toFixed(2)},${r.margemLucro.toFixed(1)},${r.precoMinimo.toFixed(2)},${r.precoSugerido.toFixed(2)}`;
    const csv = header + row(resultML) + '\n' + row(resultShopee);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'precificacao.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-barlow font-bold">Calculadora de Preços</h1>
          <p className="text-muted-foreground text-sm">Precificação para marketplaces com cálculos em tempo real</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowHistorico(!showHistorico)}>
            <History className="w-4 h-4 mr-1" /> Histórico ({historico.length})
          </Button>
          <Button variant="outline" size="sm" onClick={exportarCSV}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button size="sm" onClick={salvarHistorico}>Salvar Cálculo</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Calculator className="w-4 h-4" /> Dados do Produto</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={inputs.tipoProduto} onValueChange={v => set('tipoProduto', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unidade">Unidade</SelectItem>
                      <SelectItem value="kit">Kit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Quantidade</Label>
                  <Input type="number" min={1} value={inputs.quantidade} onChange={e => set('quantidade', +e.target.value)} />
                </div>
              </div>

              {inputs.tipoProduto === 'unidade' ? (
                <div>
                  <Label className="text-xs">Custo Unitário (R$)</Label>
                  <Input type="number" step="0.01" value={inputs.custoUnitario || ''} onChange={e => set('custoUnitario', +e.target.value)} placeholder="0,00" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Itens no Kit</Label>
                    <Input type="number" min={1} value={inputs.kitQuantidade} onChange={e => set('kitQuantidade', +e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Custo Total Kit (R$)</Label>
                    <Input type="number" step="0.01" value={inputs.kitCustoTotal || ''} onChange={e => set('kitCustoTotal', +e.target.value)} placeholder="0,00" />
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs">Preço de Venda (R$)</Label>
                <Input type="number" step="0.01" value={inputs.precoVenda || ''} onChange={e => set('precoVenda', +e.target.value)} placeholder="0,00" />
              </div>
              <div>
                <Label className="text-xs">Custos Extras (R$)</Label>
                <Input type="number" step="0.01" value={inputs.custosExtras || ''} onChange={e => set('custosExtras', +e.target.value)} placeholder="Embalagem, etiquetas..." />
              </div>
              <div>
                <Label className="text-xs">Margem Alvo (%)</Label>
                <Input type="number" step="1" value={inputs.margemAlvo} onChange={e => set('margemAlvo', +e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Configurações ML</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Tipo de Anúncio</Label>
                <Select value={inputs.tipoAnuncioML} onValueChange={v => set('tipoAnuncioML', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="premium">🥇 Premium (17%)</SelectItem>
                    <SelectItem value="classico">📦 Clássico (12%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Frete Médio (R$)</Label>
                <Input type="number" step="0.01" value={inputs.freteMediao} onChange={e => set('freteMediao', +e.target.value)} />
                <p className="text-[10px] text-muted-foreground mt-1">Aplicado se preço ≥ R$ 79 (frete grátis)</p>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" variant="outline" onClick={() => setShowSimulacao(!showSimulacao)}>
            <BarChart2 className="w-4 h-4 mr-2" /> {showSimulacao ? 'Ocultar' : 'Mostrar'} Simulação
          </Button>
        </motion.div>

        {/* Results side by side */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ResultPanel result={resultML} color="border-t-warning" />
            <ResultPanel result={resultShopee} color="border-t-info" />
          </div>

          {/* Comparison highlight */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Melhor Margem</p>
                  <Badge variant={resultML.margemLucro >= resultShopee.margemLucro ? 'default' : 'secondary'}>
                    {resultML.margemLucro >= resultShopee.margemLucro ? 'Mercado Livre' : 'Shopee'}
                  </Badge>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Diferença</p>
                  <span className="font-mono-data font-bold">{fmt(Math.abs(resultML.lucroLiquido - resultShopee.lucroLiquido))}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Simulação */}
          {showSimulacao && simulacao.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Simulação de Preços</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Preço</TableHead>
                        <TableHead>Margem ML</TableHead>
                        <TableHead>Lucro ML</TableHead>
                        <TableHead>Margem Shopee</TableHead>
                        <TableHead>Lucro Shopee</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {simulacao.map((row, i) => (
                        <TableRow key={i} className="text-xs">
                          <TableCell className="font-mono-data">{fmt(row.preco)}</TableCell>
                          <TableCell className={row.margemML >= 0 ? 'text-success' : 'text-destructive'}>{row.margemML.toFixed(1)}%</TableCell>
                          <TableCell className="font-mono-data">{fmt(row.lucroML)}</TableCell>
                          <TableCell className={row.margemShopee >= 0 ? 'text-success' : 'text-destructive'}>{row.margemShopee.toFixed(1)}%</TableCell>
                          <TableCell className="font-mono-data">{fmt(row.lucroShopee)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

      {/* Histórico */}
      {showHistorico && historico.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Histórico de Cálculos</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setHistorico([]); toast.info('Histórico limpo'); }}>
                <Trash2 className="w-4 h-4 mr-1" /> Limpar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {historico.map(h => (
                <div key={h.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">{h.timestamp.toLocaleString('pt-BR')}</span>
                    <span className="ml-3">Preço: {fmt(h.inputs.precoVenda)}</span>
                    <span className="ml-2 text-muted-foreground">Custo: {fmt(h.inputs.tipoProduto === 'kit' ? h.inputs.kitCustoTotal : h.inputs.custoUnitario)}</span>
                  </div>
                  <div className="flex gap-3">
                    <Badge variant="outline">ML: {h.resultML?.margemLucro.toFixed(1)}%</Badge>
                    <Badge variant="outline">Shopee: {h.resultShopee?.margemLucro.toFixed(1)}%</Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setInputs(h.inputs)}>Restaurar</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
