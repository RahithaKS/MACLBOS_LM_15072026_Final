import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Chat } from "@shared/schema";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const redirected = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const { data: chats, isLoading: chatsLoading } = useQuery<Chat[]>({
    queryKey: ["/api/chats"],
  });

  useEffect(() => {
    // Wait until the chats query has settled
    if (chatsLoading) return;
    // Guard against running twice (StrictMode double-invoke / fast navigation)
    if (redirected.current) return;
    redirected.current = true;

    const doRedirect = async () => {
      try {
        // ── Case 1: No chats at all → create a fresh blank one ──────────────
        if (!chats || chats.length === 0) {
          const chat = await apiRequest<Chat>("POST", "/api/chats", {
            title: "New Analysis",
          });
          queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
          setLocation(`/chat/${chat.id}`);
          return;
        }

        // ── Case 2: Check if the most recent chat is still blank ─────────────
        // chats are ordered by createdAt DESC so index 0 is the newest
        const mostRecent = chats[0];
        const { hasMessages } = await apiRequest<{
          hasMessages: boolean;
          messageCount: number;
        }>("GET", `/api/chats/${mostRecent.id}/has-messages`);

        if (!hasMessages) {
          // Reuse it — no new sidebar entry created
          setLocation(`/chat/${mostRecent.id}`);
        } else {
          // ── Case 3: Most recent chat has messages → create a new blank one ──
          const chat = await apiRequest<Chat>("POST", "/api/chats", {
            title: "New Analysis",
          });
          queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
          setLocation(`/chat/${chat.id}`);
        }
      } catch (err) {
        console.error("[Dashboard] Redirect failed:", err);
        // Reset guard so the retry button can try again
        redirected.current = false;
        setError("Something went wrong loading your workspace. Please try again.");
      }
    };

    doRedirect();
  }, [chats, chatsLoading, setLocation]);

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-primary/10">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <p className="text-sm text-destructive">{error}</p>
          <button
            className="text-sm text-primary underline underline-offset-2 hover:text-primary/80"
            onClick={() => {
              setError(null);
              redirected.current = false;
              queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Loading state — visible for ~100–200 ms while the check runs ──────────
  return (
    <div className="h-full flex items-center justify-center bg-primary/10">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}
