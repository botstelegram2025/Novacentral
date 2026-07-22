import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { LayoutDashboard, Package, Grid3x3, ShoppingBag, Users, Ticket, Percent, Image as ImageIcon, MessageSquare, Settings, LineChart, Scroll, LifeBuoy, LogOut, Menu, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import { Toaster } from "sonner";
import { useState } from "react";

const links = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/produtos", label: "Produtos", icon: Package },
  { to: "/admin/categorias", label: "Categorias", icon: Grid3x3 },
  { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { to: "/admin/usuarios", label: "Usuários", icon: Users },
  { to: "/admin/cupons", label: "Cupons", icon: Ticket },
  { to: "/admin/promocoes", label: "Promoções", icon: Percent },
  { to: "/admin/banners", label: "Banners", icon: ImageIcon },
  { to: "/admin/whatsapp", label: "WhatsApp", icon: MessageSquare },
  { to: "/admin/financeiro", label: "Financeiro", icon: LineChart },
  { to: "/admin/tickets", label: "Tickets", icon: LifeBuoy },
  { to: "/admin/logs", label: "Logs", icon: Scroll },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export default function AdminLayout({ children }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { admin, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      <aside className={`${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:sticky top-0 left-0 z-40 w-64 h-screen bg-card border-r border-white/5 transition-transform`} data-testid="admin-sidebar">
        <div className="h-16 px-5 flex items-center gap-2 border-b border-white/5">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 grid place-items-center btn-glow">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="heading font-bold text-sm">Admin Panel</div>
        </div>
        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-64px-70px)]">
          {links.map((l) => {
            const Icon = l.icon;
            const active = l.exact ? loc.pathname === l.to : loc.pathname.startsWith(l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                data-testid={`admin-nav-${l.label.toLowerCase().replace(/\s/g, "-")}`}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
                onClick={() => setOpen(false)}
              >
                <Icon className="w-4 h-4" /> {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/5 p-3">
          <div className="text-xs text-zinc-500 px-3 mb-2">{admin?.name}</div>
          <Button
            data-testid="admin-logout-btn"
            variant="ghost"
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/5"
            onClick={() => { logout(); nav("/admin/login"); }}
          >
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setOpen(false)} />}
      <div className="flex-1 min-w-0">
        <header className="h-16 border-b border-white/5 px-4 md:px-8 flex items-center gap-3 sticky top-0 z-20 bg-background/80 backdrop-blur-xl">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} data-testid="admin-menu-toggle">
            <Menu className="w-5 h-5" />
          </Button>
          <div className="heading font-semibold">Painel Administrativo</div>
        </header>
        <div className="p-4 md:p-8 max-w-[1400px] mx-auto">{children}</div>
      </div>
      <Toaster theme="dark" position="top-right" richColors />
    </div>
  );
}
