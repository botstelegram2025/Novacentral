import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { useAuth } from "../store/auth";
import { toast } from "sonner";
import { maskCPF } from "../lib/api";
import { Shield } from "lucide-react";
import { Toaster } from "sonner";

export default function AdminLogin() {
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { adminLogin } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminLogin(cpf.replace(/\D/g, ""), password);
      toast.success("Bem-vindo");
      nav("/admin");
    } catch (err) { toast.error(err?.response?.data?.detail || "Erro"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img src="https://images.pexels.com/photos/27141316/pexels-photo-27141316.jpeg?w=1600" alt="" className="w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-background/70" />
      </div>
      <Card className="card-elev w-full max-w-md">
        <CardHeader>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 grid place-items-center mb-3">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <CardTitle className="heading text-2xl">Painel Administrativo</CardTitle>
          <CardDescription>Acesso restrito. Login com CPF administrativo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div><Label>CPF</Label><Input data-testid="admin-login-cpf-input" value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} required /></div>
            <div><Label>Senha</Label><Input data-testid="admin-login-password-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            <Button data-testid="admin-login-submit-btn" disabled={loading} type="submit" className="w-full rounded-full bg-blue-500 hover:bg-blue-400 h-11 font-semibold">
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <div className="text-xs text-zinc-500 mt-4 text-center">
            Padrão inicial: CPF <span className="mono">00000000000</span> / senha <span className="mono">Admin@123</span>
          </div>
        </CardContent>
      </Card>
      <Toaster theme="dark" position="top-right" richColors />
    </div>
  );
}
