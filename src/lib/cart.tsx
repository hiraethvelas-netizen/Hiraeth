import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = {
  productId: string;
  variantKey?: string;
  variantDetails?: Record<string, unknown>;
  slug: string;
  name: string;
  price: number;
  image?: string | undefined;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  remove: (productId: string, variantKey?: string) => void;
  setQuantity: (productId: string, quantity: number, variantKey?: string) => void;
  clear: () => void;
  total: number;
  count: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "hiraeth-cart";

function itemKey(item: { productId: string; variantKey?: string | undefined }) {
  return `${item.productId}::${item.variantKey ?? "default"}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore invalid persisted cart */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const add: CartContextValue["add"] = (item, quantity = 1) => {
    setItems((prev) => {
      const key = itemKey(item);
      const existing = prev.find((i) => itemKey(i) === key);
      if (existing) return prev.map((i) => itemKey(i) === key ? { ...i, quantity: i.quantity + quantity } : i);
      return [...prev, { ...item, quantity }];
    });
  };

  const remove = (productId: string, variantKey?: string) =>
    setItems((prev) => prev.filter((i) => itemKey(i) !== itemKey({ productId, variantKey })));

  const setQuantity = (productId: string, quantity: number, variantKey?: string) => {
    if (quantity <= 0) return remove(productId, variantKey);
    setItems((prev) => prev.map((i) => itemKey(i) === itemKey({ productId, variantKey }) ? { ...i, quantity } : i));
  };

  const clear = () => setItems([]);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return <CartContext.Provider value={{ items, add, remove, setQuantity, clear, total, count }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
