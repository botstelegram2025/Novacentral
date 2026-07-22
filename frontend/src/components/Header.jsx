import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useAuth } from "../store/auth";
import { useCart } from "../store/cart";
import { ShoppingCart, User, LogOut, Search, Home, Store, Tag, Bell, Menu, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "../components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "../components/ui/sheet";

export default function Header() {
  const { user, admin, logout } = useAuth();
  const cartCount = useCart((s) => s.count());
  const nav = useNavigate();
  const loc = useLocation();
  const [q, setQ] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const doSearch = (e) => {
    e.preventDefault();
    if (q.trim()) nav(`/loja?q=${encodeURIComponent(q.trim())}`);
  };

  const nav_items = [
    { to: "/", label: "Início", icon: Home },
    { to: "/loja", label: "Loja", icon: Store },
    { to: "/promocoes", label: "Promoções", icon: Tag },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled ? "glass border-b border-white/10" : "bg-transparent"
      }`}
      data-testid="site-header"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 group" data-testid="brand-link">
          <img
            src="https://customer-assets-39nsmqrw.emergentagent.net/job_digital-marketplace-492/artifacts/4meslmcu_1784720554756.png"
            alt="MARKIMAGEM TV"
            className="h-9 sm:h-10 w-auto object-contain group-hover:opacity-90 transition-opacity"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-6">
          {nav_items.map((it) => {
            const active = loc.pathname === it.to || (it.to !== "/" && loc.pathname.startsWith(it.to));
            return (
              <Link
                key={it.to}
                to={it.to}
                data-testid={`nav-${it.label.toLowerCase()}`}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  active ? "text-white bg-white/5" : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>

        <form onSubmit={doSearch} className="hidden lg:flex flex-1 max-w-md ml-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar produto, SKU, categoria..."
              className="pl-9 bg-white/5 border-white/10 focus-visible:ring-blue-500"
              data-testid="header-search-input"
            />
          </div>
        </form>

        <div className="flex-1 lg:hidden" />

        <Link to="/carrinho" className="relative" data-testid="cart-link">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/5">
            <ShoppingCart className="w-5 h-5" />
          </Button>
          {cartCount > 0 && (
            <span data-testid="cart-badge" className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] px-1 text-[11px] font-bold bg-blue-500 text-white rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </Link>

        {user ? (
          <div className="hidden md:flex items-center gap-2">
            <Link to="/painel" data-testid="user-panel-link">
              <Button variant="ghost" className="rounded-full text-sm">
                <User className="w-4 h-4 mr-2" />
                {user.name.split(" ")[0]}
              </Button>
            </Link>
            <Button data-testid="logout-btn" onClick={() => { logout(); nav("/"); }} variant="ghost" size="icon" className="rounded-full text-zinc-400 hover:text-white">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        ) : admin ? (
          <Link to="/admin" data-testid="admin-panel-link">
            <Button variant="secondary" className="rounded-full text-sm">
              Painel Admin
            </Button>
          </Link>
        ) : (
          <div className="hidden md:flex items-center gap-2">
            <Link to="/login"><Button data-testid="header-login-btn" variant="ghost" className="rounded-full text-sm">Entrar</Button></Link>
            <Link to="/cadastro"><Button data-testid="header-register-btn" className="rounded-full text-sm bg-blue-500 hover:bg-blue-400 text-white btn-glow">Criar Conta</Button></Link>
          </div>
        )}

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden rounded-full" data-testid="mobile-menu-btn"><Menu className="w-5 h-5" /></Button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-background border-white/10">
            <div className="flex flex-col gap-3 mt-8">
              {nav_items.map((it) => (
                <Link key={it.to} to={it.to} className="text-lg py-2 border-b border-white/5">{it.label}</Link>
              ))}
              {user ? (
                <>
                  <Link to="/painel" className="text-lg py-2 border-b border-white/5">Minha Conta</Link>
                  <button onClick={() => { logout(); nav("/"); }} className="text-lg py-2 text-red-400 text-left">Sair</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-lg py-2 border-b border-white/5">Entrar</Link>
                  <Link to="/cadastro" className="text-lg py-2 text-blue-400">Criar Conta</Link>
                </>
              )}
              <Link to="/admin/login" className="text-sm mt-4 text-zinc-500">Painel Administrativo</Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
