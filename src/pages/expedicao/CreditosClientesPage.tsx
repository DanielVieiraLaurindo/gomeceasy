import React, { useState, useCallback } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { Search, CreditCard, TrendingUp, TrendingDown, Send, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExtratoItem {
  codigo_loja: string;
  numero_requisicao: string;
  data_requisicao: string;
  codigo_cliente: string;
  nome_cliente: string;
  celular_cliente: string;
  codigo_produto: string;
  codigo_fabricante: string;
  descricao_produto: string;
  marca_produto: string;
  quantidade: number;
  valor_unitario_bruto: number;
  porcentagem_desconto: number;
  valor_desconto: number;
  valor_unitario_liquido: number;
  valor_total_liquido: number;
  Tipo_Movimento: string;
}

export default function CreditosClientesPage() {
  const [codigoCliente, setCodigoCliente] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [saldo, setSaldo] = useState<number | null>(null);
  const [credito, setCredito] = useState<number | null>(null);
  const [extrato, setExtrato] = useState<ExtratoItem[]>([]);
  const [nomeCliente, setNomeCliente] = useState('');
  const [celularCliente, setCelularCliente] = useState('');

  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [telefoneVendedor, setTelefoneVendedor] = useState('');

  const balance = (credito ?? 0) - (saldo ?? 0);

  const fetchClientData = useCallback(async () => {
    const code = codigoCliente.trim().padStart(6, '0');
    if (!/^\d{1,7}$/.test(code)) {
      toast.error('Digite um codigo de cliente valido (ate 6 digitos)');
      return;
    }

    setLoading(true);
    setSearched(true);
    setSaldo(null);
    setCredito(null);
    setExtrato([]);
    setNomeCliente('');
    setCelularCliente('');

    try {
      const [saldoRes, creditoRes, extratoRes] = await Promise.all([
        supabase.functions.invoke('jacsys-requisicoes', { body: { ids: [code], endpoint: 'saldo' } }),
        supabase.functions.invoke('jacsys-requisicoes', { body: { ids: [code], endpoint: 'credito' } }),
        supabase.functions.invoke('jacsys-requisicoes', { body: { ids: [code], endpoint: 'extrato' } }),
      ]);

      if (saldoRes.error) throw saldoRes.error;
      if (creditoRes.error) throw creditoRes.error;
      if (extratoRes.error) throw extratoRes.error;

      const saldoVal = saldoRes.data?.[code] ?? 0;
      const creditoVal = creditoRes.data?.[code] ?? 0;
      const extratoData: ExtratoItem[] = extratoRes.data?.[code] ?? [];

      setSaldo(saldoVal);
      setCredito(creditoVal);
      setExtrato(extratoData);

      if (extratoData.length > 0) {
        setNomeCliente(extratoData[0].nome_cliente || '');
        setCelularCliente(extratoData[0].celular_cliente || '');
      }

      if (saldoVal === 0 && creditoVal === 0 && extratoData.length === 0) {
        toast.info('Nenhum dado encontrado para este cliente');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao buscar dados do cliente');
    } finally {
      setLoading(false);
    }
  }, [codigoCliente]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') fetchClientData();
  };

  const formatCurrency = (v: number) =>
    `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const generateExtractText = () => {
    const code = codigoCliente.trim().padStart(6, '0');
    let text = `*EXTRATO DO CLIENTE*\n`;
    text += `*Cliente:* ${nomeCliente} (${code})\n`;
    text += `*Saldo Devedor:* ${formatCurrency(saldo ?? 0)}\n`;
    text += `*Credito:* ${formatCurrency(credito ?? 0)}\n`;
    text += `*Saldo Final:* ${formatCurrency(balance)}\n\n`;
    text += `--- MOVIMENTACOES ---\n\n`;

    extrato.forEach((item, i) => {
      const data = format(new Date(item.data_requisicao), 'dd/MM/yyyy HH:mm', { locale: ptBR });
      text += `${i + 1}. *${item.Tipo_Movimento}* - Req. ${item.numero_requisicao}\n`;
      text += `   Loja: ${item.codigo_loja} | Data: ${data}\n`;
      text += `   ${item.descricao_produto} (${item.marca_produto})\n`;
      text += `   Qtd: ${item.quantidade} x ${formatCurrency(item.valor_unitario_liquido)} = ${formatCurrency(item.valor_total_liquido)}\n`;
      if (item.porcentagem_desconto > 0) {
        text += `   Desconto: ${item.porcentagem_desconto}% (-${formatCurrency(item.valor_desconto)})\n`;
      }
      text += `\n`;
    });

    text += `_Gomec Autopecas_`;
    return text;
  };

  const handleSendWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const fullNumber = cleaned.length <= 11 ? `55${cleaned}` : cleaned;
    const text = generateExtractText();
    window.open(`https://wa.me/${fullNumber}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleOpenWhatsappDialog = () => {
    if (extrato.length === 0) {
      toast.error('Nenhum extrato para enviar');
      return;
    }
    setWhatsappOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-barlow font-bold">Consulta de Credito - Clientes</h1>
        <p className="text-muted-foreground text-sm">Digite o codigo do cliente para consultar saldo, credito e extrato</p>
      </div>

      {/* Search bar */}
      <div className="card-base p-5">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Digite o codigo do cliente (ex: 300029)"
              className="pl-10 font-mono-data"
              value={codigoCliente}
              onChange={(e) => setCodigoCliente(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <Button onClick={fetchClientData} disabled={loading || !codigoCliente.trim()}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            Consultar
          </Button>
        </div>
      </div>

      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64" />
        </div>
      )}

      {searched && !loading && (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Saldo Devedor"
              value={formatCurrency(saldo ?? 0)}
              icon={TrendingDown}
              variant={(saldo ?? 0) > 0 ? 'danger' : 'default'}
              delay={0}
            />
            <MetricCard
              title="Credito Disponivel"
              value={formatCurrency(credito ?? 0)}
              icon={CreditCard}
              variant={(credito ?? 0) > 0 ? 'success' : 'default'}
              delay={0.08}
            />
            <MetricCard
              title="Saldo Final"
              value={formatCurrency(balance)}
              icon={balance >= 0 ? TrendingUp : TrendingDown}
              variant={balance > 0 ? 'success' : balance < 0 ? 'danger' : 'default'}
              delay={0.16}
            />
          </div>

          {/* Client info */}
          {nomeCliente && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-base p-4 flex items-center justify-between"
            >
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-bold text-lg">{nomeCliente}</p>
                <p className="text-sm text-muted-foreground font-mono-data">
                  Cod: {codigoCliente.trim().padStart(6, '0')} | Cel: {celularCliente || 'N/A'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={cn(
                  'text-base px-4 py-1.5 font-bold',
                  balance > 0 ? 'bg-success/20 text-success' : balance < 0 ? 'bg-destructive/20 text-destructive' : 'bg-muted text-muted-foreground'
                )}>
                  {balance > 0 ? 'CREDITO' : balance < 0 ? 'DEBITO' : 'ZERADO'}: {formatCurrency(Math.abs(balance))}
                </Badge>
                <Button variant="outline" size="sm" onClick={handleOpenWhatsappDialog}>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Extrato
                </Button>
              </div>
            </motion.div>
          )}

          {/* Extract table */}
          <div className="card-base p-5">
            <h3 className="font-barlow font-bold flex items-center gap-2 mb-4">
              <span className="w-1 h-5 bg-primary rounded-full" />
              EXTRATO DE MOVIMENTACOES
            </h3>

            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>DATA</TableHead>
                    <TableHead>REQUISICAO</TableHead>
                    <TableHead>LOJA</TableHead>
                    <TableHead>PRODUTO</TableHead>
                    <TableHead>MARCA</TableHead>
                    <TableHead className="text-center">QTD</TableHead>
                    <TableHead className="text-right">VALOR UNIT.</TableHead>
                    <TableHead className="text-right">DESC.</TableHead>
                    <TableHead className="text-right">TOTAL</TableHead>
                    <TableHead>TIPO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extrato.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                        {searched ? 'Nenhuma movimentacao encontrada' : 'Digite um codigo de cliente para consultar'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    extrato.map((item, i) => {
                      const isDevol = item.Tipo_Movimento?.toUpperCase().includes('DEVOL');
                      return (
                        <motion.tr
                          key={`${item.numero_requisicao}-${item.codigo_produto}-${i}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="border-b hover:bg-table-hover"
                        >
                          <TableCell className="font-mono-data text-xs">
                            {format(new Date(item.data_requisicao), 'dd/MM/yy HH:mm', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-mono-data text-sm font-medium">{item.numero_requisicao}</TableCell>
                          <TableCell className="font-mono-data text-sm">{item.codigo_loja}</TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate" title={item.descricao_produto}>
                            {item.descricao_produto}
                          </TableCell>
                          <TableCell className="text-xs">{item.marca_produto}</TableCell>
                          <TableCell className="text-center font-mono-data text-sm">{item.quantidade}</TableCell>
                          <TableCell className="text-right font-mono-data text-sm">
                            {formatCurrency(item.valor_unitario_bruto)}
                          </TableCell>
                          <TableCell className="text-right font-mono-data text-sm text-muted-foreground">
                            {item.porcentagem_desconto > 0 ? `${item.porcentagem_desconto}%` : '-'}
                          </TableCell>
                          <TableCell className={cn(
                            'text-right font-mono-data text-sm font-bold',
                            isDevol ? 'text-success' : 'text-destructive'
                          )}>
                            {isDevol ? '+' : '-'}{formatCurrency(item.valor_total_liquido)}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(
                              'text-xs',
                              isDevol ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'
                            )}>
                              {item.Tipo_Movimento}
                            </Badge>
                          </TableCell>
                        </motion.tr>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {/* WhatsApp dialog */}
      <Dialog open={whatsappOpen} onOpenChange={setWhatsappOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Extrato via WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p><strong>Cliente:</strong> {nomeCliente}</p>
              <p><strong>Saldo Final:</strong> <span className={balance >= 0 ? 'text-success font-bold' : 'text-destructive font-bold'}>{formatCurrency(balance)}</span></p>
              <p><strong>Movimentacoes:</strong> {extrato.length}</p>
            </div>

            {celularCliente && (
              <Button className="w-full" onClick={() => { handleSendWhatsApp(celularCliente); setWhatsappOpen(false); }}>
                <Send className="w-4 h-4 mr-2" />
                Enviar para Cliente ({celularCliente})
              </Button>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-muted-foreground">Telefone do Vendedor</label>
              <Input
                placeholder="(11) 99999-9999"
                value={telefoneVendedor}
                onChange={(e) => setTelefoneVendedor(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="w-full"
              disabled={!telefoneVendedor.trim()}
              onClick={() => { handleSendWhatsApp(telefoneVendedor); setWhatsappOpen(false); }}
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar para Vendedor
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                handleSendWhatsApp('');
                setWhatsappOpen(false);
              }}
            >
              Abrir WhatsApp Web (selecionar contato)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
