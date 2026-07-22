import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { useAuth } from "../store/auth";
import { toast } from "sonner";
import { maskCPF } from "../lib/api";
import { LogIn } from "lucide-react";

export default function Login() {
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(cpf.replace(/\D/g, ""), password, remember);
      toast.success("Bem-vindo de volta!");
      nav("/painel");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Falha no login");
    } finally { setLoading(false); }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto px-4 py-16">
        <Card className="card-elev">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 grid place-items-center mb-3">
              <LogIn className="w-6 h-6 text-blue-400" />
            </div>
            <CardTitle className="heading text-2xl">Entrar</CardTitle>
            <CardDescription>Acesse com seu CPF e senha.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" data-testid="login-cpf-input" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} inputMode="numeric" required className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input id="password" data-testid="login-password-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1.5" />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-zinc-400">
                  <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} data-testid="login-remember-checkbox" />
                  Lembrar de mim
                </label>
                <Link to="/recuperar-senha" className="text-sm text-blue-400 hover:text-blue-300" data-testid="login-forgot-link">Esqueci a senha</Link>
              </div>
              <Button data-testid="login-submit-btn" disabled={loading} type="submit" className="w-full rounded-full bg-blue-500 hover:bg-blue-400 text-white btn-glow h-11 font-semibold">
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-zinc-500">
              Não tem conta?{" "}
              <Link to="/cadastro" className="text-blue-400 hover:text-blue-300" data-testid="login-register-link">Criar agora</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
