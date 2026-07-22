import { Link } from "react-router-dom";
import { BRL } from "../lib/api";
import { Badge } from "../components/ui/badge";
import { Sparkles, Tag as TagIcon } from "lucide-react";

export default function ProductCard({ p }) {
  const price = p.promo_price || p.price;
  const hasPromo = p.promo_price && p.promo_price < p.price;
  return (
    <Link
      to={`/produto/${p.slug || p.id}`}
      data-testid={`product-card-${p.id}`}
      className="group block card-elev overflow-hidden hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1"
    >
      <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-800">
        {p.image ? (
          <img
            src={p.image}
            alt={p.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-zinc-600">
            <Sparkles className="w-10 h-10" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          {p.is_new && <Badge className="bg-emerald-500/90 hover:bg-emerald-500 text-white border-0 text-[10px]">NOVO</Badge>}
          {p.is_promo && hasPromo && <Badge className="bg-red-500/90 hover:bg-red-500 text-white border-0 text-[10px]">-{Math.round(((p.price - p.promo_price) / p.price) * 100)}%</Badge>}
          {p.is_featured && <Badge className="bg-amber-500/90 hover:bg-amber-500 text-white border-0 text-[10px]">DESTAQUE</Badge>}
        </div>
      </div>
      <div className="p-4">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
          {p.category?.kind === "activation" ? "Ativação" : "Créditos"}
        </div>
        <div className="heading font-semibold text-white line-clamp-2 leading-snug mb-2 min-h-[2.5rem]">{p.name}</div>
        <div className="flex items-end justify-between gap-2">
          <div>
            {hasPromo && <div className="text-xs text-zinc-500 line-through">{BRL(p.price)}</div>}
            <div className="heading text-xl font-bold text-blue-400">{BRL(price)}</div>
          </div>
          {p.sold_count > 0 && (
            <div className="text-[10px] text-zinc-500 flex items-center gap-1">
              <TagIcon className="w-3 h-3" /> {p.sold_count} vendidos
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
