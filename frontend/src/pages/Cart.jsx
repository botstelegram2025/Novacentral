import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useCart } from "../store/cart";
import { api, BRL } from "../lib/api";
import { useAuth } from "../store/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { Trash2, ArrowRight, Minus, Plus, Ticket } from "lucide-react";

export default function Cart() {
  const { items, updateQty, removeItem } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const [couponCode, setCouponCode] = useState("");
  const [preview, setPreview] = useState({ subtotal: 0, discount: 0, total: 0, coupon: null });

  const doPreview = async () => {
    if (!user) return;
    if (items.length === 0) return setPreview({ subtotal: 0, discount: 0, total: 0, coupon: null });
    try {
      const r = await api.post("/orders/preview", {
        items: items.map(i => ({ product_id: i.product.id, quantity: i.quantity, custom_data: i.custom_data || {} })),
        coupon_code: couponCode || undefined,
      });
      setPreview(r.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Não foi possível calcular");
    }
  };

  useEffect(() => { doPreview(); /* eslint-disable-next-line */ }, [items, couponCode, user]);

  const checkout = () => {
    if (!user) return nav("/login");
    if (items.length === 0) return toast.error("Carrinho vazio");
    nav("/checkout");
  };

  const localSubtotal = items.reduce((s, i) => s + (i.product.promo_price || i.product.price) * i.quantity, 0);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
        <h1 className="heading text-3xl font-bold mb-8">Carrinho</h1>
        {items.length === 0 ? (
          <div className="card-elev p-12 text-center">
            <div className="text-zinc-500 mb-4">Seu carrinho está vazio.</div>
            <Link to="/loja"><Button data-testid="cart-back-store-btn" className="rounded-full bg-blue-500 hover:bg-blue-400">Ver produtos</Button></Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-3">
              {items.map((i) => (
                <div key={i.product.id} className="card-elev p-4 flex gap-4" data-testid={`cart-item-${i.product.id}`}>
                  <img src={i.product.image} alt="" className="w-20 h-20 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500">{i.product.category?.kind === "activation" ? "Ativação" : "Créditos"}</div>
                    <div className="font-semibold truncate">{i.product.name}</div>
                    <div className="text-blue-400 font-bold mt-1">{BRL((i.product.promo_price || i.product.price) * i.quantity)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {i.product.category?.kind === "credits" ? (
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQty(i.product.id, Math.max(i.product.min_qty || 1, i.quantity - 1))} data-testid={`cart-dec-${i.product.id}`}><Minus className="w-3 h-3" /></Button>
                        <Input value={i.quantity} onChange={(e) => updateQty(i.product.id, Math.max(i.product.min_qty || 1, Number(e.target.value) || 1))} className="w-14 h-8 text-center" data-testid={`cart-qty-${i.product.id}`} />
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQty(i.product.id, Math.min(i.product.max_qty || 9999, i.quantity + 1))} data-testid={`cart-inc-${i.product.id}`}><Plus className="w-3 h-3" /></Button>
                      </div>
                    ) : <div className="text-xs text-zinc-500">Qtd: 1</div>}
                    <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300 hover:bg-red-500/5" onClick={() => removeItem(i.product.id)} data-testid={`cart-remove-${i.product.id}`}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="card-elev p-6 h-fit sticky top-20">
              <div className="heading font-bold mb-4 text-lg">Resumo</div>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between"><span className="text-zinc-400">Subtotal</span><span>{BRL(user ? preview.subtotal : localSubtotal)}</span></div>
                {preview.discount > 0 && <div className="flex justify-between text-emerald-400"><span>Desconto</span><span>- {BRL(preview.discount)}</span></div>}
              </div>
              <div className="relative mb-4">
                <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input data-testid="coupon-input" placeholder="Cupom" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} className="pl-9" />
              </div>
              <div className="border-t border-white/5 pt-3 mb-5">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Total</span>
                  <span className="heading text-2xl font-bold text-blue-400" data-testid="cart-total">{BRL(user ? preview.total : localSubtotal)}</span>
                </div>
              </div>
              <Button data-testid="cart-checkout-btn" onClick={checkout} size="lg" className="w-full rounded-full bg-blue-500 hover:bg-blue-400 btn-glow h-11 font-semibold">
                {user ? "Ir para checkout" : "Entrar e finalizar"} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              {!user && <div className="text-xs text-zinc-500 mt-2 text-center">É necessário estar logado para finalizar.</div>}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
