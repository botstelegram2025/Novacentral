import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";

export const useCart = create(
  persist(
    (set, get) => ({
      items: [], // { product, quantity, custom_data }
      addItem: (product, quantity = 1, custom_data = {}) => {
        const items = get().items;
        const kind = product?.category?.kind;
        // Regra: não misturar
        if (items.length > 0) {
          const existingKind = items[0].product.category?.kind;
          if (existingKind !== kind) {
            toast.error("Não é possível misturar Produtos de Ativação com Produtos de Créditos.");
            return false;
          }
        }
        // Regra: ativação única
        if (kind === "activation") {
          if (items.find((i) => i.product.id === product.id)) {
            toast.error("Produto de Ativação só pode ser adicionado uma vez.");
            return false;
          }
          if (items.length >= 1) {
            toast.error("Apenas 1 Produto de Ativação por pedido.");
            return false;
          }
          set({ items: [...items, { product, quantity: 1, custom_data }] });
          toast.success("Produto adicionado.");
          return true;
        }
        // Créditos: atualizar se já existe
        const idx = items.findIndex((i) => i.product.id === product.id);
        if (idx >= 0) {
          const copy = [...items];
          copy[idx] = { ...copy[idx], quantity: quantity };
          set({ items: copy });
        } else {
          set({ items: [...items, { product, quantity, custom_data }] });
        }
        toast.success("Produto adicionado.");
        return true;
      },
      updateQty: (productId, quantity) => {
        set({ items: get().items.map((i) => (i.product.id === productId ? { ...i, quantity } : i)) });
      },
      updateCustom: (productId, custom_data) => {
        set({ items: get().items.map((i) => (i.product.id === productId ? { ...i, custom_data } : i)) });
      },
      removeItem: (productId) => set({ items: get().items.filter((i) => i.product.id !== productId) }),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((a, i) => a + Number(i.quantity || 0), 0),
    }),
    { name: "ds-cart" }
  )
);
