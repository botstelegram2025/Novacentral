import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useCart } from "../store/cart";
import { useAuth } from "../store/auth";
import { api, BRL } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Copy, Clock, ShieldCheck } from "lucide-react";

export default function Checkout() {
  const { user } = useAuth();
  const { items, clear } = useCart();
  const nav = useNavigate();
  const [preview, setPreview] = useState(null);
  const [order, setOrder] = useState(null);
  const [coupon, setCoupon] = useState("");
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!user) return nav("/login");
    if (items.length === 0) return nav("/carrinho");
    api.post("/orders/preview", {
      items: items.map(i => ({ product_id: i.product.id, quantity: i.quantity, custom_data: i.custom_data || {} })),
      coupon_code: coupon || undefined,
    }).then(r => setPreview(r.data)).catch(err => toast.error(err?.response?.data?.detail || "Erro"));
    // eslint-disable-next-line
  }, [coupon]);

  const generatePix = async () => {
    setProcessing(true);
    try {
      const r = await api.post("/orders/create", {
        items: items.map(i => ({ product_id: i.product.id, quantity: i.quantity, custom_data: i.custom_data || {} })),
        coupon_code: coupon || undefined,
      });
      if (!r.data.pix_qr_code) {
        toast.error("Mercado Pago não configurado. Aguarde configuração do administrador.");
        setOrder(r.data);
      } else {
        setOrder(r.data);
        toast.success("PIX gerado! Escaneie o QR code.");
        startPolling(r.data.id);
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Falha ao gerar PIX");
    } finally { setProcessing(false); }
  };

  const startPolling = (oid) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await api.post(`/orders/${oid}/check-payment`);
        if (r.data.status === "paid" || r.data.status === "completed") {
          setPaid(true);
          clearInterval(pollRef.current);
          toast.success("Pagamento aprovado!");
          clear();
          setTimeout(() => nav(`/painel/pedidos`), 3000);
        }
      } catch {}
    }, 4000);
  };

  useEffect(() => () => pollRef.current && clearInterval(pollRef.current), []);

  const copyPix = () => {
    if (order?.pix_qr_code) {
      navigator.clipboard.writeText(order.pix_qr_code);
      toast.success("Código PIX copiado!");
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
        <h1 className="heading text-3xl font-bold mb-8">Checkout</h1>
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <div className="card-elev p-6">
              <div className="heading font-bold mb-4">Resumo do pedido</div>
              <div className="space-y-2 mb-4">
                {items.map((i) => (
                  <div key={i.product.id} className="flex justify-between text-sm">
                    <span className="text-zinc-400">{i.product.name} × {i.quantity}</span>
                    <span>{BRL((i.product.promo_price || i.product.price) * i.quantity)}</span>
                  </div>
                ))}
              </div>
              {preview && (
                <div className="border-t border-white/5 pt-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-zinc-400">Subtotal</span><span>{BRL(preview.subtotal)}</span></div>
                  {preview.discount > 0 && <div className="flex justify-between text-emerald-400"><span>Desconto</span><span>- {BRL(preview.discount)}</span></div>}
                  <div className="flex justify-between font-bold text-lg pt-2"><span>Total</span><span className="text-blue-400">{BRL(preview.total)}</span></div>
                </div>
              )}
            </div>
            <div className="card-elev p-6">
              <div className="heading font-bold mb-3">Cliente</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-zinc-500 text-xs">Nome</div><div>{user?.name}</div></div>
                <div><div className="text-zinc-500 text-xs">CPF</div><div className="mono">{user?.cpf}</div></div>
                <div><div className="text-zinc-500 text-xs">WhatsApp</div><div className="mono">{user?.ddi} {user?.ddd} {user?.phone}</div></div>
                <div><div className="text-zinc-500 text-xs">Email</div><div>{user?.email || "—"}</div></div>
              </div>
            </div>
            <div className="card-elev p-6">
              <div className="heading font-bold mb-3">Cupom de desconto</div>
              <Input data-testid="checkout-coupon-input" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="DIGITE SEU CUPOM" />
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="card-elev p-6 sticky top-20">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-400 mb-4">
                <ShieldCheck className="w-4 h-4" /> Pagamento via PIX
              </div>
              {!order ? (
                <>
                  <div className="text-3xl font-bold heading text-blue-400 mb-6">{BRL(preview?.total || 0)}</div>
                  <Button data-testid="checkout-generate-pix-btn" onClick={generatePix} disabled={processing || !preview} size="lg" className="w-full rounded-full bg-blue-500 hover:bg-blue-400 h-12 btn-glow font-semibold">
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gerar PIX"}
                  </Button>
                  <div className="text-xs text-zinc-500 mt-3">Você receberá o QR Code + código copia e cola após clicar em Gerar PIX.</div>
                </>
              ) : paid ? (
                <div className="text-center py-6">
                  <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-3" />
                  <div className="heading font-bold text-xl mb-1">Pagamento aprovado!</div>
                  <div className="text-sm text-zinc-400">Redirecionando aos seus pedidos...</div>
                </div>
              ) : (
                <div className="text-center">
                  {order.pix_qr_base64 ? (
                    <div className="bg-white p-4 rounded-xl inline-block mb-4">
                      <img src={`data:image/png;base64,${order.pix_qr_base64}`} alt="PIX QR" className="w-56 h-56" data-testid="pix-qr-image" />
                    </div>
                  ) : (
                    <div className="p-6 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-sm mb-4">
                      Pedido criado, mas Mercado Pago ainda não foi configurado no ambiente. Configure MERCADOPAGO_ACCESS_TOKEN.
                    </div>
                  )}
                  {order.pix_qr_code && (
                    <div className="text-left">
                      <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">PIX Copia e Cola</div>
                      <div className="mono text-xs bg-black/40 p-3 rounded border border-white/5 break-all mb-3 max-h-24 overflow-y-auto" data-testid="pix-copy-paste">
                        {order.pix_qr_code}
                      </div>
                      <Button data-testid="pix-copy-btn" onClick={copyPix} variant="outline" className="w-full rounded-full">
                        <Copy className="w-4 h-4 mr-2" /> Copiar código
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-2 text-sm text-zinc-400 mt-4">
                    <Clock className="w-4 h-4 animate-pulse" /> Aguardando pagamento...
                  </div>
                  <div className="text-xs text-zinc-500 mt-2">Verificamos automaticamente a cada 4 segundos.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
