import { useEffect, useState } from "react";
import { UserPanelLayout } from "./UserDashboard";
import ProductCard from "../components/ProductCard";
import { api } from "../lib/api";
import { Heart } from "lucide-react";

export default function UserFavorites() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/users/me/favorites").then(r => setItems(r.data)); }, []);
  return (
    <UserPanelLayout>
      <h1 className="heading text-2xl font-bold mb-6">Favoritos</h1>
      {items.length === 0 ? <div className="card-elev p-10 text-center text-zinc-500"><Heart className="w-8 h-8 mx-auto mb-2" />Nenhum favorito ainda.</div> :
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{items.map(p => <ProductCard key={p.id} p={p} />)}</div>}
    </UserPanelLayout>
  );
}
