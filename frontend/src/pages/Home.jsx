import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import ProductCard from "../components/ProductCard";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import { ArrowRight, Zap, Shield, Clock, Sparkles } from "lucide-react";

const HERO_BG = "https://images.unsplash.com/photo-1780764818910-80526d8aeb6d?crop=entropy&cs=srgb&fm=jpg&w=1600&q=85";

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [promos, setPromos] = useState([]);

  useEffect(() => {
    api.get("/catalog/products", { params: { featured: true, limit: 8 } }).then(r => setFeatured(r.data)).catch(() => {});
    api.get("/catalog/products", { params: { promo: true, limit: 4 } }).then(r => setPromos(r.data)).catch(() => {});
  }, []);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={HERO_BG} alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-20 md:py-32 grid md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-300 mb-6">
              <Sparkles className="w-3.5 h-3.5" /> Entrega automática via PIX
            </div>
            <h1 className="heading text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight mb-6">
              Produtos digitais<br />entregues em <span className="text-blue-400">segundos</span>.
            </h1>
            <p className="text-zinc-400 text-base sm:text-lg max-w-xl mb-8 leading-relaxed">
              Ativações, licenças e créditos com pagamento aprovado em tempo real. Sem burocracia. Sem espera.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/loja"><Button data-testid="hero-cta-loja" size="lg" className="rounded-full bg-blue-500 hover:bg-blue-400 text-white btn-glow px-8 h-12 font-semibold">
                Explorar loja <ArrowRight className="w-4 h-4 ml-2" />
              </Button></Link>
              <Link to="/cadastro"><Button data-testid="hero-cta-cadastro" size="lg" variant="ghost" className="rounded-full h-12 border border-white/10 hover:bg-white/5">
                Criar conta
              </Button></Link>
              <Link to="/admin/login"><Button data-testid="hero-cta-admin" size="lg" variant="ghost" className="rounded-full h-12 text-zinc-500 hover:text-white">
                Painel Administrativo
              </Button></Link>
            </div>
          </div>
          <div className="md:col-span-5 hidden md:block">
            <div className="grid grid-cols-2 gap-4">
              {[{ i: Zap, t: "PIX Instantâneo", d: "Aprovação em segundos" },
                { i: Shield, t: "100% Seguro", d: "Mercado Pago oficial" },
                { i: Clock, t: "24/7", d: "Entrega automática" },
                { i: Sparkles, t: "Suporte VIP", d: "WhatsApp direto" }].map((it, i) => (
                <div key={i} className="card-elev p-5 hover:border-blue-500/30 transition-colors">
                  <it.i className="w-6 h-6 text-blue-400 mb-3" />
                  <div className="heading font-semibold mb-1">{it.t}</div>
                  <div className="text-xs text-zinc-500">{it.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 mb-2">Destaques</div>
            <h2 className="heading text-2xl sm:text-3xl font-bold">Produtos em destaque</h2>
          </div>
          <Link to="/loja" className="text-sm text-zinc-400 hover:text-white flex items-center gap-1" data-testid="featured-see-all">
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {featured.length === 0 ? (
          <div className="text-center text-zinc-500 py-12">Sem produtos em destaque no momento.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {featured.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </section>

      {/* Promos */}
      {promos.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-red-400 mb-2">Promoção</div>
              <h2 className="heading text-2xl sm:text-3xl font-bold">Ofertas por tempo limitado</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {promos.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}
    </Layout>
  );
}
