import { useState, useEffect, useCallback } from "react";

const KEY = "sigmalab_favourites";

export function useFavourites() {
  const [favs, setFavs] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); }
    catch { return new Set(); }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(Array.from(favs)));
  }, [favs]);

  const toggle = useCallback((name) => {
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }, []);

  const isFav = useCallback((name) => favs.has(name), [favs]);

  return { favs, toggle, isFav };
}
