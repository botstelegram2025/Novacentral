import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { Loader2, MessageSquare, Power, RefreshCw, LogOut, QrCode, Send } from "lucide-react";

export default function AdminWhatsApp() {
  const [sessions, setSessions] = useState([]);
  const [newId, setNewId] = useState("main");
  const [status, setStatus] = useState({});
  const [templates, setTemplates] = useState([]);
  const [testSend, setTestSend] = useState({ session_id: "", to: "", text: "" });

  const load = () => api.get("/whatsapp/sessions").then(r => setSessions(r.data));
  const loadT = () => api.get("/whatsapp/templates").then(r => setTemplates(r.data));

  useEffect(() => { load(); loadT(); const t = setInterval(refreshAll, 5000); return () => clearInterval(t); }, []);

  const refreshAll = async () => {
    const r = await api.get("/whatsapp/sessions");
    setSessions(r.data);
    for (const s of r.data) {
      try {
        const st = await api.get(`/whatsapp/sessions/${s.session_id}/status`);
        setStatus((prev) => ({ ...prev, [s.session_id]: st.data }));
      } catch { }
    }
  };

  const startNew = async () => {
    try { await api.post("/whatsapp/sessions/start", { session_id: newId, label: newId }); toast.success("Iniciando..."); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Erro"); }
  };
  const restart = async (id) => { await api.post(`/whatsapp/sessions/${id}/restart`); toast.success("Reiniciando"); };
  const logout = async (id) => { await api.post(`/whatsapp/sessions/${id}/logout`); toast.success("Desconectado"); load(); };
  const del = async (id) => { if (!window.confirm("Excluir sessão?")) return; await api.delete(`/whatsapp/sessions/${id}`); load(); };
  const doSend = async () => {
    try { await api.post("/whatsapp/send", testSend); toast.success("Enviado"); }
    catch (e) { toast.error(e?.response?.data?.detail || "Erro"); }
  };

  const saveTpl = async (t) => {
    try { await api.post("/whatsapp/templates", t); toast.success("Template salvo"); loadT(); }
    catch (e) { toast.error("Erro"); }
  };

  return (
    <AdminLayout>
      <div className="mb-6"><h1 className="heading text-2xl font-bold">WhatsApp Baileys</h1><p className="text-zinc-500 text-sm">Sessões, QR Code e templates de mensagens.</p></div>

      <Card className="card-elev mb-4">
        <CardContent className="p-5">
          <div className="flex gap-2 items-end">
            <div className="flex-1"><Label>ID da nova sessão</Label><Input data-testid="wa-newsession-input" value={newId} onChange={(e) => setNewId(e.target.value)} /></div>
            <Button data-testid="wa-start-btn" onClick={startNew} className="bg-blue-500 hover:bg-blue-400"><Power className="w-4 h-4 mr-2" />Iniciar sessão</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {sessions.map(s => {
          const st = status[s.session_id] || {};
          return (
            <Card key={s.session_id} className="card-elev" data-testid={`wa-session-${s.session_id}`}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-bold">{s.label || s.session_id}</div>
                    <div className="text-xs text-zinc-500 mono">{s.session_id}</div>
                  </div>
                  <Badge className={st.connected ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : st.qr ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : "bg-red-500/20 text-red-300 border-red-500/30"}>
                    {st.connected ? "Conectado" : st.qr ? "Aguardando QR" : "Offline"}
                  </Badge>
                </div>
                {st.qr && !st.connected && (
                  <div className="bg-white p-3 rounded-lg inline-block mb-3">
                    <img src={st.qr} alt="QR" className="w-56 h-56" data-testid={`wa-qr-${s.session_id}`} />
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => restart(s.session_id)}><RefreshCw className="w-3 h-3 mr-1" />Reiniciar</Button>
                  <Button size="sm" variant="outline" onClick={() => logout(s.session_id)}><LogOut className="w-3 h-3 mr-1" />Sair</Button>
                  <Button size="sm" variant="ghost" className="text-red-400" onClick={() => del(s.session_id)}>Excluir</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="card-elev mb-6">
        <CardHeader><CardTitle className="text-base">Teste de envio</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-2">
          <Input placeholder="session_id" value={testSend.session_id} onChange={(e) => setTestSend({ ...testSend, session_id: e.target.value })} data-testid="wa-test-sid" />
          <Input placeholder="Ex: 5511999999999" value={testSend.to} onChange={(e) => setTestSend({ ...testSend, to: e.target.value })} data-testid="wa-test-to" />
          <Input placeholder="Mensagem" value={testSend.text} onChange={(e) => setTestSend({ ...testSend, text: e.target.value })} data-testid="wa-test-text" />
          <Button className="bg-blue-500 hover:bg-blue-400 col-span-3" onClick={doSend} data-testid="wa-test-send-btn"><Send className="w-4 h-4 mr-2" />Enviar teste</Button>
        </CardContent>
      </Card>

      <Card className="card-elev">
        <CardHeader><CardTitle>Templates de mensagem</CardTitle></CardHeader>
        <CardContent>
          <div className="text-xs text-zinc-500 mb-3">Variáveis: {"{nome} {cpf} {telefone} {produto} {valor} {pedido} {pix} {status} {data} {token}"}</div>
          <div className="space-y-4">
            {templates.map((t, i) => (
              <div key={t.id} className="p-3 border border-white/5 rounded" data-testid={`wa-tpl-${t.key}`}>
                <div className="flex justify-between items-center mb-2">
                  <div className="mono text-xs text-blue-400 font-bold">{t.key} · {t.channel}</div>
                </div>
                <Textarea rows={3} value={t.body} onChange={(e) => { const arr = [...templates]; arr[i] = { ...t, body: e.target.value }; setTemplates(arr); }} />
                <Button size="sm" className="mt-2 bg-blue-500 hover:bg-blue-400" onClick={() => saveTpl(templates[i])}>Salvar</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
