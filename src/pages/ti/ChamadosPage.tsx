import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Search, Eye, X, Send, ArrowLeft,
  AlertTriangle, FileText, AlertCircle, Loader2, Paperclip
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ================================================================
// CONSTANTS
// ================================================================
const LOJAS = ['001', '002', '003', '004', '005'];
const DEPTS = ['TI', 'RH', 'Financeiro', 'Comercial', 'Jurídico', 'Operações', 'Backoffice', 'Compras', 'Expedição', 'Garantia', 'Logística', 'Pós-Vendas', 'Pré-Vendas', 'Criação', 'Diretoria'];
const TIPOS = ['Acesso ao Sistema', 'Hardware', 'Software', 'Rede/Internet', 'Email', 'Impressora', 'Telefonia', 'Outros'];

const STATUS_STYLE: Record<string, string> = {
  'aberto':        'bg-sky-100 text-sky-700 border border-sky-200',
  'em_andamento':  'bg-amber-100 text-amber-700 border border-amber-200',
  'resolvido':     'bg-green-100 text-green-700 border border-green-200',
  'fechado':       'bg-muted text-muted-foreground border border-border',
};

const STATUS_LABEL: Record<string, string> = {
  'aberto': 'Novo',
  'em_andamento': 'Em Atendimento',
  'resolvido': 'Concluído',
  'fechado': 'Fechado',
};

const TIPO_STYLE: Record<string, string> = {
  'Hardware':          'bg-red-100 text-red-700',
  'Software':          'bg-violet-100 text-violet-700',
  'Acesso ao Sistema': 'bg-blue-100 text-blue-700',
  'Rede/Internet':     'bg-orange-100 text-orange-700',
  'Email':             'bg-indigo-100 text-indigo-700',
  'Impressora':        'bg-zinc-100 text-zinc-700',
  'Telefonia':         'bg-teal-100 text-teal-700',
  'Outros':            'bg-muted text-muted-foreground',
};

const PRI_STYLE: Record<string, string> = {
  'baixo': 'bg-emerald-100 text-emerald-700',
  'medio': 'bg-amber-100 text-amber-700',
  'alto':  'bg-red-100 text-red-700',
};

const PRI_LABEL: Record<string, string> = {
  'baixo': 'Baixa',
  'medio': 'Média',
  'alto': 'Alta',
};

type Chamado = {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: string | null;
  subcategoria: string | null;
  prioridade: string | null;
  status: string | null;
  setor_solicitante: string | null;
  solicitante_id: string | null;
  atribuido_a: string | null;
  equipamento: string | null;
  sla_horas: number | null;
  resolved_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  solicitante_nome?: string;
  operador_nome?: string;
};

type Comentario = {
  id: string;
  chamado_id: string;
  mensagem: string;
  usuario_id: string | null;
  created_at: string | null;
  usuario_nome?: string;
};

const fmt = (d: string | null) => d ? format(new Date(d), 'dd/MM/yy') : '—';
const fmtFull = (d: string | null) => d ? format(new Date(d), 'dd/MM/yyyy HH:mm') : '—';
const daysSince = (d: string | null) => d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 0;
const isOverdue = (t: Chamado) => t.status !== 'resolvido' && t.status !== 'fechado' && daysSince(t.updated_at) >= 2;

const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

