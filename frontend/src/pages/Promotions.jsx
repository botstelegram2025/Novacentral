import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import ProductCard from "../components/ProductCard";
import { api, BRL } from "../lib/api";
import { Card, CardContent } from "../components/ui/card";
import { Clock } from "lucide-react";

function Countdown({ to }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const target = new Date(to).getTime();
  const diff = Math.max(0, target - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff / 3600000) % 24);
  const m = Math.floor((diff / 60000) % 60);
  const s = Math.floor((diff / 1000) % 60);
  return (
    <div className="flex gap-2 items-center text-xs mono" data-testid="promo-countdown">
      <Clock className="w-3 h-3" />
      <span>{d}d {h.toString().padStart(2, "0")}:{m.toString().padStart(2, "0")}:{s.toString().padStart(2, "0")}</span>
    </div>
  );
}

export default function Promotions() {
  const [promos, setPromos] = useState([]);
  const [products, setProducts] = useState([]);
  useEffect(() => {
    api.get("/marketing/promotions?active_only=true").then(r => setPromos(r.data));
    api.get("/catalog/products?promo=true&limit=24").then(r => setProducts(r.data));
  }, []);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-red-400 mb-2">Promoções</div>
        <h1 className="heading text-3xl sm:text-4xl font-bold mb-8">Ofertas em destaque</h1>

        {promos.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4 mb-10">
            {promos.map(p => (
              <Card key={p.id} className="card-elev overflow-hidden border-l-4" style={{ borderLeftColor: p.color || "#3b82f6" }}>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <div className="heading text-xl font-bold">{p.name}</div>
                    <Countdown to={p.end_at} />
                  </div>
                  <div className="text-sm text-zinc-400 mb-3">{p.description}</div>
                  {p.new_value && (
                    <div className="flex gap-2 items-center">
                      {p.old_value && <span className="line-through text-zinc-500">{BRL(p.old_value)}</span>}
                      <span className="heading text-2xl font-bold" style={{ color: p.color }}>{BRL(p.new_value)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <h2 className="heading text-2xl font-bold mb-4">Produtos em promoção</h2>
        {products.length === 0 ? <div className="text-zinc-500">Nenhum produto em promoção.</div> :
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">{products.map(p => <ProductCard key={p.id} p={p} />)}</div>
        }
      </div>
    </Layout>
  );
}
