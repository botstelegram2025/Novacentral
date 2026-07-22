import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { api, BRL } from "../lib/api";
import { Card, CardContent } from "../components/ui/card";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function AdminFinance() {
  const [d, setD] = useState(null);
  const [best, setBest] = useState([]);
  useEffect(() => {
    api.get("/admin/dashboard").then(r => setD(r.data));
    api.get("/admin/reports/best-sellers?limit=10").then(r => setBest(r.data));
  }, []);
  if (!d) return <AdminLayout><div>Carregando...</div></AdminLayout>;

  return (
    <AdminLayout>
      <h1 className="heading text-2xl font-bold mb-6">Financeiro</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[["Dia", d.revenue.day], ["Semana", d.revenue.week], ["Mês", d.revenue.month], ["Ano", d.revenue.year]].map(([l, v]) => (
          <Card key={l} className="card-elev"><CardContent className="p-5"><div className="text-xs uppercase text-zinc-500 mb-1">{l}</div><div className="heading text-2xl font-bold text-emerald-400">{BRL(v)}</div></CardContent></Card>
        ))}
      </div>
      <Card className="card-elev mb-6">
        <CardContent className="p-5">
          <div className="font-bold mb-4">Evolução (14 dias)</div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={d.chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 11 }} />
                <YAxis stroke="#71717a" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a" }} formatter={(v) => BRL(v)} />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card className="card-elev">
        <CardContent className="p-5">
          <div className="font-bold mb-4">Produtos mais vendidos</div>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-zinc-500 border-b border-white/5">
              <tr><th className="text-left p-2">Produto</th><th className="text-center p-2">Qtd</th><th className="text-right p-2">Receita</th></tr>
            </thead>
            <tbody>
              {best.length === 0 && <tr><td colSpan={3} className="p-4 text-zinc-500 text-center">Sem dados</td></tr>}
              {best.map((b, i) => (
                <tr key={i} className="border-b border-white/5"><td className="p-2 font-semibold">{b.name}</td><td className="p-2 text-center">{b.qty}</td><td className="p-2 text-right font-bold">{BRL(b.revenue)}</td></tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
