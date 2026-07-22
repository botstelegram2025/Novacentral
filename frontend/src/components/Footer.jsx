import { Link } from "react-router-dom";
import { Instagram, Facebook, Youtube, MessageCircle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 mt-24 relative" data-testid="site-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <img
            src="https://customer-assets-39nsmqrw.emergentagent.net/job_digital-marketplace-492/artifacts/4meslmcu_1784720554756.png"
            alt="MARKIMAGEM TV"
            className="h-14 w-auto object-contain mb-4"
          />
          <p className="text-sm text-zinc-500 max-w-md leading-relaxed">
            Ativações, créditos e streaming entregues instantaneamente. Pagamento via PIX aprovado em segundos.
          </p>
          <div className="flex gap-3 mt-5">
            <a href="#" className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 grid place-items-center transition-colors" aria-label="Instagram"><Instagram className="w-4 h-4" /></a>
            <a href="#" className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 grid place-items-center transition-colors" aria-label="Facebook"><Facebook className="w-4 h-4" /></a>
            <a href="#" className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 grid place-items-center transition-colors" aria-label="Youtube"><Youtube className="w-4 h-4" /></a>
            <a href="#" className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 grid place-items-center transition-colors" aria-label="WhatsApp"><MessageCircle className="w-4 h-4" /></a>
          </div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4">Loja</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/loja" className="text-zinc-400 hover:text-white">Todos os produtos</Link></li>
            <li><Link to="/promocoes" className="text-zinc-400 hover:text-white">Promoções</Link></li>
            <li><Link to="/loja?kind=activation" className="text-zinc-400 hover:text-white">Ativações</Link></li>
            <li><Link to="/loja?kind=credits" className="text-zinc-400 hover:text-white">Créditos</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4">Conta</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/login" className="text-zinc-400 hover:text-white">Entrar</Link></li>
            <li><Link to="/cadastro" className="text-zinc-400 hover:text-white">Criar Conta</Link></li>
            <li><Link to="/painel" className="text-zinc-400 hover:text-white">Meus Pedidos</Link></li>
            <li><Link to="/admin/login" className="text-zinc-400 hover:text-white">Admin</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 py-6 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} MARKIMAGEM TV — Pagamentos processados via Mercado Pago. Todos os direitos reservados.
      </div>
    </footer>
  );
}
