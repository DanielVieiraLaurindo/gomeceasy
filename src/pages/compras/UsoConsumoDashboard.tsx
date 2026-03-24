import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import UCStatusBadge from "@/components/uso-consumo/UCStatusBadge";
import { ucStatusConfig, type UCRequestStatus } from "@/lib/uso-consumo-status";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardList, Clock, CheckCircle2, AlertCircle, Search, Plus } from "lucide-react";

interface PurchaseRequest {
  id: string;
  req_number: string;
  requester_id: string;
  item_name: string;
  store: string | null;
  current_status: UCRequestStatus;
  created_at: string;
}

export default function UsoConsumoDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const fetchRequests = async () => {
      const { data } = await supabase
        .from("purchase_requests")
        .select("*")
        .order("created_at", { ascending: false });
      setRequests((data as PurchaseRequest[]) || []);
      setLoading(false);
    };
    fetchRequests();
  }, [user]);

  const filtered = requests.filter((r) => {
    const matchSearch = r.item_name.toLowerCase().includes(search.toLowerCase()) ||
      r.req_number.toLowerCase().includes(search.toLowerCase());
    if (search.trim()) return matchSearch;
    if (statusFilter !== "all") return r.current_status === statusFilter;
    return r.current_status !== "concluido";
  });

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => ["solicitado", "autorizado", "em_cotacao", "aguardando_aprovacao"].includes(r.current_status)).length,
    approved: requests.filter((r) => ["aprovado", "pedido_efetuado", "a_caminho", "recebido", "concluido"].includes(r.current_status)).length,
    rejected: requests.filter((r) => r.current_status === "reprovado").length,
  };

  const statCards = [
    { label: "Total", value: stats.total, icon: ClipboardList, color: "text-primary" },
    { label: "Em andamento", value: stats.pending, icon: Clock, color: "text-yellow-600" },
    { label: "Aprovadas", value: stats.approved, icon: CheckCircle2, color: "text-green-600" },
    { label: "Reprovadas", value: stats.rejected, icon: AlertCircle, color: "text-destructive" },
  ];

  // Status count pills
  const countMap = new Map<UCRequestStatus, number>();
  requests.forEach((r) => {
    countMap.set(r.current_status, (countMap.get(r.current_status) || 0) + 1);
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-barlow font-bold">Uso e Consumo</h1>
          <p className="text-muted-foreground text-sm">Solicitações de compra internas</p>
        </div>
        <Link to="/compras/uso-consumo/nova">
          <Button><Plus className="h-4 w-4 mr-2" /> Nova Solicitação</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="border">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className="text-3xl font-bold font-barlow">{s.value}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-muted ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status pills */}
      {countMap.size > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from(countMap.entries()).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === status
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:bg-muted"
              }`}
            >
              <span>{count}</span>
              <span>{ucStatusConfig[status]?.label || status}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card className="border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por item ou número..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(ucStatusConfig).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Nº</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Loja</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Nenhuma solicitação encontrada</td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4 text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-4">
                        <Link to={`/compras/uso-consumo/${r.id}`} className="font-mono text-sm font-semibold text-primary hover:underline">{r.req_number}</Link>
                      </td>
                      <td className="px-4 py-4 text-sm max-w-[200px] truncate">{r.item_name}</td>
                      <td className="px-4 py-4 text-sm">{r.store || "—"}</td>
                      <td className="px-4 py-4"><UCStatusBadge status={r.current_status} /></td>
                      <td className="px-4 py-4 text-right">
                        <Link to={`/compras/uso-consumo/${r.id}`} className="text-muted-foreground hover:text-foreground transition-colors">
                          <Eye className="h-4 w-4 inline" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