// ================================================================
// CHAMADOS LIST
// ================================================================
function ChamadosList({
  tickets, onView, onNew, loading
}: {
  tickets: Chamado[];
  onView: (id: string) => void;
  onNew: () => void;
  loading: boolean;
}) {
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('Todos');
  const [fTipo, setFTipo] = useState('Todos');
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => tickets.filter(t => {
    const matchQ = !q ||
      t.id.toLowerCase().includes(q.toLowerCase()) ||
      (t.solicitante_nome || '').toLowerCase().includes(q.toLowerCase()) ||
      (t.titulo || '').toLowerCase().includes(q.toLowerCase()) ||
      (t.categoria || '').toLowerCase().includes(q.toLowerCase()) ||
      (t.descricao || '').toLowerCase().includes(q.toLowerCase());
    const matchStatus = fStatus === 'Todos' || t.status === fStatus;
    const matchTipo = fTipo === 'Todos' || t.categoria === fTipo;
    return matchQ && matchStatus && matchTipo;
  }), [tickets, q, fStatus, fTipo]);

  const toggleAll = () =>
    setSelected(selected.length === filtered.length ? [] : filtered.map(t => t.id));
  const toggleOne = (id: string) =>
    setSelected(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chamados</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} {filtered.length === 1 ? 'ocorrência encontrada' : 'ocorrências encontradas'}
          </p>
        </div>
        <button onClick={onNew}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-sm">
          <Plus size={16} /> Novo
        </button>
      </div>

      <div className="px-6 pb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar solicitante, ID, tipo ou descrição..."
            className="w-full border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 placeholder-muted-foreground" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={fStatus} onChange={e => setFStatus(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary bg-background">
            <option value="Todos">Todos Status</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={fTipo} onChange={e => setFTipo(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary bg-background">
            <option value="Todos">Todos Tipos</option>
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto border-t border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-10 px-4 py-3 text-center">
                <input type="checkbox"
                  checked={filtered.length > 0 && selected.length === filtered.length}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-border accent-primary cursor-pointer" />
              </th>
              {['Data', 'Setor', 'Solicitante', 'Ocorrência', 'Status', 'Atualização'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16 text-muted-foreground">
                  <FileText size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Nenhum chamado encontrado.</p>
                </td>
              </tr>
            ) : filtered.map((t, i) => {
              const pri = t.prioridade || 'medio';
              const status = t.status || 'aberto';
              return (
                <motion.tr key={t.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className={`border-b border-border/50 transition-colors ${
                    selected.includes(t.id) ? 'bg-primary/5' : 'hover:bg-muted/40'
                  }`}>
                  <td className="px-4 py-4 text-center">
                    <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggleOne(t.id)}
                      className="w-4 h-4 rounded border-border accent-primary cursor-pointer" />
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-foreground font-medium">{fmt(t.created_at)}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{t.id.slice(0, 8)}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold text-foreground">{t.setor_solicitante || '—'}</p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
                        {initials(t.solicitante_nome || 'US')}
                      </div>
                      <p className="text-sm font-medium text-foreground">{t.solicitante_nome || 'Usuário'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TIPO_STYLE[t.categoria || ''] || 'bg-muted text-muted-foreground'}`}>
                      {t.categoria || '—'}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pri === 'alto' ? '🔴' : pri === 'medio' ? '🟡' : '🟢'} {PRI_LABEL[pri] || 'Média'}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLE[status] || STATUS_STYLE.aberto}`}>
                      {STATUS_LABEL[status] || status}
                    </span>
                    {t.operador_nome && <p className="text-xs text-muted-foreground mt-1">{t.operador_nome}</p>}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      {isOverdue(t) && <AlertTriangle size={14} className="text-warning flex-shrink-0" />}
                      <span className={`text-sm ${isOverdue(t) ? 'text-warning font-semibold' : 'text-foreground'}`}>
                        {fmt(t.updated_at)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <button onClick={() => onView(t.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all ml-auto">
                      <Eye size={16} />
                    </button>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ================================================================
// NEW TICKET MODAL
// ================================================================
function NewTicketModal({
  onClose, onSubmit, submitting, userName, userSetor
}: {
  onClose: () => void;
  onSubmit: (f: any) => void;
  submitting: boolean;
  userName: string;
  userSetor: string;
}) {
  const [f, setF] = useState({
    solicitante: userName,
    setor: userSetor,
    dept: userSetor,
    tipo: '',
    desc: '',
    pri: 'medio',
    equipamento: '',
    titulo: '',
  });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [anexos, setAnexos] = useState<File[]>([]);
  const anexoRef = useRef<HTMLInputElement>(null);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!f.titulo.trim()) e.titulo = 'Informe o título';
    if (!f.dept) e.dept = 'Selecione o departamento';
    if (!f.tipo) e.tipo = 'Selecione o tipo';
    if (!f.desc.trim()) e.desc = 'Descreva o problema';
    return e;
  };

  const go = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrs(e); return; }
    onSubmit({ ...f, anexos });
  };

  const Field = ({ label, err, children }: { label: string; err?: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>
      {children}
      {err && <p className="text-destructive text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} /> {err}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
        className="bg-background rounded-2xl w-full max-w-lg shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">Abrir Novo Chamado</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Preencha para registrar a ocorrência</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <Field label="Título *" err={errs.titulo}>
            <input value={f.titulo} onChange={e => setF({ ...f, titulo: e.target.value })}
              placeholder="Descreva o problema brevemente"
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-foreground bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 placeholder-muted-foreground" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Departamento *" err={errs.dept}>
              <select value={f.dept} onChange={e => setF({ ...f, dept: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary bg-background">
                <option value="">Selecione...</option>
                {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Tipo de Problema *" err={errs.tipo}>
              <select value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary bg-background">
                <option value="">Selecione...</option>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Prioridade</label>
            <div className="flex gap-2">
              {(['baixo', 'medio', 'alto'] as const).map(p => (
                <button key={p} type="button" onClick={() => setF({ ...f, pri: p })}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    f.pri === p ? PRI_STYLE[p] + ' border-transparent' : 'border-border text-muted-foreground hover:border-border hover:bg-muted'
                  }`}>{PRI_LABEL[p]}</button>
              ))}
            </div>
          </div>
          <Field label="Descrição *" err={errs.desc}>
            <textarea value={f.desc} onChange={e => setF({ ...f, desc: e.target.value })}
              placeholder="Descreva detalhadamente o problema ou solicitação..." rows={4}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-foreground bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none placeholder-muted-foreground" />
          </Field>
          <Field label="Equipamento relacionado">
            <input value={f.equipamento} onChange={e => setF({ ...f, equipamento: e.target.value })}
              placeholder="Ex: Notebook Dell #15, PC Recepção..."
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-foreground bg-background focus:outline-none focus:border-primary placeholder-muted-foreground" />
          </Field>
          <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Anexos</label>
            <input ref={anexoRef} type="file" multiple className="hidden" onChange={e => {
              if (e.target.files) setAnexos(prev => [...prev, ...Array.from(e.target.files!)]);
              if (anexoRef.current) anexoRef.current.value = '';
            }} />
            <button type="button" onClick={() => anexoRef.current?.click()}
              className="flex items-center gap-1 text-xs border border-border rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-muted transition-colors">
              <Paperclip size={14} /> Adicionar anexo
            </button>
            {anexos.length > 0 && (
              <div className="space-y-1">
                {anexos.map((file, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-background p-2 rounded">
                    <span className="truncate">{file.name}</span>
                    <button onClick={() => setAnexos(prev => prev.filter((_, idx) => idx !== i))} className="text-destructive ml-2">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3 px-6 py-5 border-t border-border">
          <button onClick={onClose}
            className="flex-1 border border-border hover:bg-muted text-foreground py-2.5 rounded-lg font-semibold text-sm transition-colors">
            Cancelar
          </button>
          <button onClick={go} disabled={submitting}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-sm disabled:opacity-50">
            {submitting ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Abrir Chamado'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ================================================================
// TICKET DETAIL
// ================================================================
function TicketDetail({
  ticket, comentarios, onBack, onStatusChange, onSendMsg, isTI, loadingComments
}: {
  ticket: Chamado;
  comentarios: Comentario[];
  onBack: () => void;
  onStatusChange: (status: string, notes?: string) => void;
  onSendMsg: (msg: string) => void;
  isTI: boolean;
  loadingComments: boolean;
}) {
  const [msg, setMsg] = useState('');
  const [notes, setNotes] = useState('');
  const [showClose, setShowClose] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  const status = ticket.status || 'aberto';
  const pri = ticket.prioridade || 'medio';

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comentarios.length]);

  const sendMsg = () => {
    if (!msg.trim()) return;
    onSendMsg(msg.trim());
    setMsg('');
  };

  return (
    <div className="flex-1 bg-muted/20 overflow-y-auto">
      <div className="sticky top-0 bg-background border-b border-border px-6 py-4 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="text-sm font-bold text-primary font-mono">{ticket.id.slice(0, 8)}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLE[status]}`}>
                {STATUS_LABEL[status]}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${TIPO_STYLE[ticket.categoria || ''] || 'bg-muted text-muted-foreground'}`}>
                {ticket.categoria || '—'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground truncate">{ticket.titulo}</p>
          </div>
          {isTI && (
            <div className="flex gap-2 flex-shrink-0">
              {status === 'aberto' && (
                <button onClick={() => onStatusChange('em_andamento')}
                  className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-1.5 rounded-lg font-semibold transition-colors">
                  Assumir
                </button>
              )}
              {status === 'em_andamento' && (
                <button onClick={() => setShowClose(true)}
                  className="text-xs bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg font-semibold transition-colors">
                  ✓ Fechar
                </button>
              )}
              {status === 'resolvido' && (
                <button onClick={() => onStatusChange('em_andamento')}
                  className="text-xs border border-border hover:bg-muted text-muted-foreground px-4 py-1.5 rounded-lg font-semibold transition-colors">
                  ↩ Reabrir
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-5">
        <div className="bg-background rounded-xl border border-border shadow-sm p-5">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-4">Informações do Chamado</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6">
            {[
              ['Setor', ticket.setor_solicitante || '—'],
              ['Solicitante', ticket.solicitante_nome || '—'],
              ['Operador', ticket.operador_nome || '— Não atribuído'],
              ['Prioridade', PRI_LABEL[pri] || 'Média'],
              ['Aberto em', fmtFull(ticket.created_at)],
              ['Última Att.', fmtFull(ticket.updated_at)],
              ['SLA', `${ticket.sla_horas || 24}h`],
              ['Equipamento', ticket.equipamento || '—'],
            ].map(([l, v]) => (
              <div key={l as string}>
                <p className="text-xs text-muted-foreground mb-0.5">{l}</p>
                <p className="text-sm font-semibold text-foreground">{v}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-border/50 mt-5 pt-4">
            <p className="text-xs text-muted-foreground mb-1.5">Descrição</p>
            <p className="text-sm text-foreground leading-relaxed">{ticket.descricao || '—'}</p>
          </div>
        </div>

        <AnimatePresence>
          {showClose && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-background border border-warning/30 rounded-xl shadow-sm p-5">
              <p className="text-foreground font-bold text-sm mb-0.5">Fechar Chamado</p>
              <p className="text-xs text-muted-foreground mb-3">Registre a solução antes de fechar.</p>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Descreva a solução, root cause e procedimentos realizados..." rows={3}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-foreground bg-background focus:outline-none focus:border-primary resize-none placeholder-muted-foreground mb-3" />
              <div className="flex gap-3">
                <button onClick={() => setShowClose(false)}
                  className="flex-1 border border-border hover:bg-muted text-foreground py-2 rounded-lg text-sm font-semibold">
                  Cancelar
                </button>
                <button onClick={() => { onStatusChange('resolvido', notes); setShowClose(false); }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-semibold">
                  Confirmar Fechamento
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-background rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">Interações</span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {comentarios.length} mensagem{comentarios.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
            {loadingComments ? (
              <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
            ) : comentarios.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Nenhuma interação registrada.</p>
            ) : comentarios.map(m => (
              <div key={m.id} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                  {initials(m.usuario_nome || 'US')}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-foreground">{m.usuario_nome || 'Usuário'}</span>
                    <span className="text-xs text-muted-foreground">{fmtFull(m.created_at)}</span>
                  </div>
                  <p className="text-sm text-foreground bg-muted rounded-lg px-3 py-2 inline-block">{m.mensagem}</p>
                </div>
              </div>
            ))}
            <div ref={chatEnd} />
          </div>
          {status !== 'resolvido' && status !== 'fechado' ? (
            <div className="p-4 border-t border-border flex gap-2">
              <input value={msg} onChange={e => setMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMsg()}
                placeholder="Adicionar interação... (Enter para enviar)"
                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:border-primary placeholder-muted-foreground" />
              <button onClick={sendMsg} disabled={!msg.trim()}
                className="bg-primary hover:bg-primary/90 disabled:opacity-30 text-primary-foreground p-2 rounded-lg transition-colors">
                <Send size={15} />
              </button>
            </div>
          ) : (
            <div className="px-4 py-3 bg-muted text-center text-xs text-muted-foreground">
              Chamado encerrado · Interações desabilitadas
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// MAIN EXPORT
// ================================================================
export default function ChamadosPage() {
  const { user, profile } = useAuth();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selId, setSelId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isTI = profile?.setor?.toLowerCase() === 'ti' || profile?.setor?.toLowerCase() === 't.i.' || profile?.role === 'admin';
  const selTicket = chamados.find(t => t.id === selId);

  const fetchChamados = useCallback(async () => {
    setLoading(true);
    const { data: tickets } = await supabase
      .from('chamados_ti')
      .select('*')
      .order('created_at', { ascending: false });

    if (tickets) {
      const userIds = [...new Set(tickets.map(t => t.solicitante_id).filter(Boolean)),
                       ...new Set(tickets.map(t => t.atribuido_a).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', userIds as string[]);
        if (profiles) {
          profiles.forEach(p => { profileMap[p.id] = p.nome; });
        }
      }
      setChamados(tickets.map(t => ({
        ...t,
        solicitante_nome: t.solicitante_id ? profileMap[t.solicitante_id] || 'Usuário' : 'Usuário',
        operador_nome: t.atribuido_a ? profileMap[t.atribuido_a] || undefined : undefined,
      })));
    }
    setLoading(false);
  }, []);

  const fetchComentarios = useCallback(async (chamadoId: string) => {
    setLoadingComments(true);
    const { data } = await supabase
      .from('chamado_comentarios')
      .select('*')
      .eq('chamado_id', chamadoId)
      .order('created_at', { ascending: true });

    if (data) {
      const userIds = [...new Set(data.map(c => c.usuario_id).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, nome').in('id', userIds as string[]);
        if (profiles) profiles.forEach(p => { profileMap[p.id] = p.nome; });
      }
      setComentarios(data.map(c => ({
        ...c,
        usuario_nome: c.usuario_id ? profileMap[c.usuario_id] || 'Usuário' : 'Usuário',
      })));
    }
    setLoadingComments(false);
  }, []);

  useEffect(() => { fetchChamados(); }, [fetchChamados]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('chamados-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados_ti' }, () => fetchChamados())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamado_comentarios' }, (payload: any) => {
        if (selId && payload.new?.chamado_id === selId) fetchComentarios(selId);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchChamados, fetchComentarios, selId]);

  const handleCreate = async (f: any) => {
    if (!user) return;
    setSubmitting(true);
    const slaMap: Record<string, number> = { baixo: 48, medio: 24, alto: 8 };

    const { data: chamado, error } = await supabase.from('chamados_ti').insert({
      titulo: f.titulo,
      descricao: f.desc,
      prioridade: f.pri,
      setor_solicitante: f.dept,
      solicitante_id: user.id,
      status: 'aberto',
      categoria: f.tipo,
      equipamento: f.equipamento || null,
      sla_horas: slaMap[f.pri] || 24,
    }).select().single();

    if (error) { toast.error('Erro ao criar chamado'); setSubmitting(false); return; }

    if (chamado && f.anexos?.length > 0) {
      for (const file of f.anexos) {
        const filePath = `chamados/${chamado.id}/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage.from('case-photos').upload(filePath, file);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('case-photos').getPublicUrl(filePath);
          await supabase.from('chamado_anexos').insert({
            chamado_id: chamado.id,
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_size: file.size,
            uploaded_by: user.id,
          });
        }
      }
    }

    await supabase.from('notificacoes').insert({
      mensagem: `Novo chamado de T.I.: ${f.titulo} (${f.tipo})`,
      tipo: 'chamado_ti',
      referencia_id: chamado?.id,
      referencia_tabela: 'chamados_ti',
      setor_destino: 'ti',
    } as any);

    toast.success(`Chamado criado com sucesso!`);
    setShowNew(false);
    setSubmitting(false);
    fetchChamados();
  };

  const handleStatusChange = async (status: string, notes?: string) => {
    if (!selId || !user) return;
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'resolvido') updates.resolved_at = new Date().toISOString();
    if (status === 'em_andamento' && isTI) updates.atribuido_a = user.id;

    const { error } = await supabase.from('chamados_ti').update(updates).eq('id', selId);
    if (error) { toast.error('Erro ao atualizar status'); return; }

    if (notes) {
      await supabase.from('chamado_comentarios').insert({
        chamado_id: selId,
        mensagem: `[Resolução] ${notes}`,
        usuario_id: user.id,
      });
    }

    await supabase.from('notificacoes').insert({
      mensagem: `Chamado atualizado para: ${STATUS_LABEL[status]}`,
      tipo: 'chamado_ti',
      referencia_id: selId,
      referencia_tabela: 'chamados_ti',
      setor_destino: 'ti',
    } as any);

    toast.success(`Status atualizado → ${STATUS_LABEL[status]}`);
    fetchChamados();
    if (selId) fetchComentarios(selId);
  };

  const handleSendMsg = async (msg: string) => {
    if (!selId || !user) return;
    const { error } = await supabase.from('chamado_comentarios').insert({
      chamado_id: selId,
      mensagem: msg,
      usuario_id: user.id,
    });
    if (error) { toast.error('Erro ao enviar mensagem'); return; }
    fetchComentarios(selId);
  };

  const openDetail = (id: string) => {
    setSelId(id);
    setView('detail');
    fetchComentarios(id);
  };

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden h-full">
      <AnimatePresence mode="wait">
        {view === 'list' && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }} className="flex-1 flex flex-col overflow-hidden">
            <ChamadosList
              tickets={chamados}
              onView={openDetail}
              onNew={() => setShowNew(true)}
              loading={loading}
            />
          </motion.div>
        )}
        {view === 'detail' && selTicket && (
          <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }} className="flex-1 flex flex-col overflow-hidden">
            <TicketDetail
              ticket={selTicket}
              comentarios={comentarios}
              onBack={() => { setView('list'); setSelId(null); }}
              onStatusChange={handleStatusChange}
              onSendMsg={handleSendMsg}
              isTI={isTI}
              loadingComments={loadingComments}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showNew && (
          <NewTicketModal
            onClose={() => setShowNew(false)}
            onSubmit={handleCreate}
            submitting={submitting}
            userName={profile?.nome || ''}
            userSetor={profile?.setor || ''}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
