import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/conferencia-flex`;

export default function ConferenciaPedidosFlexPage() {
  const [romaneioData, setRomaneioData] = useState<any[] | null>(null);
  const [fechamentoData, setFechamentoData] = useState<any[] | null>(null);
  const [romaneioName, setRomaneioName] = useState('');
  const [fechamentoName, setFechamentoName] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const romaneioRef = useRef<HTMLInputElement>(null);
  const fechamentoRef = useRef<HTMLInputElement>(null);

  const parseExcel = async (file: File): Promise<any[]> => {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws);
  };

  const handleRomaneio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseExcel(file);
      setRomaneioData(rows);
      setRomaneioName(file.name);
      toast.success(`Romaneio carregado: ${rows.length} registros`);
    } catch { toast.error('Erro ao ler o arquivo do romaneio'); }
    e.target.value = '';
  };

  const handleFechamento = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseExcel(file);
      setFechamentoData(rows);
      setFechamentoName(file.name);
      toast.success(`Fechamento carregado: ${rows.length} registros`);
    } catch { toast.error('Erro ao ler o arquivo de fechamento'); }
    e.target.value = '';
  };

  const handleConferir = async () => {
    if (!romaneioData || !fechamentoData) {
      toast.error('Carregue os dois arquivos antes de conferir.');
      return;
    }
    setLoading(true);
    setResult('');

    try {
      const resp = await fetch(FUNC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          romaneioData: romaneioData.slice(0, 500),
          fechamentoData: fechamentoData.slice(0, 500),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        toast.error(err.error || 'Erro na conferência');
        setLoading(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('Stream não disponível');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setResult(fullText);
            }
          } catch { /* partial */ }
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao conferir');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-barlow font-bold">Conferência de Pedidos Flex</h1>
        <p className="text-muted-foreground text-sm">
          Carregue o romaneio do Signus e o fechamento da transportadora para a IA confrontar os dados
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-dashed border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary" /> Romaneio Signus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <input ref={romaneioRef} type="file" accept=".xls,.xlsx,.csv" className="hidden" onChange={handleRomaneio} />
            <Button variant="outline" className="w-full gap-2" onClick={() => romaneioRef.current?.click()}>
              <Upload className="w-4 h-4" />
              {romaneioName || 'Selecionar arquivo do Romaneio'}
            </Button>
            {romaneioData && (
              <p className="text-xs text-muted-foreground mt-2">{romaneioData.length} registros carregados</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-dashed border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary" /> Fechamento Transportadora
            </CardTitle>
          </CardHeader>
          <CardContent>
            <input ref={fechamentoRef} type="file" accept=".xls,.xlsx,.csv" className="hidden" onChange={handleFechamento} />
            <Button variant="outline" className="w-full gap-2" onClick={() => fechamentoRef.current?.click()}>
              <Upload className="w-4 h-4" />
              {fechamentoName || 'Selecionar arquivo de Fechamento'}
            </Button>
            {fechamentoData && (
              <p className="text-xs text-muted-foreground mt-2">{fechamentoData.length} registros carregados</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Button
        className="w-full gap-2"
        size="lg"
        disabled={!romaneioData || !fechamentoData || loading}
        onClick={handleConferir}
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
        {loading ? 'Analisando com IA...' : 'Conferir com IA'}
      </Button>

      {result && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Resultado da Conferência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
              {result}
            </div>
          </CardContent>
        </Card>
      )}

      {!result && !loading && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Carregue os dois arquivos e clique em "Conferir com IA" para iniciar a análise
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
