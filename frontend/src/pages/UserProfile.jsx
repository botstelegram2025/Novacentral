import { useState } from "react";
import { UserPanelLayout } from "./UserDashboard";
import { useAuth } from "../store/auth";
import { api, maskPhone } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

export default function UserProfile() {
  const { user, refreshMe } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [loading, setLoading] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put("/users/me", { name, phone: phone.replace(/\D/g, ""), email: email || null });
      toast.success("Perfil atualizado");
      await refreshMe();
    } catch (err) { toast.error(err?.response?.data?.detail || "Erro"); }
    finally { setLoading(false); }
  };

  const changePw = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/users/me/change-password", { current_password: curPw, new_password: newPw });
      toast.success("Senha alterada");
      setCurPw(""); setNewPw("");
    } catch (err) { toast.error(err?.response?.data?.detail || "Erro"); }
    finally { setLoading(false); }
  };

  return (
    <UserPanelLayout>
      <h1 className="heading text-2xl font-bold mb-6">Meu Perfil</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="card-elev">
          <CardHeader><CardTitle>Dados pessoais</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-3">
              <div><Label>Nome</Label><Input data-testid="profile-name-input" value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>CPF</Label><Input value={user?.cpf} disabled className="mono" /></div>
              <div><Label>Telefone</Label><Input data-testid="profile-phone-input" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} /></div>
              <div><Label>Email</Label><Input data-testid="profile-email-input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" /></div>
              <Button data-testid="profile-save-btn" disabled={loading} className="rounded-full bg-blue-500 hover:bg-blue-400 w-full">Salvar</Button>
            </form>
          </CardContent>
        </Card>
        <Card className="card-elev">
          <CardHeader><CardTitle>Alterar senha</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={changePw} className="space-y-3">
              <div><Label>Senha atual</Label><Input data-testid="password-current-input" type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} required /></div>
              <div><Label>Nova senha</Label><Input data-testid="password-new-input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required /></div>
              <Button data-testid="password-save-btn" disabled={loading} className="rounded-full bg-blue-500 hover:bg-blue-400 w-full">Alterar senha</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </UserPanelLayout>
  );
}
