import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { api } from "../lib/api";
import { Card, CardContent } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";

export default function AdminTickets() {
  const [tickets, setTickets] = useState([]);
  const [reply, setReply] = useState({});
  const load = () => api.get("/admin/tickets").then(r => setTickets(r.data));
  useEffect(load, []);

  const send = async (id) => { try { await api.post(`/admin/tickets/${id}/reply`, { message: reply[id] }); toast.success("Enviado"); setReply({ ...reply, [id]: "" }); load(); } catch { toast.error("Erro"); } };
  const close = async (id) => { await api.patch(`/admin/tickets/${id}/status`, { status: "closed" }); load(); };

  return (
    <AdminLayout>
      <h1 className="heading text-2xl font-bold mb-6">Tickets</h1>
      <div className="space-y-3">
        {tickets.length === 0 && <div className="card-elev p-10 text-center text-zinc-500">Sem tickets.</div>}
        {tickets.map(t => (
          <Card key={t.id} className="card-elev" data-testid={`admin-ticket-${t.id}`}>
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-semibold">{t.subject}</div>
                  <div className="text-xs text-zinc-500">{t.user_name} · {new Date(t.created_at).toLocaleString("pt-BR")}</div>
                </div>
                <div className="flex gap-2 items-center">
                  <Badge className={t.status === "open" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : t.status === "answered" ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : "bg-zinc-500/20"}>{t.status}</Badge>
                  {t.status !== "closed" && <Button size="sm" variant="outline" onClick={() => close(t.id)}>Fechar</Button>}
                </div>
              </div>
              <div className="space-y-2 mb-3">
                {(t.messages || []).map((m, i) => (
                  <div key={i} className={`p-2 rounded ${m.from === "admin" ? "bg-blue-500/10 border border-blue-500/20" : "bg-white/5"}`}>
                    <div className="text-[10px] uppercase text-zinc-500">{m.from === "admin" ? `Suporte${m.by ? " · " + m.by : ""}` : "Cliente"}</div>
                    <div className="text-sm">{m.text}</div>
                  </div>
                ))}
              </div>
              {t.status !== "closed" && (
                <div className="flex gap-2">
                  <Textarea rows={2} placeholder="Responder..." value={reply[t.id] || ""} onChange={(e) => setReply({ ...reply, [t.id]: e.target.value })} />
                  <Button onClick={() => send(t.id)} className="bg-blue-500 hover:bg-blue-400 self-end" disabled={!reply[t.id]}>Enviar</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}
