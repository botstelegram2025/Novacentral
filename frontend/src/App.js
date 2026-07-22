import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "@/App.css";
import { useAuth } from "@/store/auth";

import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import Store from "@/pages/Store";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Promotions from "@/pages/Promotions";

import UserDashboard from "@/pages/UserDashboard";
import UserOrders from "@/pages/UserOrders";
import UserProfile from "@/pages/UserProfile";
import UserNotifications from "@/pages/UserNotifications";
import UserFavorites from "@/pages/UserFavorites";
import UserSupport from "@/pages/UserSupport";

import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminProducts from "@/pages/AdminProducts";
import AdminCategories from "@/pages/AdminCategories";
import AdminOrders from "@/pages/AdminOrders";
import AdminUsers from "@/pages/AdminUsers";
import AdminCoupons from "@/pages/AdminCoupons";
import AdminPromotions from "@/pages/AdminPromotions";
import AdminBanners from "@/pages/AdminBanners";
import AdminWhatsapp from "@/pages/AdminWhatsapp";
import AdminFinance from "@/pages/AdminFinance";
import AdminSettings from "@/pages/AdminSettings";
import AdminLogs from "@/pages/AdminLogs";
import AdminTickets from "@/pages/AdminTickets";

function RequireAdmin({ children }) {
  const admin = useAuth((s) => s.admin);
  if (!admin) return <Navigate to="/admin/login" replace />;
  return children;
}

function App() {
  const refreshMe = useAuth((s) => s.refreshMe);
  useEffect(() => { refreshMe(); }, [refreshMe]);

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Register />} />
          <Route path="/recuperar-senha" element={<ForgotPassword />} />
          <Route path="/loja" element={<Store />} />
          <Route path="/produto/:id" element={<ProductDetail />} />
          <Route path="/carrinho" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/promocoes" element={<Promotions />} />

          <Route path="/painel" element={<UserDashboard />} />
          <Route path="/painel/pedidos" element={<UserOrders />} />
          <Route path="/painel/perfil" element={<UserProfile />} />
          <Route path="/painel/notificacoes" element={<UserNotifications />} />
          <Route path="/painel/favoritos" element={<UserFavorites />} />
          <Route path="/painel/suporte" element={<UserSupport />} />

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
          <Route path="/admin/produtos" element={<RequireAdmin><AdminProducts /></RequireAdmin>} />
          <Route path="/admin/categorias" element={<RequireAdmin><AdminCategories /></RequireAdmin>} />
          <Route path="/admin/pedidos" element={<RequireAdmin><AdminOrders /></RequireAdmin>} />
          <Route path="/admin/usuarios" element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
          <Route path="/admin/cupons" element={<RequireAdmin><AdminCoupons /></RequireAdmin>} />
          <Route path="/admin/promocoes" element={<RequireAdmin><AdminPromotions /></RequireAdmin>} />
          <Route path="/admin/banners" element={<RequireAdmin><AdminBanners /></RequireAdmin>} />
          <Route path="/admin/whatsapp" element={<RequireAdmin><AdminWhatsapp /></RequireAdmin>} />
          <Route path="/admin/financeiro" element={<RequireAdmin><AdminFinance /></RequireAdmin>} />
          <Route path="/admin/tickets" element={<RequireAdmin><AdminTickets /></RequireAdmin>} />
          <Route path="/admin/logs" element={<RequireAdmin><AdminLogs /></RequireAdmin>} />
          <Route path="/admin/configuracoes" element={<RequireAdmin><AdminSettings /></RequireAdmin>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
