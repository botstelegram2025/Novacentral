import { useEffect, useState } from "react";
import { UserPanelLayout } from "./UserDashboard";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";

export default function UserSupport() {
  const [tickets, setTickets] = useState([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState({});

  const load = () => api.get("/tickets/mine").then(r => setTickets(r.data));
  useEffect(() => { load(); }, []);

  const open = async (e) => {
    e.preventDefault();
    try {
      await api.post("/tickets", { subject, message });
      toast.success("Chamado aberto");
      setSubject(""); setMessage(""); load();
    } catch (err) { toast.error(err?.response?.data?.detail || "Erro"); }
  };

  const sendReply = async (tid) => {
    try {
      await api.post(`/tickets/${tid}/reply`, { message: reply[tid] });
      toast.success("Resposta enviada");
      setReply({ ...reply, [tid]: "" });
      load();
    } catch { toast.error("Erro"); }
  };

  return (
    <UserPanelLayout>
      <h1 className="heading text-2xl font-bold mb-6">Suporte</h1>
      <Card className="card-elev mb-6">
        <CardHeader><CardTitle>Abrir novo chamado</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={open} className="space-y-3">
            <Input data-testid="ticket-subject-input" placeholder="Assunto" value={subject} onChange={(e) => setSubject(e.target.value)} required />
            <Textarea data-testid="ticket-message-input" placeholder="Descreva sua dúvida" value={message} onChange={(e) => setMessage(e.target.value)} required rows={4} />
            <Button data-testid="ticket-submit-btn" className="rounded-full bg-blue-500 hover:bg-blue-400">Abrir chamado</Button>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {tickets.map(t => (
          <Card key={t.id} className="card-elev" data-testid={`ticket-${t.id}`}>
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-semibold">{t.subject}</div>
                  <div className="text-xs text-zinc-500">{new Date(t.created_at).toLocaleString("pt-BR")}</div>
                </div>
                <Badge className={t.status === "open" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : t.status === "answered" ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : "bg-zinc-500/20 text-zinc-300"}>{t.status}</Badge>
              </div>
              <div className="space-y-2 mb-3">
                {(t.messages || []).map((m, i) => (
                  <div key={i} className={`p-2 rounded ${m.from === "admin" ? "bg-blue-500/10 border border-blue-500/20" : "bg-white/5"}`}>
                    <div className="text-[10px] uppercase text-zinc-500">{m.from === "admin" ? `Suporte: ${m.by || ""}` : "Você"}</div>
                    <div className="text-sm">{m.text}</div>
                  </div>
                ))}
              </div>
              {t.status !== "closed" && (
                <div className="flex gap-2">
                  <Textarea rows={2} value={reply[t.id] || ""} onChange={(e) => setReply({ ...reply, [t.id]: e.target.value })} placeholder="Escreva uma resposta..." />
                  <Button onClick={() => sendReply(t.id)} disabled={!reply[t.id]} className="bg-blue-500 hover:bg-blue-400 self-end" data-testid={`ticket-reply-${t.id}`}>Enviar</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </UserPanelLayout>
  );
}
