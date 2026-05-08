import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ArrowLeft } from "lucide-react";
import { getStreamByLogin } from "@/lib/twitch.functions";
import {
  appendPriceHistory,
  fmtMoney,
  getPriceHistory,
  priceFromViewers,
  setStoredPrice,
} from "@/lib/game";
import { useAuth } from "@/hooks/use-auth";
import { buyShares, getHolding, sellShares, updateNetWorth, type DbHolding } from "@/lib/trading";

export const Route = createFileRoute("/stock/$login")({
  component: StockPage,
});

function StockPage() {
  const { login } = Route.useParams();
  const nav = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const fetchStream = useServerFn(getStreamByLogin);
  const { data: stream } = useQuery({
    queryKey: ["stream", login],
    queryFn: () => fetchStream({ data: { login } }),
    refetchInterval: 60_000,
  });

  const [price, setPrice] = useState<number>(0);
  const [history, setHistory] = useState(() => getPriceHistory()[login] ?? []);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const [qty, setQty] = useState(1);
  const [holding, setHolding] = useState<DbHolding | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const prevRef = useRef(0);
  const autoSoldRef = useRef(false);

  // load holding
  useEffect(() => {
    if (!user) return setHolding(null);
    getHolding(user.id, login).then(setHolding);
  }, [user, login]);

  // refresh price when stream data changes
  useEffect(() => {
    if (!stream) return;
    if (stream.type !== "live") {
      // offline → keep last known price flat
      return;
    }
    const p = priceFromViewers(stream.viewer_count);
    appendPriceHistory(login, p);
    setPrice(p);
    setHistory(getPriceHistory()[login] ?? []);
    if (prevRef.current && p !== prevRef.current) {
      setFlash(p > prevRef.current ? "up" : "down");
      setTimeout(() => setFlash(null), 800);
    }
    prevRef.current = p;
    setStoredPrice(login, p);
  }, [stream, login]);

  // auto-sell on offline
  useEffect(() => {
    const run = async () => {
      if (!stream || !user || !profile || !holding || holding.qty <= 0) return;
      if (stream.type === "live") return;
      if (autoSoldRef.current) return;
      autoSoldRef.current = true;

      // sell at avg cost (or last known price if available)
      const sellPrice = price > 0 ? price : holding.avg_cost;
      const res = await sellShares({
        userId: user.id,
        login,
        qty: holding.qty,
        price: sellPrice,
        cash: profile.cash,
      });
      if (res.ok) {
        setHolding(null);
        await refreshProfile();
        setToast(`${stream.user_name} went offline — auto-sold ${holding.qty} share${holding.qty > 1 ? "s" : ""} for ${fmtMoney(res.proceeds)}`);
      }
    };
    run();
  }, [stream, user, profile, holding, login, price, refreshProfile]);

  const buy = async () => {
    if (!user || !profile) {
      nav({ to: "/auth" });
      return;
    }
    if (!stream || stream.type !== "live") return setToast("Streamer is offline");
    setBusy(true);
    const res = await buyShares({ userId: user.id, login, qty, price, cash: profile.cash });
    setBusy(false);
    if (!res.ok) return setToast(res.error);
    setHolding(res.holding);
    await refreshProfile();
    setToast(`Bought ${qty} share${qty > 1 ? "s" : ""}`);
    if (user) updateNetWorth(user.id, res.cash + res.holding.qty * price);
  };

  const sell = async () => {
    if (!user || !profile || !holding) return;
    if (holding.qty < qty) return setToast("Not enough shares");
    setBusy(true);
    const res = await sellShares({ userId: user.id, login, qty, price, cash: profile.cash });
    setBusy(false);
    if (!res.ok) return setToast(res.error);
    setHolding(res.holding);
    await refreshProfile();
    setToast(`Sold ${qty} share${qty > 1 ? "s" : ""}`);
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Tick every second so the warmup countdown updates
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const WARMUP_MS = 5 * 60 * 1000;
  const liveSinceMs =
    stream?.type === "live" && stream.started_at ? new Date(stream.started_at).getTime() : 0;
  const warmupRemainingMs = liveSinceMs ? Math.max(0, WARMUP_MS - (now - liveSinceMs)) : 0;
  const inWarmup = warmupRemainingMs > 0;

  const pct = useMemo(() => {
    if (history.length < 2) return 0;
    const start = history[0].price;
    return ((price - start) / start) * 100;
  }, [history, price]);
  const up = pct >= 0;

  const parentDomain =
    typeof window !== "undefined" ? window.location.hostname : "lovable.app";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Market
      </Link>

      {!stream ? (
        <div className="h-64 rounded-xl border border-border bg-card animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-4">
                <img src={stream.profile_image_url} alt={stream.user_name} className="h-16 w-16 rounded-full ring-2 ring-brand" />
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-bold truncate">{stream.user_name}</h1>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                    {stream.type === "live" ? (
                      <>
                        <span className="h-2 w-2 rounded-full bg-bear animate-pulse" />
                        <span className="text-bear font-medium">LIVE</span>
                        <span>· {stream.viewer_count.toLocaleString()} viewers</span>
                        <span>· {stream.game_name}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Offline</span>
                    )}
                  </div>
                </div>
                <div className={`text-right ${flash === "up" ? "flash-up" : flash === "down" ? "flash-down" : ""} rounded-md px-2`}>
                  <div className="text-3xl font-bold tabular-nums">{fmtMoney(price)}</div>
                  <div className={`text-sm font-medium ${up ? "text-bull" : "text-bear"}`}>
                    {up ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Twitch embed */}
              <div className="mt-6 aspect-video rounded-xl overflow-hidden border border-border bg-black">
                {stream.type === "live" ? (
                  <iframe
                    title={`${stream.user_name} live stream`}
                    src={`https://player.twitch.tv/?channel=${encodeURIComponent(login)}&parent=${encodeURIComponent(parentDomain)}&muted=true`}
                    allowFullScreen
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-muted-foreground text-sm">
                    Stream is offline
                  </div>
                )}
              </div>

              <div className="h-72 mt-6">
                {history.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="gx" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={up ? "var(--bull)" : "var(--bear)"} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={up ? "var(--bull)" : "var(--bear)"} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="t"
                        tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                      />
                      <YAxis
                        domain={["auto", "auto"]}
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickFormatter={(v) => `SB ${v.toFixed(0)}`}
                      />
                      <Tooltip
                        contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                        labelFormatter={(t) => new Date(t).toLocaleTimeString()}
                        formatter={(v: number) => fmtMoney(v)}
                      />
                      <Area type="monotone" dataKey="price" stroke={up ? "var(--bull)" : "var(--bear)"} strokeWidth={2} fill="url(#gx)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full grid place-items-center text-sm text-muted-foreground">
                    Building price history… check back in a minute.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 h-fit space-y-4">
            <h2 className="text-lg font-semibold">Trade</h2>
            {!user ? (
              <div className="text-sm text-muted-foreground">
                <Link to="/auth" className="text-brand underline">Sign in</Link> to start trading.
              </div>
            ) : (
              <>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Cash</span><span>{fmtMoney(profile?.cash ?? 0)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Shares owned</span><span>{holding?.qty ?? 0}</span></div>
                  {holding && holding.qty > 0 && (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">Avg cost</span><span>{fmtMoney(holding.avg_cost)}</span></div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">P/L</span>
                        <span className={price >= holding.avg_cost ? "text-bull" : "text-bear"}>
                          {fmtMoney((price - holding.avg_cost) * holding.qty)}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="mt-1 w-full bg-input border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                  />
                  <div className="text-xs text-muted-foreground mt-1">Total: {fmtMoney(price * qty)}</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={buy}
                    disabled={busy || stream.type !== "live"}
                    className="bg-bull text-bull-foreground font-semibold py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-40"
                  >
                    Buy
                  </button>
                  <button
                    onClick={sell}
                    disabled={busy || !holding || holding.qty === 0}
                    className="bg-bear text-bear-foreground font-semibold py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-40"
                  >
                    Sell
                  </button>
                </div>

                {stream.type !== "live" && (
                  <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg py-2 px-3">
                    Trading is paused while {stream.user_name} is offline. Any open position is auto-sold.
                  </div>
                )}
              </>
            )}

            {toast && (
              <div className="text-xs text-center text-muted-foreground bg-secondary rounded-lg py-2 px-3">{toast}</div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
