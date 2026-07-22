import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { api, BRL } from "../lib/api";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Checkbox } from "../components/ui/checkbox";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Copy, Search } from "lucide-react";

const FIELD_TYPES = [
  { v: "text", l: "Texto" },
  { v: "email", l: "Email" },
  { v: "password", l: "Senha" },
  { v: "number", l: "Número" },
  { v: "textarea", l: "Texto longo" },
];

const empty = () => ({
  name: "", description: "", category_id: "", image: "", banner: "",
  price: 0, promo_price: 0, sku: "", code: "", stock: 999, status: "active",
  is_featured: false, is_promo: false, is_new: false, is_hidden: false,
  min_qty: 1, max_qty: 1, volume_discount: [],
  custom_fields: [], meta_title: "", meta_description: "", keywords: []
});

export default function AdminProducts() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty());
  const [editId, setEditId] = useState(null);

  const load = () => api.get("/catalog/products", { params: { include_hidden: true, limit: 500, q: q || undefined } }).then(r => setItems(r.data));
  useEffect(() => { api.get("/catalog/categories").then(r => setCats(r.data)); }, []);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [q]);

  const submit = async () => {
    try {
      const body = { ...form, price: Number(form.price), promo_price: form.promo_price ? Number(form.promo_price) : null, min_qty: Number(form.min_qty), max_qty: Number(form.max_qty), stock: Number(form.stock) };
      if (editId) await api.put(`/catalog/products/${editId}`, body);
      else await api.post("/catalog/products", body);
      toast.success("Salvo");
      setOpen(false); setForm(empty()); setEditId(null); load();
    } catch (err) { toast.error(err?.response?.data?.detail || "Erro"); }
  };

  const edit = (p) => { setForm({ ...empty(), ...p, promo_price: p.promo_price || 0 }); setEditId(p.id); setOpen(true); };
  const dup = async (id) => { await api.post(`/catalog/products/${id}/duplicate`); toast.success("Duplicado"); load(); };
  const del = async (id) => { if (!window.confirm("Excluir?")) return; await api.delete(`/catalog/products/${id}`); load(); };

  const addField = () => setForm({ ...form, custom_fields: [...(form.custom_fields || []), { key: "", label: "", type: "text", required: true, placeholder: "" }] });
  const rmField = (i) => setForm({ ...form, custom_fields: form.custom_fields.filter((_, x) => x !== i) });
  const updField = (i, key, v) => { const cf = [...form.custom_fields]; cf[i] = { ...cf[i], [key]: v }; setForm({ ...form, custom_fields: cf }); };

  const addVol = () => setForm({ ...form, volume_discount: [...(form.volume_discount || []), { qty: 10, discount: 5 }] });
  const rmVol = (i) => setForm({ ...form, volume_discount: form.volume_discount.filter((_, x) => x !== i) });

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h1 className="heading text-2xl font-bold">Produtos</h1>
          <p className="text-zinc-500 text-sm">Gerencie seu catálogo.</p>
        </div>
        <Button data-testid="admin-new-product-btn" onClick={() => { setForm(empty()); setEditId(null); setOpen(true); }} className="rounded-full bg-blue-500 hover:bg-blue-400"><Plus className="w-4 h-4 mr-2" />Novo produto</Button>
      </div>
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input data-testid="admin-products-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produtos..." className="pl-9" />
      </div>

      <Card className="card-elev">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-zinc-500 border-b border-white/5">
              <tr><th className="text-left p-3">Nome</th><th className="text-left p-3">Categoria</th><th className="text-right p-3">Preço</th><th className="text-center p-3">Status</th><th className="text-center p-3">Vendidos</th><th className="text-right p-3">Ações</th></tr>
            </thead>
            <tbody>
              {items.map(p => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5" data-testid={`admin-product-row-${p.id}`}>
                  <td className="p-3"><div className="flex items-center gap-2">{p.image && <img src={p.image} className="w-8 h-8 rounded object-cover" alt="" />}<div><div className="font-semibold">{p.name}</div><div className="text-xs text-zinc-500 mono">{p.sku}</div></div></div></td>
                  <td className="p-3 text-zinc-400">{p.category?.name}</td>
                  <td className="p-3 text-right font-bold">{BRL(p.promo_price || p.price)}</td>
                  <td className="p-3 text-center"><Badge className={p.status === "active" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-zinc-500/20"}>{p.status}</Badge></td>
                  <td className="p-3 text-center">{p.sold_count || 0}</td>
                  <td className="p-3 text-right"><div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" onClick={() => edit(p)} data-testid={`admin-product-edit-${p.id}`}><Edit className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => dup(p.id)}><Copy className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => del(p.id)} data-testid={`admin-product-delete-${p.id}`}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Editar" : "Novo"} produto</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="md:col-span-2"><Label>Nome</Label><Input data-testid="product-form-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Descrição</Label><Textarea rows={3} data-testid="product-form-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Categoria</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger data-testid="product-form-category"><SelectValue placeholder="Escolher..." /></SelectTrigger>
                <SelectContent>{cats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>URL Imagem</Label><Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Preço</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} data-testid="product-form-price" /></div>
            <div><Label>Preço promo</Label><Input type="number" step="0.01" value={form.promo_price} onChange={(e) => setForm({ ...form, promo_price: e.target.value })} /></div>
            <div><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
            <div><Label>Código interno</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
            <div><Label>Estoque</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="inactive">Inativo</SelectItem><SelectItem value="archived">Arquivado</SelectItem><SelectItem value="hidden">Oculto</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-2 py-2">
              {[["is_featured", "Destaque"], ["is_promo", "Promoção"], ["is_new", "Novo"], ["is_hidden", "Ocultar"]].map(([k, l]) => (
                <label key={k} className="flex items-center gap-2 text-sm"><Checkbox checked={!!form[k]} onCheckedChange={(v) => setForm({ ...form, [k]: !!v })} />{l}</label>
              ))}
            </div>

            <div className="md:col-span-2 border-t border-white/5 pt-4">
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm font-bold uppercase tracking-widest text-zinc-400">Quantidades (Créditos)</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Mín.</Label><Input type="number" value={form.min_qty} onChange={(e) => setForm({ ...form, min_qty: e.target.value })} /></div>
                <div><Label>Máx.</Label><Input type="number" value={form.max_qty} onChange={(e) => setForm({ ...form, max_qty: e.target.value })} /></div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between items-center mb-2">
                  <Label>Descontos por volume</Label>
                  <Button size="sm" variant="outline" onClick={addVol}><Plus className="w-3 h-3 mr-1" />Adicionar</Button>
                </div>
                {(form.volume_discount || []).map((v, i) => (
                  <div key={i} className="grid grid-cols-5 gap-2 mb-2 items-center">
                    <Input type="number" placeholder="Qtd" value={v.qty} onChange={(e) => { const arr = [...form.volume_discount]; arr[i].qty = Number(e.target.value); setForm({ ...form, volume_discount: arr }); }} className="col-span-2" />
                    <Input type="number" placeholder="% desc" value={v.discount} onChange={(e) => { const arr = [...form.volume_discount]; arr[i].discount = Number(e.target.value); setForm({ ...form, volume_discount: arr }); }} className="col-span-2" />
                    <Button size="icon" variant="ghost" onClick={() => rmVol(i)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 border-t border-white/5 pt-4">
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm font-bold uppercase tracking-widest text-zinc-400">Campos personalizados (Ativação)</div>
                <Button size="sm" variant="outline" onClick={addField} data-testid="product-add-field-btn"><Plus className="w-3 h-3 mr-1" />Adicionar</Button>
              </div>
              {(form.custom_fields || []).map((f, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-center" data-testid={`custom-field-row-${i}`}>
                  <Input placeholder="Chave (ex: mac)" value={f.key} onChange={(e) => updField(i, "key", e.target.value)} className="col-span-3" />
                  <Input placeholder="Rótulo" value={f.label} onChange={(e) => updField(i, "label", e.target.value)} className="col-span-3" />
                  <Select value={f.type} onValueChange={(v) => updField(i, "type", v)}>
                    <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                    <SelectContent>{FIELD_TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="Placeholder" value={f.placeholder} onChange={(e) => updField(i, "placeholder", e.target.value)} className="col-span-2" />
                  <label className="col-span-1 flex items-center gap-1 text-xs"><Checkbox checked={!!f.required} onCheckedChange={(v) => updField(i, "required", !!v)} />Req</label>
                  <Button size="icon" variant="ghost" onClick={() => rmField(i)} className="col-span-1"><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button className="bg-blue-500 hover:bg-blue-400" onClick={submit} data-testid="product-form-save-btn">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
