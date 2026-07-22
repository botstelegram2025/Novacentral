import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { api } from "../lib/api";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Edit } from "lucide-react";

const empty = () => ({ title: "", subtitle: "", image: "", link: "", type: "main", order: 0, active: true });

export default function AdminBanners() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty());
  const [editId, setEditId] = useState(null);

  const load = () => api.get("/marketing/banners").then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const submit = async () => {
    try {
      if (editId) await api.put(`/marketing/banners/${editId}`, form);
      else await api.post("/marketing/banners", form);
      toast.success("Salvo"); setOpen(false); load();
    } catch (err) { toast.error("Erro"); }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="heading text-2xl font-bold">Banners</h1>
        <Button data-testid="admin-new-banner-btn" onClick={() => { setForm(empty()); setEditId(null); setOpen(true); }} className="rounded-full bg-blue-500 hover:bg-blue-400"><Plus className="w-4 h-4 mr-2" />Novo</Button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(b => (
          <Card key={b.id} className="card-elev overflow-hidden">
            <div className="aspect-video bg-black">{b.image && <img src={b.image} alt={b.title} className="w-full h-full object-cover" />}</div>
            <CardContent className="p-4">
              <div className="text-xs uppercase text-zinc-500">{b.type}</div>
              <div className="font-bold">{b.title || "(sem título)"}</div>
              <div className="text-xs text-zinc-500">{b.subtitle}</div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => { setForm({ ...b }); setEditId(b.id); setOpen(true); }}><Edit className="w-3 h-3 mr-1" />Editar</Button>
                <Button size="sm" variant="ghost" className="text-red-400" onClick={async () => { if (window.confirm("Excluir?")) { await api.delete(`/marketing/banners/${b.id}`); load(); } }}><Trash2 className="w-3 h-3 mr-1" />Excluir</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Banner</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="banner-title" /></div>
            <div><Label>Subtítulo</Label><Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
            <div><Label>Imagem URL</Label><Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} data-testid="banner-image" /></div>
            <div><Label>Link</Label><Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} /></div>
            <div><Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="main">Principal</SelectItem><SelectItem value="promo">Promoção</SelectItem><SelectItem value="side">Lateral</SelectItem><SelectItem value="popup">Popup</SelectItem><SelectItem value="slider">Slider</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Ordem</Label><Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} /></div>
            <label className="flex items-center gap-2"><Checkbox checked={!!form.active} onCheckedChange={(v) => setForm({ ...form, active: !!v })} />Ativo</label>
          </div>
          <Button onClick={submit} data-testid="banner-save-btn" className="bg-blue-500 hover:bg-blue-400 w-full">Salvar</Button>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
