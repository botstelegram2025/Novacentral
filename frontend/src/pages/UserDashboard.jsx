import { useEffect, useState } from "react";
import { Link, useNavigate, Outlet, useLocation } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../store/auth";
import { api, BRL } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { User, ShoppingBag, Bell, LifeBuoy, KeyRound, LogOut, Heart, Package } from "lucide-react";

const nav = [
  { to: "/painel", label: "Visão Geral", icon: User, exact: true },
  { to: "/painel/pedidos", label: "Meus Pedidos", icon: ShoppingBag },
  { to: "/painel/perfil", label: "Perfil", icon: KeyRound },
  { to: "/painel/notificacoes", label: "Notificações", icon: Bell },
  { to: "/painel/favoritos", label: "Favoritos", icon: Heart },
  { to: "/painel/suporte", label: "Suporte", icon: LifeBuoy },
];

export function UserPanelLayout({ children }) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();
  useEffect(() => { if (!user) navigate("/login"); }, [user, navigate]);
  if (!user) return null;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
        <div className="grid lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-3">
            <div className="card-elev p-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 grid place-items-center font-bold text-white">
                  {user.name?.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-sm">{user.name}</div>
                  <div className="text-xs text-zinc-500 mono">{user.cpf}</div>
                </div>
              </div>
              <nav className="space-y-1">
                {nav.map((it) => {
                  const active = it.exact ? loc.pathname === it.to : loc.pathname.startsWith(it.to);
                  return (
                    <Link key={it.to} to={it.to} data-testid={`user-nav-${it.label.toLowerCase().replace(/\s/g, "-")}`}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${active ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}>
                      <it.icon className="w-4 h-4" /> {it.label}
                    </Link>
                  );
                })}
                <button data-testid="user-logout-btn" onClick={() => { logout(); navigate("/"); }} className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm text-red-400 hover:bg-red-500/5">
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              </nav>
            </div>
          </aside>
          <div className="lg:col-span-9">{children}</div>
        </div>
      </div>
    </Layout>
  );
}

export default function UserDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    api.get("/orders/mine").then(r => setOrders(r.data)).catch(() => {});
    api.get("/users/me/notifications").then(r => setNotifs(r.data)).catch(() => {});
  }, []);

  const paidOrders = orders.filter(o => o.status === "paid" || o.status === "completed");
  const pending = orders.filter(o => o.status === "pending");
  const totalSpent = paidOrders.reduce((s, o) => s + o.total, 0);

  return (
    <UserPanelLayout>
      <div className="mb-8">
        <h1 className="heading text-3xl font-bold">Olá, {user?.name?.split(" ")[0]}!</h1>
        <p className="text-zinc-400 text-sm">Aqui está sua atividade recente.</p>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="card-elev"><CardContent className="p-5"><div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Pedidos</div><div className="heading text-2xl font-bold">{orders.length}</div></CardContent></Card>
        <Card className="card-elev"><CardContent className="p-5"><div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Pagos</div><div className="heading text-2xl font-bold text-emerald-400">{paidOrders.length}</div></CardContent></Card>
        <Card className="card-elev"><CardContent className="p-5"><div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Total gasto</div><div className="heading text-2xl font-bold text-blue-400">{BRL(totalSpent)}</div></CardContent></Card>
      </div>
      <Card className="card-elev">
        <CardHeader><CardTitle className="heading text-lg">Últimos pedidos</CardTitle></CardHeader>
        <CardContent>
          {orders.length === 0 ? <div className="text-zinc-500 text-sm">Você ainda não fez pedidos.</div> :
            <div className="space-y-2">
              {orders.slice(0, 6).map(o => (
                <Link key={o.id} to={`/painel/pedidos`} className="flex items-center justify-between p-3 rounded-md border border-white/5 hover:bg-white/5">
                  <div><div className="text-sm font-semibold">#{o.id.slice(0, 8)}</div><div className="text-xs text-zinc-500">{new Date(o.created_at).toLocaleString("pt-BR")}</div></div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{BRL(o.total)}</div>
                    <Badge className={`text-[10px] ${o.status === "paid" || o.status === "completed" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : o.status === "pending" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-red-500/20 text-red-300 border-red-500/30"}`}>{o.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>}
        </CardContent>
      </Card>
    </UserPanelLayout>
  );
}
