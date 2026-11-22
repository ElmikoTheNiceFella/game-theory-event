"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { getResults, serverNow, type Results } from "@/app/actions";
import type { Game, Participant, Team } from "./types";

export type GameState = { game: Game | null; teams: Team[]; participants: Participant[] };

/** Live public state. Refetches everything on any change, on (re)subscribe and when the tab wakes up. */
export function useGame() {
  const [state, setState] = useState<GameState>({ game: null, teams: [], participants: [] });

  const load = useCallback(async () => {
    const [g, t, p] = await Promise.all([
      supabase.from("game").select("*").eq("id", 1).single(),
      supabase.from("teams").select("*").order("created_at"),
      supabase.from("participants").select("id, name, team_id").order("created_at"),
    ]);
    if (g.data) setState({ game: g.data as Game, teams: (t.data ?? []) as Team[], participants: (p.data ?? []) as Participant[] });
  }, []);

  useEffect(() => {
    const ch = supabase
      .channel("event")
      .on("postgres_changes", { event: "*", schema: "public", table: "game" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "participants" }, load)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") load();
      });
    const onWake = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    // shortcut: 15s safety poll in case a realtime event is dropped; fine for ~20 clients
    const poll = setInterval(load, 15000);
    return () => {
      supabase.removeChannel(ch);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      clearInterval(poll);
    };
  }, [load]);

  return { ...state, reload: load };
}

/** Milliseconds left in the current timed phase, corrected for this device's clock skew. */
export function useRemaining(game: Game | null) {
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t0 = Date.now();
    serverNow().then((s) => setOffset(s - (t0 + Date.now()) / 2));
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  if (!game) return null;
  if (game.paused_remaining_ms !== null) return game.paused_remaining_ms;
  if (!game.phase_ends_at) return null;
  return Math.max(0, new Date(game.phase_ends_at).getTime() - (now + offset));
}

/** Public results (standings + reveal), refetched whenever the game moves to a stage that shows them. */
export function useResults(game: Game | null) {
  const [results, setResults] = useState<Results | null>(null);
  const phase = game?.phase,
    stage = game?.stage,
    extra = game?.show_extra;
  useEffect(() => {
    if (!stage) return;
    if (["reveal", "leaderboard", "finale", "final"].includes(stage) || extra) getResults().then(setResults);
  }, [phase, stage, extra]);
  return results;
}
