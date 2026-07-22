import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { api } from "../lib/api";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Checkbox } from "../components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Trash2, Edit } from "lucide-react";

const empty = () => ({ name: "", kind: "activation", description: "", order: 0, active: true });

export default function AdminCategories() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty());
  const [editId, setEditId] = useState(null);

  const load = () => api.get("/catalog/categories").then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const submit = async () => {
    try {
      if (editId) await api.put(`/catalog/categories/${editId}`, form);
      else await api.post("/catalog/categories", form);
      toast.success("Salvo"); setOpen(false); load();
    } catch (err) { toast.error(err?.response?.data?.detail || "Erro"); }
  };
  const del = async (id) => { if (!window.confirm("Excluir?")) return; await api.delete(`/catalog/categories/${id}`); load(); };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="heading text-2xl font-bold">Categorias</h1>
        <Button data-testid="admin-new-category-btn" onClick={() => { setForm(empty()); setEditId(null); setOpen(true); }} className="rounded-full bg-blue-500 hover:bg-blue-400"><Plus className="w-4 h-4 mr-2" />Nova</Button>
      </div>
      <Card className="card-elev">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-zinc-500 border-b border-white/5">
              <tr><th className="text-left p-3">Nome</th><th className="text-left p-3">Tipo</th><th className="text-center p-3">Ordem</th><th className="text-center p-3">Ativa</th><th className="text-right p-3">Ações</th></tr>
            </thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-3 font-semibold">{c.name}</td>
                  <td className="p-3 text-zinc-400">{c.kind === "activation" ? "Ativação" : "Créditos"}</td>
                  <td className="p-3 text-center">{c.order}</td>
                  <td className="p-3 text-center">{c.active ? "✓" : "✗"}</td>
                  <td className="p-3 text-right"><div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" onClick={() => { setForm({ ...c }); setEditId(c.id); setOpen(true); }}><Edit className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => del(c.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Editar" : "Nova"} categoria</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input data-testid="category-form-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Tipo</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                <SelectTrigger data-testid="category-form-kind"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="activation">Ativação</SelectItem><SelectItem value="credits">Créditos</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Descrição</Label><Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Ordem</Label><Input type="number" value={form.order || 0} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} /></div>
            <label className="flex items-center gap-2"><Checkbox checked={!!form.active} onCheckedChange={(v) => setForm({ ...form, active: !!v })} />Ativa</label>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button data-testid="category-form-save-btn" onClick={submit} className="bg-blue-500 hover:bg-blue-400">Salvar</Button></div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
