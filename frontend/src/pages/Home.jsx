import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { LogIn, UserPlus, Shield } from "lucide-react";

const LOGO = "https://customer-assets-39nsmqrw.emergentagent.net/job_digital-marketplace-492/artifacts/4meslmcu_1784720554756.png";

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-10">
      {/* Ambient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.18),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(249,115,22,0.10),transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.4))]" />
      </div>

      <div className="w-full max-w-2xl mx-auto text-center relative">
        {/* Soft halo behind logo */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] max-w-full rounded-full bg-blue-500/10 blur-3xl -z-10" aria-hidden />

        <img
          src={LOGO}
          alt="MARKIMAGEM TV — Ativações e Créditos Streaming"
          className="w-full max-w-md sm:max-w-lg mx-auto mb-10 sm:mb-14 animate-float drop-shadow-[0_20px_60px_rgba(59,130,246,0.35)]"
          data-testid="home-logo"
        />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
          <Link to="/login" className="w-full sm:w-auto">
            <Button
              data-testid="home-login-btn"
              size="lg"
              className="w-full sm:w-auto rounded-full bg-blue-500 hover:bg-blue-400 text-white btn-glow h-12 px-8 font-semibold"
            >
              <LogIn className="w-4 h-4 mr-2" /> Entrar
            </Button>
          </Link>

          <Link to="/cadastro" className="w-full sm:w-auto">
            <Button
              data-testid="home-register-btn"
              size="lg"
              variant="outline"
              className="w-full sm:w-auto rounded-full h-12 px-8 font-semibold border-white/15 hover:bg-white/5"
            >
              <UserPlus className="w-4 h-4 mr-2" /> Criar Conta
            </Button>
          </Link>

          <Link to="/admin/login" className="w-full sm:w-auto">
            <Button
              data-testid="home-admin-btn"
              size="lg"
              variant="ghost"
              className="w-full sm:w-auto rounded-full h-12 px-8 font-semibold text-zinc-400 hover:text-white hover:bg-white/5"
            >
              <Shield className="w-4 h-4 mr-2" /> Painel Administrativo
            </Button>
          </Link>
        </div>

        <div className="text-[11px] uppercase tracking-[0.3em] text-zinc-600 mt-14">
          Ativações • Créditos • Streaming
        </div>
      </div>
    </div>
  );
}
