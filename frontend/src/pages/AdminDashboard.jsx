import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { api, BRL } from "../lib/api";
import { useAuth } from "../store/auth";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { Users, ShoppingBag, DollarSign, Package, Clock, TrendingUp } from "lucide-react";

const KPI = ({ icon: Icon, label, value, color = "blue" }) => (
  <Card className="card-elev">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">{label}</div>
          <div className={`heading text-2xl font-bold text-${color}-400`}>{value}</div>
        </div>
        <div className={`w-10 h-10 rounded-lg bg-${color}-500/10 border border-${color}-500/20 grid place-items-center text-${color}-400`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function AdminDashboard() {
  const nav = useNavigate();
  const { admin } = useAuth();
  const [d, setD] = useState(null);

  useEffect(() => {
    if (!admin) { nav("/admin/login"); return; }
    api.get("/admin/dashboard").then(r => setD(r.data)).catch(() => nav("/admin/login"));
  }, [admin, nav]);

  if (!d) return <AdminLayout><div className="text-zinc-500">Carregando...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="heading text-2xl font-bold">Dashboard</h1>
        <p className="text-zinc-500 text-sm">Visão geral em tempo real.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPI icon={Users} label="Usuários" value={d.total_users} />
        <KPI icon={ShoppingBag} label="Pedidos Hoje" value={d.orders_today} color="emerald" />
        <KPI icon={Clock} label="Pendentes" value={d.pending_orders} color="amber" />
        <KPI icon={Package} label="Vendidos" value={d.products_sold} color="indigo" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPI icon={DollarSign} label="Faturamento Dia" value={BRL(d.revenue.day)} color="emerald" />
        <KPI icon={DollarSign} label="Semana" value={BRL(d.revenue.week)} color="emerald" />
        <KPI icon={DollarSign} label="Mês" value={BRL(d.revenue.month)} color="emerald" />
        <KPI icon={TrendingUp} label="Ticket Médio" value={BRL(d.ticket_avg)} color="indigo" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="card-elev lg:col-span-2">
          <CardContent className="p-5">
            <div className="heading font-bold mb-4">Receita (últimos 14 dias)</div>
            <div className="h-64" data-testid="revenue-chart">
              <ResponsiveContainer>
                <LineChart data={d.chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#71717a" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a" }} formatter={(v) => BRL(v)} />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elev">
          <CardContent className="p-5">
            <div className="heading font-bold mb-4">Pedidos por dia</div>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={d.chart}>
                  <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#71717a" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a" }} />
                  <Bar dataKey="orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="card-elev">
          <CardContent className="p-5">
            <div className="heading font-bold mb-4">Últimos pedidos</div>
            <div className="space-y-2">
              {d.last_orders.length === 0 && <div className="text-sm text-zinc-500">Nenhum pedido ainda.</div>}
              {d.last_orders.map(o => (
                <div key={o.id} className="flex justify-between items-center p-2 rounded border border-white/5 text-sm">
                  <div>
                    <div className="mono text-xs">#{o.id.slice(0, 8)}</div>
                    <div className="text-xs text-zinc-500">{o.user_snapshot?.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{BRL(o.total)}</div>
                    <Badge className="text-[9px]">{o.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="card-elev">
          <CardContent className="p-5">
            <div className="heading font-bold mb-4">Últimos usuários</div>
            <div className="space-y-2">
              {d.last_users.length === 0 && <div className="text-sm text-zinc-500">Nenhum usuário.</div>}
              {d.last_users.map(u => (
                <div key={u.id} className="flex justify-between p-2 rounded border border-white/5 text-sm">
                  <div>
                    <div className="font-semibold">{u.name}</div>
                    <div className="text-xs text-zinc-500 mono">{u.cpf}</div>
                  </div>
                  <div className="text-xs text-zinc-500">{new Date(u.created_at).toLocaleDateString("pt-BR")}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
