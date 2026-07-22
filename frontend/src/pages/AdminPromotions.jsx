import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { api, BRL } from "../lib/api";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Clock } from "lucide-react";

const empty = () => ({ name: "", description: "", banner: "", product_ids: [], old_value: 0, new_value: 0, color: "#3b82f6", start_at: new Date().toISOString().slice(0, 16), end_at: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16), active: true });

export default function AdminPromotions() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty());
  const [editId, setEditId] = useState(null);

  const load = () => api.get("/marketing/promotions").then(r => setItems(r.data));
  useEffect(load, []);

  const submit = async () => {
    try {
      const body = { ...form, start_at: new Date(form.start_at).toISOString(), end_at: new Date(form.end_at).toISOString(), old_value: Number(form.old_value) || null, new_value: Number(form.new_value) || null, product_ids: (form.product_ids || []).filter(Boolean) };
      if (editId) await api.put(`/marketing/promotions/${editId}`, body); else await api.post("/marketing/promotions", body);
      toast.success("Salvo"); setOpen(false); load();
    } catch (err) { toast.error("Erro"); }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="heading text-2xl font-bold">Promoções</h1>
        <Button data-testid="admin-new-promo-btn" onClick={() => { setForm(empty()); setEditId(null); setOpen(true); }} className="rounded-full bg-blue-500 hover:bg-blue-400"><Plus className="w-4 h-4 mr-2" />Nova</Button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {items.map(p => (
          <Card key={p.id} className="card-elev">
            <CardContent className="p-5">
              <div className="flex justify-between mb-2"><div className="font-bold">{p.name}</div><div className="w-4 h-4 rounded" style={{ background: p.color }} /></div>
              <div className="text-sm text-zinc-400 mb-3">{p.description}</div>
              <div className="flex justify-between text-sm mb-3">
                <span className="line-through text-zinc-500">{p.old_value ? BRL(p.old_value) : "-"}</span>
                <span className="font-bold text-blue-400">{p.new_value ? BRL(p.new_value) : "-"}</span>
              </div>
              <div className="text-xs text-zinc-500 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(p.start_at).toLocaleDateString("pt-BR")} → {new Date(p.end_at).toLocaleDateString("pt-BR")}</div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => { setForm({ ...p, start_at: p.start_at.slice(0, 16), end_at: p.end_at.slice(0, 16) }); setEditId(p.id); setOpen(true); }}><Edit className="w-3 h-3 mr-1" />Editar</Button>
                <Button size="sm" variant="ghost" className="text-red-400" onClick={async () => { if (window.confirm("Excluir?")) { await api.delete(`/marketing/promotions/${p.id}`); load(); } }}><Trash2 className="w-3 h-3 mr-1" />Excluir</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Promoção</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="promo-name" /></div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Banner (URL)</Label><Input value={form.banner} onChange={(e) => setForm({ ...form, banner: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Valor antigo</Label><Input type="number" step="0.01" value={form.old_value} onChange={(e) => setForm({ ...form, old_value: e.target.value })} /></div>
              <div><Label>Valor promo</Label><Input type="number" step="0.01" value={form.new_value} onChange={(e) => setForm({ ...form, new_value: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Início</Label><Input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} /></div>
              <div><Label>Fim</Label><Input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} /></div>
            </div>
            <div><Label>Cor</Label><Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-24 h-10" /></div>
            <label className="flex items-center gap-2"><Checkbox checked={!!form.active} onCheckedChange={(v) => setForm({ ...form, active: !!v })} />Ativa</label>
          </div>
          <Button onClick={submit} data-testid="promo-save-btn" className="bg-blue-500 hover:bg-blue-400 w-full">Salvar</Button>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
