import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CurrencyState = {
  userId: string | null;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  xp: number;
  noodles: number;
  lumina: number;
  packets: number;
  loading: boolean;
  refresh: () => Promise<void>;
};

const PACKET_MATCH = /packet/i;

/**
 * Single source of truth for the currency counters.
 * Reads from the database and stays live via realtime, so every counter in the
 * app shows the same value the second it changes anywhere.
 */
export function useCurrency(userId: string | null): CurrencyState {
  const [state, setState] = useState({
    displayName: "Player",
    avatarUrl: null as string | null,
    level: 1,
    xp: 0,
    noodles: 0,
    lumina: 0,
    packets: 0,
    loading: true,
  });

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [p, inv] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name,avatar_url,level,xp,noodles,lumina")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.from("inventory_items").select("name,quantity").eq("user_id", userId),
    ]);
    const packets = (inv.data || [])
      .filter((i) => PACKET_MATCH.test(i.name))
      .reduce((sum, i) => sum + (i.quantity || 0), 0);
    setState({
      displayName: p.data?.display_name || "Player",
      avatarUrl: p.data?.avatar_url ?? null,
      level: p.data?.level ?? 1,
      xp: p.data?.xp ?? 0,
      noodles: p.data?.noodles ?? 0,
      lumina: p.data?.lumina ?? 0,
      packets,
      loading: false,
    });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    refresh();
    const channel = supabase
      .channel(`currency-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${userId}` },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_items", filter: `user_id=eq.${userId}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  return { userId, ...state, refresh };
}
