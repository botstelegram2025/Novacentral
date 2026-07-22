import Header from "./Header";
import Footer from "./Footer";
import { Toaster } from "sonner";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col relative">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <Toaster theme="dark" position="bottom-right" richColors closeButton />
    </div>
  );
}
