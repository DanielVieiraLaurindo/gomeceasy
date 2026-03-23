import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import UCStatusBadge from "@/components/uso-consumo/UCStatusBadge";
import UCApprovalActions from "@/components/uso-consumo/UCApprovalActions";
import UCFileList from "@/components/uso-consumo/UCFileList";
import { ucStatusConfig, type UCRequestStatus } from "@/lib/uso-consumo-status";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Paperclip, Trash2, Clock } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PurchaseRequest {
  id: string;
  req_number: string;
  requester_id: string;
  gestor_id: string | null;
  item_name: string;
  quantity: number;
  current_status: UCRequestStatus;
  store: string | null;
  department: string | null;
  delivery_deadline: string | null;
  observations: string | null;
  requires_controller_approval: boolean;
  selected_quotation_id: string | null;
  created_at: string;
  [key: string]: any;
}

interface PurchaseRequestItem {
  id: string;
  request_id: string;
  item_name: string;
  quantity: number;
  reference_models: string | null;
  destinado_a: string | null;
  gestor_approved: boolean;
  purchased: boolean;
  quotation_batch: number | null;
}

interface StatusHistory {
  id: string;
  request_id: string;
  new_status: UCRequestStatus;
  old_status: UCRequestStatus | null;
  observation: string | null;
  changed_at: string;
}

export default function UsoConsumoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [items, setItems] = useState<PurchaseRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fileRefreshKey, setFileRefreshKey] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const isMaster = role === "master";

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    await supabase.from("request_attachments").delete().eq("request_id", id);
    await supabase.from("request_status_history").delete().eq("request_id", id);
    await supabase.from("purchase_request_items").delete().eq("request_id", id);
    const { error } = await supabase.from("purchase_requests").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      setDeleting(false);
    } else {
      toast({ title: "Solicitação excluída!" });
      navigate("/compras/uso-consumo");
    }
  };

  const fetchData = async () => {
    if (!id) return;
    const [reqRes, histRes, itemsRes] = await Promise.all([
      supabase.from("purchase_requests").select("*").eq("id", id).single(),
      supabase.from("request_status_history").select("*").eq("request_id", id).order("changed_at", { ascending: true }),
      supabase.from("purchase_request_items").select("*").eq("request_id", id),
    ]);
    setRequest(reqRes.data as PurchaseRequest | null);
    setHistory((histRes.data as StatusHistory[]) || []);
    setItems((itemsRes.data as PurchaseRequestItem[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>;
  if (!request) return <div className="text-center py-12 text-muted-foreground">Solicitação não encontrada</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/compras/uso-consumo")} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-barlow text-xl font-bold">{request.req_number}</h1>
              <UCStatusBadge status={request.current_status} />
            </div>
            <p className="text-muted-foreground text-xs mt-0.5">
              {request.item_name} · {request.store || "—"} · Criada em {new Date(request.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>
        {isMaster && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={deleting}>
                <Trash2 className="h-4 w-4 mr-1" /> Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir solicitação?</AlertDialogTitle>
                <AlertDialogDescription>Esta ação é irreversível. A solicitação {request.req_number} será permanentemente removida.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="font-barlow text-base">Informações Gerais</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
                <div>
                  <p className="text-[11px] uppercase text-muted-foreground font-medium tracking-wider">Data</p>
                  <p className="text-sm mt-0.5">{new Date(request.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-muted-foreground font-medium tracking-wider">Loja</p>
                  <p className="text-sm mt-0.5">{request.store || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-muted-foreground font-medium tracking-wider">Departamento</p>
                  <p className="text-sm mt-0.5">{request.department || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-muted-foreground font-medium tracking-wider">Prazo de Entrega</p>
                  <p className="text-sm mt-0.5">{request.delivery_deadline ? new Date(request.delivery_deadline).toLocaleDateString("pt-BR") : "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] uppercase text-muted-foreground font-medium tracking-wider">Observações</p>
                  <p className="text-sm mt-0.5">{request.observations || "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {items.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="font-barlow text-base">Itens ({items.length})</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-6 py-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.reference_models ? `Ref: ${item.reference_models}` : ""}
                          {item.destinado_a ? ` · Destinado a: ${item.destinado_a}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-sm font-medium">{item.quantity} UN</span>
                        {request.current_status !== "solicitado" && (
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Checkbox checked={item.gestor_approved} disabled className="h-3.5 w-3.5" />
                              <span className="text-muted-foreground">Autorizado</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Checkbox checked={item.purchased} disabled className="h-3.5 w-3.5" />
                              <span className="text-muted-foreground">Comprado</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-barlow text-base flex items-center gap-2"><Paperclip className="h-4 w-4" /> Anexos</CardTitle>
            </CardHeader>
            <CardContent>
              <UCFileList requestId={request.id} refreshKey={fileRefreshKey} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <UCApprovalActions request={request} items={items} onUpdate={fetchData} />

          {history.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-barlow text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {history.map((h, i) => (
                    <div key={h.id} className="flex items-start gap-3">
                      <div className={`mt-1.5 h-3 w-3 rounded-full border-2 flex-shrink-0 ${
                        i === history.length - 1 ? "border-primary bg-primary" : "border-muted-foreground/30 bg-transparent"
                      }`} />
                      <div>
                        <UCStatusBadge status={h.new_status} />
                        <p className="text-xs text-muted-foreground mt-0.5">{new Date(h.changed_at).toLocaleString("pt-BR")}</p>
                        {h.observation && <p className="text-xs text-muted-foreground mt-1">{h.observation}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
