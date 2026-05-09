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

type SortKey = "viewers_desc" | "viewers_asc" | "price_desc" | "price_asc" | "name_asc";

function Market() {
  const fetchStreams = useServerFn(getTopStreams);
  const [gameId, setGameId] = useState("509658");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("viewers_desc");
  const [minViewers, setMinViewers] = useState(0);
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

  const filtered = (data ?? [])
    .filter((s) => {
      if (s.viewer_count < minViewers) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        s.user_name.toLowerCase().includes(q) ||
        s.user_login.toLowerCase().includes(q) ||
        s.game_name.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      switch (sort) {
        case "viewers_asc": return a.viewer_count - b.viewer_count;
        case "price_desc": return priceFromViewers(b.viewer_count) - priceFromViewers(a.viewer_count);
        case "price_asc": return priceFromViewers(a.viewer_count) - priceFromViewers(b.viewer_count);
        case "name_asc": return a.user_name.localeCompare(b.user_name);
        default: return b.viewer_count - a.viewer_count;
      }
    });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Market</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Top 50 streamers by viewer count · prices update every 60s
          </p>
        </div>
        {isFetching && <span className="text-xs text-muted-foreground">Refreshing…</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search streamer or game…"
          className="md:col-span-5 bg-input border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
          className="md:col-span-3 bg-input border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="md:col-span-2 bg-input border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="viewers_desc">Viewers ↓</option>
          <option value="viewers_asc">Viewers ↑</option>
          <option value="price_desc">Price ↓</option>
          <option value="price_asc">Price ↑</option>
          <option value="name_asc">Name A–Z</option>
        </select>
        <select
          value={minViewers}
          onChange={(e) => setMinViewers(Number(e.target.value))}
          className="md:col-span-2 bg-input border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value={0}>Any size</option>
          <option value={1000}>1k+ viewers</option>
          <option value={10000}>10k+ viewers</option>
          <option value={50000}>50k+ viewers</option>
        </select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">No streamers match your filters.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((s) => <StreamerCard key={s.user_id} stream={s} />)}
        </div>
      )}
    </main>
  );
}
