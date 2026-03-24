import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, History } from 'lucide-react';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ACTION_LABELS: Record<string, string> = {
  criar_usuario: 'Criar Usuário',
  atualizar_usuario: 'Atualizar Usuário',
  redefinir_senha: 'Redefinir Senha',
  ativar_usuario: 'Ativar Usuário',
  desativar_usuario: 'Desativar Usuário',
  inserir: 'Inserir',
  atualizar: 'Atualizar',
  excluir: 'Excluir',
  importar: 'Importar',
  exportar: 'Exportar',
};

export default function ActivityLogPage() {
  const { role } = useAuth();
  const { data: logs = [], isLoading } = useActivityLog();
  const [search, setSearch] = useState('');
  const [filterTable, setFilterTable] = useState('all');

  const tables = useMemo(() => {
    const set = new Set(logs.map((l: any) => l.tabela).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [logs]);

  const filtered = useMemo(() => {
    let result = logs as any[];
    if (filterTable !== 'all') result = result.filter(l => l.tabela === filterTable);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l => 
        l.acao?.toLowerCase().includes(q) || 
        l.tabela?.toLowerCase().includes(q) ||
        JSON.stringify(l.detalhes || {}).toLowerCase().includes(q)
      );
    }
    return result;
  }, [logs, search, filterTable]);

  if (role !== 'master') {
    return <div className="p-8 text-center text-muted-foreground">Acesso exclusivo Master.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <History className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-barlow font-bold">Histórico de Atividades</h1>
          <p className="text-muted-foreground text-sm">Todas as ações realizadas no sistema</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9 h-9" />
        </div>
        <Select value={filterTable} onValueChange={setFilterTable}>
          <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as tabelas</SelectItem>
            {tables.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum registro</TableCell></TableRow>
              ) : filtered.slice(0, 200).map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs font-mono whitespace-nowrap">
                    {log.created_at ? format(new Date(log.created_at), 'dd/MM/yy HH:mm', { locale: ptBR }) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{ACTION_LABELS[log.acao] || log.acao}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{log.tabela || '-'}</TableCell>
                  <TableCell className="text-xs max-w-[300px] truncate">
                    {log.detalhes ? JSON.stringify(log.detalhes).slice(0, 120) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}