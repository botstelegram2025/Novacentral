import { useState } from "react";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { api, maskCPF } from "../lib/api";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export default function ForgotPassword() {
  const [cpf, setCpf] = useState("");
  const [method, setMethod] = useState("whatsapp");
  const [step, setStep] = useState(1);
  const [token, setToken] = useState("");
  const [newPw, setNewPw] = useState("");
  const [loading, setLoading] = useState(false);

  const request = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { cpf: cpf.replace(/\D/g, ""), method });
      toast.success("Se o CPF existir, um token foi enviado.");
      setStep(2);
    } catch (err) { toast.error(err?.response?.data?.detail || "Erro"); }
    finally { setLoading(false); }
  };

  const reset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: newPw });
      toast.success("Senha alterada! Faça login.");
      window.location.href = "/login";
    } catch (err) { toast.error(err?.response?.data?.detail || "Falha"); }
    finally { setLoading(false); }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto px-4 py-16">
        <Card className="card-elev">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 grid place-items-center mb-3">
              <KeyRound className="w-6 h-6 text-blue-400" />
            </div>
            <CardTitle className="heading text-2xl">Recuperar senha</CardTitle>
            <CardDescription>{step === 1 ? "Escolha o método de recuperação." : "Informe o token recebido e a nova senha."}</CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <form onSubmit={request} className="space-y-4">
                <div><Label>CPF</Label><Input data-testid="forgot-cpf-input" value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} required /></div>
                <div>
                  <Label>Método</Label>
                  <RadioGroup value={method} onValueChange={setMethod} className="grid grid-cols-2 gap-2 mt-1.5">
                    <label className="flex items-center gap-2 p-3 rounded-md border border-white/10 cursor-pointer hover:bg-white/5" data-testid="forgot-method-whatsapp">
                      <RadioGroupItem value="whatsapp" /> WhatsApp
                    </label>
                    <label className="flex items-center gap-2 p-3 rounded-md border border-white/10 cursor-pointer hover:bg-white/5" data-testid="forgot-method-email">
                      <RadioGroupItem value="email" /> Email
                    </label>
                  </RadioGroup>
                </div>
                <Button data-testid="forgot-submit-btn" disabled={loading} className="w-full rounded-full bg-blue-500 hover:bg-blue-400 h-11 font-semibold">Enviar token</Button>
              </form>
            ) : (
              <form onSubmit={reset} className="space-y-4">
                <div><Label>Token</Label><Input data-testid="reset-token-input" value={token} onChange={(e) => setToken(e.target.value)} required /></div>
                <div><Label>Nova senha</Label><Input data-testid="reset-newpw-input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required /></div>
                <Button data-testid="reset-submit-btn" disabled={loading} className="w-full rounded-full bg-blue-500 hover:bg-blue-400 h-11 font-semibold">Alterar senha</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
