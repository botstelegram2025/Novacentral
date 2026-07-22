import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { api } from "../lib/api";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";

export default function AdminSettings() {
  const [f, setF] = useState({ app_name: "", logo: "", favicon: "", primary_color: "#3b82f6", company_info: {}, social_links: {}, seo: {}, mp_public_key: "" });

  useEffect(() => { api.get("/admin/settings").then(r => { if (r.data) setF({ ...f, ...r.data }); }); /* eslint-disable-next-line */ }, []);

  const save = async () => {
    try { await api.put("/admin/settings", f); toast.success("Configurações salvas"); }
    catch { toast.error("Erro"); }
  };

  return (
    <AdminLayout>
      <h1 className="heading text-2xl font-bold mb-6">Configurações</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="card-elev"><CardContent className="p-5 space-y-3">
          <div><Label>Nome do sistema</Label><Input data-testid="settings-appname" value={f.app_name || ""} onChange={(e) => setF({ ...f, app_name: e.target.value })} /></div>
          <div><Label>Logo (URL)</Label><Input value={f.logo || ""} onChange={(e) => setF({ ...f, logo: e.target.value })} /></div>
          <div><Label>Favicon (URL)</Label><Input value={f.favicon || ""} onChange={(e) => setF({ ...f, favicon: e.target.value })} /></div>
          <div><Label>Cor primária</Label><Input type="color" value={f.primary_color || "#3b82f6"} onChange={(e) => setF({ ...f, primary_color: e.target.value })} className="w-24 h-10" /></div>
          <div><Label>MP Public Key</Label><Input value={f.mp_public_key || ""} onChange={(e) => setF({ ...f, mp_public_key: e.target.value })} placeholder="Definido também via env" /></div>
        </CardContent></Card>
        <Card className="card-elev"><CardContent className="p-5 space-y-3">
          <Label>Empresa</Label>
          <Input placeholder="Nome" value={f.company_info?.name || ""} onChange={(e) => setF({ ...f, company_info: { ...f.company_info, name: e.target.value } })} />
          <Input placeholder="Email" value={f.company_info?.email || ""} onChange={(e) => setF({ ...f, company_info: { ...f.company_info, email: e.target.value } })} />
          <Input placeholder="Telefone" value={f.company_info?.phone || ""} onChange={(e) => setF({ ...f, company_info: { ...f.company_info, phone: e.target.value } })} />
          <Label className="mt-4">Redes Sociais</Label>
          <Input placeholder="Instagram URL" value={f.social_links?.instagram || ""} onChange={(e) => setF({ ...f, social_links: { ...f.social_links, instagram: e.target.value } })} />
          <Input placeholder="WhatsApp URL" value={f.social_links?.whatsapp || ""} onChange={(e) => setF({ ...f, social_links: { ...f.social_links, whatsapp: e.target.value } })} />
        </CardContent></Card>
        <Card className="card-elev md:col-span-2"><CardContent className="p-5 space-y-3">
          <Label>SEO</Label>
          <Input placeholder="Meta Title" value={f.seo?.meta_title || ""} onChange={(e) => setF({ ...f, seo: { ...f.seo, meta_title: e.target.value } })} />
          <Textarea placeholder="Meta Description" value={f.seo?.meta_description || ""} onChange={(e) => setF({ ...f, seo: { ...f.seo, meta_description: e.target.value } })} />
          <Input placeholder="Keywords (vírgula)" value={(f.seo?.keywords || []).join(",")} onChange={(e) => setF({ ...f, seo: { ...f.seo, keywords: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } })} />
        </CardContent></Card>
      </div>
      <Button onClick={save} data-testid="settings-save-btn" className="rounded-full bg-blue-500 hover:bg-blue-400 mt-6 h-11 font-semibold">Salvar configurações</Button>
    </AdminLayout>
  );
}
