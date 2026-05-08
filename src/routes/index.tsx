import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTopStreams } from "@/lib/twitch.functions";
import { StreamerCard } from "@/components/StreamerCard";
import { setStoredPrices, priceFromViewers, getStoredPrices } from "@/lib/game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StreamStocks — Trade Twitch streamers in real time" },
      {
        name: "description",
        content:
          "Buy and sell shares of your favorite Twitch streamers. Stock prices move with live viewer counts.",
      },
      { property: "og:title", content: "StreamStocks — Trade Twitch streamers" },
      { property: "og:description", content: "Real-time fake stock market for Twitch streamers." },
    ],
  }),
  component: Market,
});

const CATEGORIES = [
  { id: "509658", name: "Just Chatting" },
  { id: "32982", name: "Grand Theft Auto V" },
  { id: "21779", name: "League of Legends" },
  { id: "32399", name: "Counter-Strike" },
  { id: "27471", name: "Minecraft" },
  { id: "26936", name: "Music" },
  { id: "509672", name: "IRL" },
  { id: "", name: "All Categories" },
];

function Market() {
  const fetchStreams = useServerFn(getTopStreams);
  const [gameId, setGameId] = useState("509658");
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["streams", gameId],
    queryFn: () => fetchStreams({ data: { gameId } }),
    refetchInterval: 60_000,
  });

  // Store latest prices for portfolio valuation
  useEffect(() => {
    if (!data) return;
    const stored = getStoredPrices();
    for (const s of data) {
      stored[s.user_login] = priceFromViewers(s.viewer_count);
    }
    setStoredPrices(stored);
  }, [data]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Market</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Top 20 streamers by viewer count · prices update every 60s
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isFetching && <span className="text-xs text-muted-foreground">Refreshing…</span>}
          <select
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            className="bg-input border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data?.map((s) => <StreamerCard key={s.user_id} stream={s} />)}
        </div>
      )}
    </main>
  );
}
