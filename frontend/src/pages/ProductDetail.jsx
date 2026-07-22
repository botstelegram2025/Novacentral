import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { api, BRL } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { useCart } from "../store/cart";
import { toast } from "sonner";
import { ShoppingCart, Sparkles, Loader2, Minus, Plus } from "lucide-react";

export default function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [p, setP] = useState(null);
  const [qty, setQty] = useState(1);
  const [customData, setCustomData] = useState({});
  const add = useCart((s) => s.addItem);

  useEffect(() => {
    api.get(`/catalog/products/${id}`).then(r => {
      setP(r.data);
      setQty(r.data?.min_qty || 1);
    }).catch(() => nav("/loja"));
  }, [id, nav]);

  if (!p) return <Layout><div className="grid place-items-center py-32 text-zinc-500"><Loader2 className="w-8 h-8 animate-spin" /></div></Layout>;

  const kind = p.category?.kind;
  const price = p.promo_price || p.price;
  const hasPromo = p.promo_price && p.promo_price < p.price;

  const handleAdd = () => {
    // Validate custom fields if activation
    if (kind === "activation") {
      for (const cf of p.custom_fields || []) {
        if (cf.required && !customData[cf.key]) return toast.error(`Preencha: ${cf.label}`);
      }
    }
    const ok = add(p, qty, customData);
    if (ok) nav("/carrinho");
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="card-elev overflow-hidden aspect-square">
            {p.image ? (
              <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
            ) : <div className="w-full h-full grid place-items-center text-zinc-600"><Sparkles className="w-16 h-16" /></div>}
          </div>
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {p.is_new && <Badge className="bg-emerald-500 border-0 text-white">NOVO</Badge>}
              {p.is_promo && hasPromo && <Badge className="bg-red-500 border-0 text-white">Promoção</Badge>}
              <Badge variant="secondary" className="bg-white/5">{p.category?.name}</Badge>
            </div>
            <h1 data-testid="product-title" className="heading text-3xl md:text-4xl font-bold mb-3">{p.name}</h1>
            <p className="text-zinc-400 leading-relaxed mb-6">{p.description}</p>
            <div className="mb-6">
              {hasPromo && <div className="text-zinc-500 line-through text-sm">{BRL(p.price)}</div>}
              <div data-testid="product-price" className="heading text-4xl font-black text-blue-400">{BRL(price)}</div>
              {p.sku && <div className="text-xs text-zinc-500 mt-1 mono">SKU: {p.sku}</div>}
            </div>

            {kind === "credits" && (
              <div className="mb-5">
                <Label>Quantidade</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Button data-testid="qty-decrement-btn" variant="outline" size="icon" onClick={() => setQty(Math.max(p.min_qty || 1, qty - 1))}><Minus className="w-4 h-4" /></Button>
                  <Input data-testid="product-qty-input" type="number" min={p.min_qty || 1} max={p.max_qty || 9999} value={qty} onChange={(e) => setQty(Math.max(p.min_qty || 1, Math.min(p.max_qty || 9999, Number(e.target.value) || 1)))} className="w-24 text-center" />
                  <Button data-testid="qty-increment-btn" variant="outline" size="icon" onClick={() => setQty(Math.min(p.max_qty || 9999, qty + 1))}><Plus className="w-4 h-4" /></Button>
                  <span className="text-xs text-zinc-500 ml-2">Min: {p.min_qty} / Max: {p.max_qty}</span>
                </div>
                {(p.volume_discount || []).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.volume_discount.map((v, i) => (
                      <div key={i} className="px-2 py-1 rounded border border-blue-500/30 bg-blue-500/5 text-xs text-blue-300">
                        {v.qty}+ = -{v.discount}%
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {kind === "activation" && (p.custom_fields || []).length > 0 && (
              <div className="mb-5 space-y-3">
                <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">Dados para ativação</div>
                {p.custom_fields.map((cf) => (
                  <div key={cf.key}>
                    <Label>{cf.label}{cf.required && <span className="text-red-400">*</span>}</Label>
                    {cf.type === "textarea" ? (
                      <Textarea data-testid={`custom-field-${cf.key}`} value={customData[cf.key] || ""} onChange={(e) => setCustomData({ ...customData, [cf.key]: e.target.value })} placeholder={cf.placeholder} />
                    ) : (
                      <Input data-testid={`custom-field-${cf.key}`} type={cf.type || "text"} value={customData[cf.key] || ""} onChange={(e) => setCustomData({ ...customData, [cf.key]: e.target.value })} placeholder={cf.placeholder} />
                    )}
                  </div>
                ))}
              </div>
            )}

            <Button data-testid="product-add-cart-btn" onClick={handleAdd} size="lg" className="w-full rounded-full bg-blue-500 hover:bg-blue-400 text-white btn-glow h-12 font-semibold">
              <ShoppingCart className="w-4 h-4 mr-2" /> Adicionar ao carrinho
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
