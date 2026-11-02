import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CartItem = {
  productId: string;
  categoryId?: string | null;
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

type ScopedCart = {
  userId: string | null;
  ready: boolean;
  items: CartItem[];
};

const CartContext = createContext<CartContextValue | null>(null);

// The old unscoped "hiraeth-cart" key was shared by every account that signed
// into the same browser. Never read or migrate it: its real owner is unknown.
const keyForUser = (userId: string) => `hiraeth-cart:v2:${userId}`;

function itemKey(item: { productId: string; variantKey?: string | undefined }) {
  return `${item.productId}::${item.variantKey ?? "default"}`;
}

function readCart(userId: string): CartItem[] {
  try {
    const stored = window.localStorage.getItem(keyForUser(userId));
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is CartItem =>
      typeof row === "object" && row !== null &&
      typeof row.productId === "string" &&
      typeof row.slug === "string" &&
      typeof row.name === "string" &&
      typeof row.price === "number" && Number.isFinite(row.price) && row.price >= 0 &&
      Number.isSafeInteger(row.quantity) && row.quantity > 0);
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<ScopedCart>({ userId: null, ready: false, items: [] });

  useEffect(() => {
    let active = true;
    let authEventArrived = false;

    const switchAccount = (userId: string | null) => {
      if (!active) return;
      setCart(previous => {
        if (previous.ready && previous.userId === userId) return previous;
        return { userId, ready: true, items: userId ? readCart(userId) : [] };
      });
    };

    // The auth event also handles changing between admin and customer without
    // refreshing. Never keep the previous account's items after a sign-out.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventArrived = true;
      switchAccount(session?.user?.id ?? null);
    });

    void supabase.auth.getUser()
      .then(({ data, error }) => {
        if (!authEventArrived) switchAccount(error ? null : data.user?.id ?? null);
      })
      .catch(() => {
        if (!authEventArrived) switchAccount(null);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!cart.ready || !cart.userId) return;
    try {
      window.localStorage.setItem(keyForUser(cart.userId), JSON.stringify(cart.items));
    } catch {
      // A full or disabled browser storage must not break the live cart.
    }
  }, [cart]);

  const add: CartContextValue["add"] = (item, quantity = 1) => {
    if (!Number.isSafeInteger(quantity) || quantity <= 0) return;
    setCart(previous => {
      if (!previous.ready) return previous;
      const key = itemKey(item);
      const existing = previous.items.find(current => itemKey(current) === key);
      const items = existing
        ? previous.items.map(current => itemKey(current) === key
          ? { ...current, quantity: current.quantity + quantity } : current)
        : [...previous.items, { ...item, quantity }];
      return { ...previous, items };
    });
  };

  const remove = (productId: string, variantKey?: string) =>
    setCart(previous => ({ ...previous, items: previous.items.filter(item =>
      itemKey(item) !== itemKey({ productId, variantKey })) }));

  const setQuantity = (productId: string, quantity: number, variantKey?: string) => {
    if (quantity <= 0) return remove(productId, variantKey);
    if (!Number.isSafeInteger(quantity)) return;
    setCart(previous => ({ ...previous, items: previous.items.map(item =>
      itemKey(item) === itemKey({ productId, variantKey }) ? { ...item, quantity } : item) }));
  };

  const clear = () => setCart(previous => ({ ...previous, items: [] }));
  const items = cart.items;
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return <CartContext.Provider value={{ items, add, remove, setQuantity, clear, total, count }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
