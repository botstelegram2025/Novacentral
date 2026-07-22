import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { api } from "../lib/api";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Search, Trash2, Lock, Unlock, KeyRound } from "lucide-react";

export default function AdminUsers() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [resetOpen, setResetOpen] = useState(null);
  const [newPw, setNewPw] = useState("");

  const load = () => api.get("/admin/users", { params: { q: q || undefined } }).then(r => setItems(r.data));
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [q]);

  const toggleStatus = async (u) => {
    const s = u.status === "active" ? "blocked" : "active";
    await api.patch(`/admin/users/${u.id}/status`, { status: s }); load();
  };
  const del = async (id) => { if (!window.confirm("Excluir usuário?")) return; await api.delete(`/admin/users/${id}`); load(); };
  const doReset = async () => {
    if (newPw.length < 8) return toast.error("Senha muito curta");
    await api.post(`/admin/users/${resetOpen.id}/reset-password`, { password: newPw });
    toast.success("Senha alterada"); setResetOpen(null); setNewPw("");
  };

  return (
    <AdminLayout>
      <h1 className="heading text-2xl font-bold mb-4">Usuários</h1>
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input data-testid="admin-users-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, CPF, telefone..." className="pl-9" />
      </div>
      <Card className="card-elev">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-zinc-500 border-b border-white/5">
              <tr><th className="text-left p-3">Nome</th><th className="text-left p-3">CPF</th><th className="text-left p-3">Telefone</th><th className="text-center p-3">Status</th><th className="text-left p-3">Cadastro</th><th className="text-right p-3">Ações</th></tr>
            </thead>
            <tbody>
              {items.map(u => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/5" data-testid={`admin-user-${u.id}`}>
                  <td className="p-3 font-semibold">{u.name}</td>
                  <td className="p-3 mono text-xs">{u.cpf}</td>
                  <td className="p-3 mono text-xs">{u.ddi}{u.ddd}{u.phone}</td>
                  <td className="p-3 text-center"><Badge className={u.status === "active" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-red-500/20 text-red-300 border-red-500/30"}>{u.status}</Badge></td>
                  <td className="p-3 text-xs">{new Date(u.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="p-3 text-right"><div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" onClick={() => toggleStatus(u)} title={u.status === "active" ? "Bloquear" : "Ativar"} data-testid={`admin-user-toggle-${u.id}`}>{u.status === "active" ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}</Button>
                    <Button size="icon" variant="ghost" onClick={() => setResetOpen(u)}><KeyRound className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => del(u.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Dialog open={!!resetOpen} onOpenChange={() => setResetOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resetar senha - {resetOpen?.name}</DialogTitle></DialogHeader>
          <Label>Nova senha</Label><Input data-testid="admin-user-reset-input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          <Button data-testid="admin-user-reset-submit" onClick={doReset} className="bg-blue-500 hover:bg-blue-400">Aplicar</Button>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
