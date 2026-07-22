import { useEffect, useState } from "react";
import { UserPanelLayout } from "./UserDashboard";
import { api, BRL } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Eye, RefreshCw, Copy } from "lucide-react";

export default function UserOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);

  const load = () => {
    setLoading(true);
    api.get("/orders/mine").then(r => setOrders(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const checkPayment = async (oid) => {
    try {
      const r = await api.post(`/orders/${oid}/check-payment`);
      toast.success(`Status: ${r.data.status}`);
      load();
    } catch (err) { toast.error(err?.response?.data?.detail || "Erro"); }
  };

  return (
    <UserPanelLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="heading text-2xl font-bold">Meus Pedidos</h1>
        <Button onClick={load} variant="outline" size="sm" data-testid="orders-refresh-btn"><RefreshCw className="w-4 h-4 mr-2" />Atualizar</Button>
      </div>
      {loading ? <div className="grid place-items-center py-20"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div> :
        orders.length === 0 ? <div className="card-elev p-10 text-center text-zinc-500">Nenhum pedido ainda.</div> :
          <div className="space-y-3">
            {orders.map(o => (
              <Card key={o.id} className="card-elev" data-testid={`order-row-${o.id}`}>
                <CardContent className="p-4 flex flex-wrap gap-3 items-center">
                  <div className="flex-1 min-w-[200px]">
                    <div className="text-xs text-zinc-500">Pedido</div>
                    <div className="mono text-sm">#{o.id.slice(0, 8)}</div>
                  </div>
                  <div className="min-w-[120px]">
                    <div className="text-xs text-zinc-500">Data</div>
                    <div className="text-sm">{new Date(o.created_at).toLocaleString("pt-BR")}</div>
                  </div>
                  <div className="min-w-[100px]">
                    <div className="text-xs text-zinc-500">Total</div>
                    <div className="font-bold text-blue-400">{BRL(o.total)}</div>
                  </div>
                  <div>
                    <Badge className={`${o.status === "paid" || o.status === "completed" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : o.status === "pending" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-red-500/20 text-red-300 border-red-500/30"}`}>{o.status}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setOpen(o)} data-testid={`order-view-${o.id}`}><Eye className="w-4 h-4" /></Button>
                    {o.status === "pending" && o.mp_payment_id && (
                      <Button size="sm" onClick={() => checkPayment(o.id)} className="bg-blue-500 hover:bg-blue-400" data-testid={`order-check-${o.id}`}>
                        Verificar pagamento
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>}

      <Dialog open={!!open} onOpenChange={() => setOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Pedido #{open?.id?.slice(0, 8)}</DialogTitle></DialogHeader>
          {open && (
            <div className="space-y-4 text-sm">
              <div className="space-y-2">
                {open.items?.map((it, i) => (
                  <div key={i} className="flex justify-between p-2 rounded border border-white/5">
                    <div>
                      <div className="font-semibold">{it.name}</div>
                      {Object.keys(it.custom_data || {}).length > 0 && (
                        <div className="text-xs text-zinc-500 mt-1 mono">
                          {Object.entries(it.custom_data).map(([k, v]) => `${k}: ${v}`).join(" | ")}
                        </div>
                      )}
                    </div>
                    <div className="text-right"><div>{it.quantity} × {BRL(it.unit_price)}</div><div className="font-bold">{BRL(it.line_total)}</div></div>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/5 pt-3 space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>{BRL(open.subtotal)}</span></div>
                {open.discount > 0 && <div className="flex justify-between text-emerald-400"><span>Desconto</span><span>- {BRL(open.discount)}</span></div>}
                <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-blue-400">{BRL(open.total)}</span></div>
              </div>
              {open.pix_qr_code && open.status === "pending" && (
                <div>
                  <div className="text-xs text-zinc-500 uppercase mb-1">Código PIX</div>
                  <div className="mono text-xs bg-black/40 p-3 rounded border border-white/5 break-all">{open.pix_qr_code}</div>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => { navigator.clipboard.writeText(open.pix_qr_code); toast.success("Copiado"); }}><Copy className="w-3 h-3 mr-2" />Copiar</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </UserPanelLayout>
  );
}
