import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import ProductCard from "../components/ProductCard";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { api } from "../lib/api";
import { Search, Filter, Loader2 } from "lucide-react";

export default function Store() {
  const [sp, setSp] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState(sp.get("q") || "");
  const [cat, setCat] = useState(sp.get("category_id") || "all");
  const [kind, setKind] = useState(sp.get("kind") || "all");
  const [sort, setSort] = useState("recent");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = { limit: 60, sort };
    if (q) params.q = q;
    if (cat && cat !== "all") params.category_id = cat;
    if (kind && kind !== "all") params.kind = kind;
    api.get("/catalog/products", { params }).then(r => setProducts(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { api.get("/catalog/categories?active_only=true").then(r => setCats(r.data)); }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, cat, kind, sort]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10 md:py-14">
        <div className="mb-8">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 mb-2">Loja</div>
          <h1 className="heading text-3xl sm:text-4xl font-bold mb-2">Todos os produtos</h1>
          <p className="text-zinc-400 text-sm">Encontre ativações, licenças e créditos digitais.</p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-3">
            <div className="card-elev p-5 sticky top-20">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">
                <Filter className="w-3.5 h-3.5" /> Filtros
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-widest mb-1.5 block">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input data-testid="store-search-input" placeholder="Pesquisar..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-widest mb-1.5 block">Categoria</label>
                  <Select value={cat} onValueChange={setCat}>
                    <SelectTrigger data-testid="store-category-select"><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {cats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-widest mb-1.5 block">Tipo</label>
                  <Select value={kind} onValueChange={setKind}>
                    <SelectTrigger data-testid="store-kind-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="activation">Ativação</SelectItem>
                      <SelectItem value="credits">Créditos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-widest mb-1.5 block">Ordenar</label>
                  <Select value={sort} onValueChange={setSort}>
                    <SelectTrigger data-testid="store-sort-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Mais recentes</SelectItem>
                      <SelectItem value="price_asc">Menor preço</SelectItem>
                      <SelectItem value="price_desc">Maior preço</SelectItem>
                      <SelectItem value="best_selling">Mais vendidos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </aside>
          <div className="lg:col-span-9">
            {loading ? (
              <div className="grid place-items-center py-20 text-zinc-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 text-zinc-500">Nenhum produto encontrado.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6" data-testid="store-products-grid">
                {products.map(p => <ProductCard key={p.id} p={p} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
