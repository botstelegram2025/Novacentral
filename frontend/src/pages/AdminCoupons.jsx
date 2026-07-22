import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { api, BRL } from "../lib/api";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Checkbox } from "../components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Trash2, Edit } from "lucide-react";

const empty = () => ({ code: "", type: "percent", value: 10, scope: "global", scope_ref: "", min_order: 0, max_uses: null, active: true });

export default function AdminCoupons() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty());
  const [editId, setEditId] = useState(null);

  const load = () => api.get("/marketing/coupons").then(r => setItems(r.data));
  useEffect(load, []);

  const submit = async () => {
    try {
      const body = { ...form, value: Number(form.value), min_order: Number(form.min_order || 0), max_uses: form.max_uses ? Number(form.max_uses) : null };
      if (editId) await api.put(`/marketing/coupons/${editId}`, body);
      else await api.post("/marketing/coupons", body);
      toast.success("Salvo"); setOpen(false); load();
    } catch (err) { toast.error(err?.response?.data?.detail || "Erro"); }
  };
  const del = async (id) => { if (!window.confirm("Excluir?")) return; await api.delete(`/marketing/coupons/${id}`); load(); };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="heading text-2xl font-bold">Cupons</h1>
        <Button data-testid="admin-new-coupon-btn" onClick={() => { setForm(empty()); setEditId(null); setOpen(true); }} className="rounded-full bg-blue-500 hover:bg-blue-400"><Plus className="w-4 h-4 mr-2" />Novo</Button>
      </div>
      <Card className="card-elev">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-zinc-500 border-b border-white/5">
              <tr><th className="text-left p-3">Código</th><th className="text-left p-3">Tipo</th><th className="text-right p-3">Valor</th><th className="text-left p-3">Escopo</th><th className="text-center p-3">Usos</th><th className="text-right p-3">Ações</th></tr>
            </thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-3 mono font-bold">{c.code}</td>
                  <td className="p-3">{c.type}</td>
                  <td className="p-3 text-right">{c.type === "percent" ? `${c.value}%` : BRL(c.value)}</td>
                  <td className="p-3">{c.scope}</td>
                  <td className="p-3 text-center">{c.used_count || 0}{c.max_uses ? `/${c.max_uses}` : ""}</td>
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
          <DialogHeader><DialogTitle>Cupom</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Código</Label><Input data-testid="coupon-code-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
            <div><Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="percent">Percentual</SelectItem><SelectItem value="fixed">Fixo</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Valor</Label><Input data-testid="coupon-value-input" type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
            <div><Label>Escopo</Label>
              <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="global">Global</SelectItem><SelectItem value="first_purchase">1ª compra</SelectItem><SelectItem value="category">Categoria</SelectItem><SelectItem value="product">Produto</SelectItem><SelectItem value="user">Usuário</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Ref. escopo (id)</Label><Input value={form.scope_ref || ""} onChange={(e) => setForm({ ...form, scope_ref: e.target.value })} /></div>
            <div><Label>Valor mínimo</Label><Input type="number" step="0.01" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: e.target.value })} /></div>
            <div><Label>Máx. usos</Label><Input type="number" value={form.max_uses || ""} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} /></div>
            <div className="col-span-2"><label className="flex items-center gap-2"><Checkbox checked={!!form.active} onCheckedChange={(v) => setForm({ ...form, active: !!v })} />Ativo</label></div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={submit} data-testid="coupon-save-btn" className="bg-blue-500 hover:bg-blue-400">Salvar</Button></div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
