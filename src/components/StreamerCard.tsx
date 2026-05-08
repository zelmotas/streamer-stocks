import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import type { TwitchStream } from "@/lib/twitch.functions";
import { appendPriceHistory, fmtMoney, getPriceHistory, priceFromViewers } from "@/lib/game";

export function StreamerCard({ stream }: { stream: TwitchStream }) {
  const [price, setPrice] = useState<number>(() => priceFromViewers(stream.viewer_count));
  const [history, setHistory] = useState(() => getPriceHistory()[stream.user_login] ?? []);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevRef = useRef(price);

  useEffect(() => {
    const newPrice = priceFromViewers(stream.viewer_count);
    appendPriceHistory(stream.user_login, newPrice);
    setPrice(newPrice);
    setHistory(getPriceHistory()[stream.user_login] ?? []);
    if (newPrice > prevRef.current) setFlash("up");
    else if (newPrice < prevRef.current) setFlash("down");
    prevRef.current = newPrice;
    const t = setTimeout(() => setFlash(null), 800);
    return () => clearTimeout(t);
  }, [stream.viewer_count, stream.user_login]);

  // % change last 5 min
  const cutoff = Date.now() - 5 * 60 * 1000;
  const recent = history.filter((p) => p.t >= cutoff);
  const startPrice = recent[0]?.price ?? price;
  const pct = ((price - startPrice) / startPrice) * 100;
  const up = pct >= 0;

  return (
    <Link
      to="/stock/$login"
      params={{ login: stream.user_login }}
      className={`group rounded-xl border border-border bg-card p-4 hover:border-brand/60 transition-all hover:shadow-lg hover:shadow-brand/10 ${
        flash === "up" ? "flash-up" : flash === "down" ? "flash-down" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <img
          src={stream.profile_image_url}
          alt={stream.user_name}
          className="h-12 w-12 rounded-full ring-2 ring-bear"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{stream.user_name}</div>
          <div className="text-xs text-muted-foreground truncate">{stream.game_name}</div>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="h-2 w-2 rounded-full bg-bear animate-pulse" />
          <span className="text-muted-foreground">{stream.viewer_count.toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="text-xl font-bold tabular-nums">{fmtMoney(price)}</div>
          <div className={`text-xs font-medium ${up ? "text-bull" : "text-bear"}`}>
            {up ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
          </div>
        </div>
        <div className="h-12 w-24">
          {history.length > 1 && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <YAxis hide domain={["dataMin", "dataMax"]} />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={up ? "var(--bull)" : "var(--bear)"}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </Link>
  );
}
