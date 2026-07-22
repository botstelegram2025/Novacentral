import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { api, BRL } from "../lib/api";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { toast } from "sonner";
import { Search, Eye } from "lucide-react";

export default function AdminOrders() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [detail, setDetail] = useState(null);

  const load = () => api.get("/admin/orders", { params: { q: q || undefined, status: status !== "all" ? status : undefined } }).then(r => setItems(r.data));
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [q, status]);

  const updateStatus = async (oid, s) => {
    await api.patch(`/admin/orders/${oid}/status`, { status: s });
    toast.success("Status atualizado"); load();
  };

  const exportCSV = () => {
    const rows = ["ID,Cliente,CPF,Total,Status,Data"];
    items.forEach(o => rows.push([o.id, o.user_snapshot?.name, o.user_snapshot?.cpf, o.total, o.status, o.created_at].map(v => `"${v}"`).join(",")));
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `pedidos.csv`; a.click();
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h1 className="heading text-2xl font-bold">Pedidos</h1>
        <Button data-testid="admin-orders-export-btn" onClick={exportCSV} variant="outline">Exportar CSV</Button>
      </div>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input data-testid="admin-orders-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ID, nome, CPF..." className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
            <SelectItem value="processing">Processando</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
            <SelectItem value="refunded">Reembolsado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card className="card-elev">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-zinc-500 border-b border-white/5">
              <tr><th className="text-left p-3">Pedido</th><th className="text-left p-3">Cliente</th><th className="text-right p-3">Total</th><th className="text-center p-3">Status</th><th className="text-left p-3">Data</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {items.map(o => (
                <tr key={o.id} className="border-b border-white/5 hover:bg-white/5" data-testid={`admin-order-row-${o.id}`}>
                  <td className="p-3 mono text-xs">#{o.id.slice(0, 8)}</td>
                  <td className="p-3">
                    <div className="font-semibold">{o.user_snapshot?.name}</div>
                    <div className="text-xs text-zinc-500 mono">{o.user_snapshot?.cpf}</div>
                  </td>
                  <td className="p-3 text-right font-bold">{BRL(o.total)}</td>
                  <td className="p-3 text-center">
                    <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                      <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="paid">Pago</SelectItem>
                        <SelectItem value="processing">Processando</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                        <SelectItem value="refunded">Reembolsado</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-xs">{new Date(o.created_at).toLocaleString("pt-BR")}</td>
                  <td className="p-3 text-right"><Button size="icon" variant="ghost" onClick={() => setDetail(o)}><Eye className="w-4 h-4" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Pedido #{detail?.id?.slice(0, 8)}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="p-3 bg-white/5 rounded">
                <div className="font-semibold">{detail.user_snapshot?.name}</div>
                <div className="text-xs text-zinc-500 mono">{detail.user_snapshot?.cpf} · {detail.user_snapshot?.phone}</div>
              </div>
              {detail.items?.map((it, i) => (
                <div key={i} className="p-3 border border-white/5 rounded">
                  <div className="font-semibold">{it.name}</div>
                  <div className="text-xs text-zinc-500">Qtd: {it.quantity} · {BRL(it.unit_price)} · Total: {BRL(it.line_total)}</div>
                  {Object.keys(it.custom_data || {}).length > 0 && <div className="mt-1 mono text-xs bg-black/40 p-2 rounded">{Object.entries(it.custom_data).map(([k, v]) => `${k}: ${v}`).join(" | ")}</div>}
                </div>
              ))}
              <div className="font-bold">Total: {BRL(detail.total)}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
