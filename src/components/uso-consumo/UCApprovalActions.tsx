import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Truck, ShoppingCart, PackageCheck, Navigation, Package } from "lucide-react";
import UCQuotationManager from "./UCQuotationManager";
import type { UCRequestStatus } from "@/lib/uso-consumo-status";

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

interface ApprovalActionsProps {
  request: PurchaseRequest;
  items: PurchaseRequestItem[];
  onUpdate: () => void;
}

export default function UCApprovalActions({ request, items, onUpdate }: ApprovalActionsProps) {
  const { user, role, setor } = useAuth();
  const { toast } = useToast();
  const [observation, setObservation] = useState("");
  const [loading, setLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [requiresControllerApproval, setRequiresControllerApproval] = useState(
    request.requires_controller_approval ?? false
  );
  const [itemApprovals, setItemApprovals] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    items.forEach((it) => { map[it.id] = it.gestor_approved; });
    return map;
  });

  if (!user || request.current_status === "concluido") return null;

  const isMaster = role === "master";
  const isCompras = setor === "compras" || isMaster;
  const isGestor = isMaster; // gestor logic based on gestor_id match
  const isGestorForThis = request.gestor_id === user.id || isMaster;

  const handleAction = async (newStatus: UCRequestStatus, extraUpdates: Record<string, any> = {}) => {
    setLoading(true);
    const updates: Record<string, any> = { current_status: newStatus, ...extraUpdates };
    const { error } = await supabase
      .from("purchase_requests")
      .update(updates)
      .eq("id", request.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status atualizado!" });
      setObservation("");
      onUpdate();
    }
    setLoading(false);
  };

  // GESTOR: approve/reject per item
  if (isGestorForThis && request.current_status === "solicitado") {
    const handleAuthorize = async () => {
      setLoading(true);
      for (const item of items) {
        await supabase.from("purchase_request_items").update({
          gestor_approved: itemApprovals[item.id] ?? true,
        }).eq("id", item.id);
      }
      const anyApproved = Object.values(itemApprovals).some((v) => v);
      if (!anyApproved) {
        await handleAction("reprovado");
      } else {
        await handleAction("autorizado");
      }
    };

    return (
      <Card>
        <CardHeader><CardTitle className="font-barlow text-lg">Aprovação do Gestor</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Desmarque os itens que deseja reprovar.</p>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                <Checkbox
                  checked={itemApprovals[item.id] ?? true}
                  onCheckedChange={(checked) => setItemApprovals((prev) => ({ ...prev, [item.id]: !!checked }))}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.item_name}</p>
                  <p className="text-xs text-muted-foreground">Qtd: {item.quantity}{item.destinado_a ? ` · ${item.destinado_a}` : ""}</p>
                </div>
              </div>
            ))}
          </div>
          <Textarea placeholder="Observações (opcional)..." value={observation} onChange={(e) => setObservation(e.target.value)} rows={2} />
          <Button onClick={handleAuthorize} disabled={loading} className="w-full">
            <CheckCircle2 className="h-4 w-4 mr-2" /> Autorizar
          </Button>
        </CardContent>
      </Card>
    );
  }

  // COMPRADOR: send to quotation
  if (isCompras && request.current_status === "autorizado") {
    return (
      <Card>
        <CardHeader><CardTitle className="font-barlow text-lg">Ações do Comprador</CardTitle></CardHeader>
        <CardContent>
          <Button onClick={() => handleAction("em_cotacao", { assigned_buyer_id: user.id })} disabled={loading} className="w-full">
            <ShoppingCart className="h-4 w-4 mr-2" /> Iniciar Cotação
          </Button>
        </CardContent>
      </Card>
    );
  }

  // COMPRADOR: quotation management
  if (isCompras && request.current_status === "em_cotacao") {
    return (
      <div className="space-y-4">
        <UCQuotationManager request={request} items={items} onUpdate={onUpdate} />
        <Card>
          <CardHeader><CardTitle className="font-barlow text-lg">Enviar para Aprovação</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
              <Switch checked={requiresControllerApproval} onCheckedChange={setRequiresControllerApproval} />
              <Label className="text-sm">Requer aprovação da Controladoria</Label>
            </div>
            <Button
              onClick={() => {
                if (requiresControllerApproval) {
                  handleAction("aguardando_aprovacao", { requires_controller_approval: true });
                } else {
                  handleAction("aprovado", { requires_controller_approval: false });
                }
              }}
              disabled={loading || !request.selected_quotation_id}
              className="w-full"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {requiresControllerApproval ? "Enviar para Controladoria" : "Aprovar e Avançar"}
            </Button>
            {!request.selected_quotation_id && <p className="text-xs text-destructive">Selecione uma cotação antes de enviar.</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Approval
  if (request.current_status === "aguardando_aprovacao" && (isMaster || isCompras)) {
    return (
      <Card>
        <CardHeader><CardTitle className="font-barlow text-lg">Aprovação Final</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Textarea placeholder="Observações sobre a decisão..." value={observation} onChange={(e) => setObservation(e.target.value)} rows={3} />
          <div className="flex gap-3">
            <Button onClick={() => handleAction("aprovado", { approver_decision: "Aprovado", approver_observations: observation })} disabled={loading} className="flex-1">
              <CheckCircle2 className="h-4 w-4 mr-2" /> Aprovar
            </Button>
            <Button variant="destructive" onClick={() => handleAction("reprovado", { approver_decision: "Reprovado", approver_observations: observation })} disabled={loading} className="flex-1">
              <XCircle className="h-4 w-4 mr-2" /> Reprovar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mark as ordered
  if (isCompras && request.current_status === "aprovado") {
    return (
      <Card>
        <CardHeader><CardTitle className="font-barlow text-lg">Efetuar Pedido</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Número do Pedido</Label>
            <Input placeholder="Ex: PED-12345" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
          </div>
          <Button onClick={() => handleAction("pedido_efetuado", { order_number: orderNumber })} disabled={loading || !orderNumber.trim()} className="w-full">
            <Truck className="h-4 w-4 mr-2" /> Marcar como Pedido Efetuado
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Mark as on the way
  if (isCompras && request.current_status === "pedido_efetuado") {
    return (
      <Card>
        <CardHeader><CardTitle className="font-barlow text-lg">Nota Fiscal</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Número da NF</Label>
            <Input placeholder="Ex: NF-001234" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
          </div>
          <Button onClick={() => handleAction("a_caminho", { invoice_number: invoiceNumber })} disabled={loading || !invoiceNumber.trim()} className="w-full">
            <Navigation className="h-4 w-4 mr-2" /> Marcar como A Caminho
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Received
  if (request.current_status === "a_caminho") {
    return (
      <Card>
        <CardHeader><CardTitle className="font-barlow text-lg">Recebimento</CardTitle></CardHeader>
        <CardContent>
          <Button onClick={() => handleAction("recebido")} disabled={loading} className="w-full">
            <Package className="h-4 w-4 mr-2" /> Marcar como Recebido
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Concluded
  if ((isCompras || isMaster) && request.current_status === "recebido") {
    return (
      <Card>
        <CardHeader><CardTitle className="font-barlow text-lg">Finalizar</CardTitle></CardHeader>
        <CardContent>
          <Button onClick={() => handleAction("concluido")} disabled={loading} className="w-full">
            <PackageCheck className="h-4 w-4 mr-2" /> Marcar como Concluído
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
