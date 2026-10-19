"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Re-renders the page when a claim, score entry or chore changes, so nobody has to reload by hand.
// Also refreshes when the tab comes back to the front, in case the connection dropped while it was hidden.
export function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 300); // several rows can change at once (accept all)
    };
    const channel = supabase
      .channel("live")
      .on("postgres_changes", { event: "*", schema: "public", table: "claim" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "score_entry" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "chore_instance" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "spend_entry" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "budget_category" }, refresh)
      .subscribe();
    const onVisible = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [router]);
  return null;
}
