import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useAuth } from "../store/auth";
import { toast } from "sonner";
import { maskCPF, maskPhone } from "../lib/api";
import { UserPlus } from "lucide-react";

const DDIS = [
  { v: "+55", l: "🇧🇷 +55 Brasil" },
  { v: "+1", l: "🇺🇸 +1 EUA" },
  { v: "+351", l: "🇵🇹 +351 Portugal" },
  { v: "+34", l: "🇪🇸 +34 Espanha" },
];

export default function Register() {
  const nav = useNavigate();
  const { register } = useAuth();
  const [f, setF] = useState({ name: "", cpf: "", ddi: "+55", ddd: "", phone: "", email: "", password: "", confirm_password: "", accept_terms: false });
  const [loading, setLoading] = useState(false);

  const upd = (k, v) => setF({ ...f, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    if (f.password !== f.confirm_password) return toast.error("Senhas não conferem");
    if (!f.accept_terms) return toast.error("Aceite os termos para continuar");
    setLoading(true);
    try {
      await register({ ...f, cpf: f.cpf.replace(/\D/g, ""), phone: f.phone.replace(/\D/g, "") });
      toast.success("Conta criada!");
      nav("/painel");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Falha ao cadastrar");
    } finally { setLoading(false); }
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-14">
        <Card className="card-elev">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 grid place-items-center mb-3">
              <UserPlus className="w-6 h-6 text-blue-400" />
            </div>
            <CardTitle className="heading text-2xl">Criar Conta</CardTitle>
            <CardDescription>Preencha seus dados para começar.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div><Label>Nome completo</Label><Input data-testid="register-name-input" value={f.name} onChange={(e) => upd("name", e.target.value)} required /></div>
              <div><Label>CPF</Label><Input data-testid="register-cpf-input" value={f.cpf} onChange={(e) => upd("cpf", maskCPF(e.target.value))} placeholder="000.000.000-00" required /></div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-5">
                  <Label>DDI</Label>
                  <Select value={f.ddi} onValueChange={(v) => upd("ddi", v)}>
                    <SelectTrigger data-testid="register-ddi-select"><SelectValue /></SelectTrigger>
                    <SelectContent>{DDIS.map(d => <SelectItem key={d.v} value={d.v}>{d.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-3"><Label>DDD</Label><Input data-testid="register-ddd-input" value={f.ddd} onChange={(e) => upd("ddd", e.target.value.replace(/\D/g, "").slice(0, 3))} required inputMode="numeric" /></div>
                <div className="col-span-4"><Label>Telefone</Label><Input data-testid="register-phone-input" value={f.phone} onChange={(e) => upd("phone", maskPhone(e.target.value))} required inputMode="numeric" /></div>
              </div>
              <div><Label>Email (opcional)</Label><Input data-testid="register-email-input" type="email" value={f.email} onChange={(e) => upd("email", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Senha</Label><Input data-testid="register-password-input" type="password" value={f.password} onChange={(e) => upd("password", e.target.value)} required /></div>
                <div><Label>Confirmar</Label><Input data-testid="register-confirm-input" type="password" value={f.confirm_password} onChange={(e) => upd("confirm_password", e.target.value)} required /></div>
              </div>
              <label className="flex items-start gap-2 text-sm text-zinc-400">
                <Checkbox checked={f.accept_terms} onCheckedChange={(v) => upd("accept_terms", !!v)} data-testid="register-terms-checkbox" className="mt-0.5" />
                <span>Aceito os termos de uso e a política de privacidade.</span>
              </label>
              <Button data-testid="register-submit-btn" disabled={loading} type="submit" className="w-full rounded-full bg-blue-500 hover:bg-blue-400 text-white btn-glow h-11 font-semibold">
                {loading ? "Criando..." : "Criar conta"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-zinc-500">
              Já tem conta? <Link to="/login" className="text-blue-400" data-testid="register-login-link">Entrar</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
