import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { api } from "../lib/api";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [audit, setAudit] = useState([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    api.get("/admin/logs?limit=300").then(r => setLogs(r.data));
    api.get("/admin/audit?limit=300").then(r => setAudit(r.data));
  }, []);
  const filtered = logs.filter(l => !q || l.message?.toLowerCase().includes(q.toLowerCase()) || l.kind?.toLowerCase().includes(q.toLowerCase()));

  return (
    <AdminLayout>
      <h1 className="heading text-2xl font-bold mb-4">Logs & Auditoria</h1>
      <Tabs defaultValue="logs">
        <TabsList><TabsTrigger value="logs">Logs</TabsTrigger><TabsTrigger value="audit">Auditoria</TabsTrigger></TabsList>
        <TabsContent value="logs">
          <Input data-testid="logs-search" placeholder="Filtrar..." value={q} onChange={(e) => setQ(e.target.value)} className="mb-3 max-w-md" />
          <Card className="card-elev"><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-zinc-500 border-b border-white/5 uppercase"><tr><th className="text-left p-3">Kind</th><th className="text-left p-3">Mensagem</th><th className="text-left p-3">Data</th></tr></thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id} className="border-b border-white/5"><td className="p-3 mono"><Badge className="text-[10px]">{l.kind}</Badge></td><td className="p-3">{l.message}</td><td className="p-3 mono">{new Date(l.created_at).toLocaleString("pt-BR")}</td></tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="audit">
          <Card className="card-elev"><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-zinc-500 border-b border-white/5 uppercase"><tr><th className="text-left p-3">Ator</th><th className="text-left p-3">Ação</th><th className="text-left p-3">Data</th></tr></thead>
              <tbody>
                {audit.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-zinc-500">Sem entradas de auditoria.</td></tr>}
                {audit.map((a, i) => (<tr key={i} className="border-b border-white/5"><td className="p-3">{a.actor}</td><td className="p-3">{a.action}</td><td className="p-3 mono">{a.created_at}</td></tr>))}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
