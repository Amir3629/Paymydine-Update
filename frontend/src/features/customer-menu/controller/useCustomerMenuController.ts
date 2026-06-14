
import { useState, useEffect, useMemo } from "react";

/**
 * Single source of truth for Customer Menu page state
 * - cart
 * - theme
 * - menu data
 * - modals
 */

export function useCustomerMenuController() {
  const [items, setItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [theme, setTheme] = useState<string>("kazen");
  const [loading, setLoading] = useState(true);

  const [activeItem, setActiveItem] = useState<any | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const res = await fetch("/api/v1/menu");
        const json = await res.json();

        const list = json?.data?.items || json?.items || [];
        setItems(list);

      } catch (e) {
        console.error("menu load failed", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  function addToCart(item: any) {
    setCart((prev) => [...prev, item]);
  }

  function removeFromCart(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  return {
    state: {
      items,
      cart,
      theme,
      loading,
      activeItem,
      cartOpen
    },
    actions: {
      setTheme,
      setActiveItem,
      setCartOpen,
      addToCart,
      removeFromCart
    }
  };
}
