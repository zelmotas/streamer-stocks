import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ArrowLeft } from "lucide-react";
import { getStreamByLogin } from "@/lib/twitch.functions";
import {
  appendPriceHistory,
  fmtMoney,
  getCash,
  getPortfolio,
  getPriceHistory,
  priceFromViewers,
  setCash,
  setPortfolio,
  setStoredPrices,
  getStoredPrices,
  updateLeaderboard,
  getUsername,
} from "@/lib/game";

export const Route = createFileRoute("/stock/$login")({
  component: StockPage,
});

function StockPage() {
  const { login } = Route.useParams();
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
  const [cash, setCashState] = useState(() => getCash());
  const [holding, setHolding] = useState(() => getPortfolio()[login] ?? { qty: 0, avgCost: 0 });
  const [toast, setToast] = useState<string | null>(null);
  const prevRef = useRef(0);

  useEffect(() => {
    if (!stream) return;
    const p = priceFromViewers(stream.viewer_count);
    appendPriceHistory(login, p);
    setPrice(p);
    setHistory(getPriceHistory()[login] ?? []);
    if (prevRef.current && p !== prevRef.current) {
      setFlash(p > prevRef.current ? "up" : "down");
      setTimeout(() => setFlash(null), 800);
    }
    prevRef.current = p;
    const stored = getStoredPrices();
    stored[login] = p;
    setStoredPrices(stored);
  }, [stream, login]);

  const recordNetWorth = () => {
    const u = getUsername();
    if (!u) return;
    const c = getCash();
    const port = getPortfolio();
    const prices = getStoredPrices();
    let v = 0;
    for (const [k, h] of Object.entries(port)) v += (prices[k] ?? h.avgCost) * h.qty;
    updateLeaderboard({ username: u, cash: c, netWorth: c + v, updatedAt: Date.now() });
  };

  const buy = () => {
    if (!getUsername()) return setToast("Set a username first");
    const cost = price * qty;
    if (cost > cash) return setToast("Not enough StreamBucks");
    const port = getPortfolio();
    const cur = port[login] ?? { qty: 0, avgCost: 0 };
    const newQty = cur.qty + qty;
    const newAvg = (cur.avgCost * cur.qty + cost) / newQty;
    port[login] = { qty: newQty, avgCost: newAvg };
    setPortfolio(port);
    setCash(cash - cost);
    setCashState(cash - cost);
    setHolding(port[login]);
    setToast(`Bought ${qty} share${qty > 1 ? "s" : ""}`);
    recordNetWorth();
  };

  const sell = () => {
    if (holding.qty < qty) return setToast("Not enough shares");
    const port = getPortfolio();
    const cur = port[login];
    const proceeds = price * qty;
    if (cur.qty - qty <= 0) delete port[login];
    else port[login] = { qty: cur.qty - qty, avgCost: cur.avgCost };
    setPortfolio(port);
    setCash(cash + proceeds);
    setCashState(cash + proceeds);
    setHolding(port[login] ?? { qty: 0, avgCost: 0 });
    setToast(`Sold ${qty} share${qty > 1 ? "s" : ""}`);
    recordNetWorth();
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const pct = useMemo(() => {
    if (history.length < 2) return 0;
    const start = history[0].price;
    return ((price - start) / start) * 100;
  }, [history, price]);
  const up = pct >= 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Market
      </Link>

      {!stream ? (
        <div className="h-64 rounded-xl border border-border bg-card animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-4">
              <img src={stream.profile_image_url} alt={stream.user_name} className="h-16 w-16 rounded-full ring-2 ring-brand" />
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold truncate">{stream.user_name}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {stream.type === "live" ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-bear animate-pulse" />
                      <span className="text-bear font-medium">LIVE</span>
                      <span>· {stream.viewer_count.toLocaleString()} viewers</span>
                      <span>· {stream.game_name}</span>
                    </>
                  ) : (
                    <span>Offline</span>
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

            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-2">Recent Price History</h3>
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="grid grid-cols-2 text-xs font-medium bg-secondary px-3 py-2 text-muted-foreground">
                  <span>Time</span>
                  <span className="text-right">Price</span>
                </div>
                <div className="max-h-48 overflow-auto divide-y divide-border">
                  {history.slice().reverse().slice(0, 30).map((p) => (
                    <div key={p.t} className="grid grid-cols-2 px-3 py-1.5 text-sm tabular-nums">
                      <span>{new Date(p.t).toLocaleTimeString()}</span>
                      <span className="text-right">{fmtMoney(p.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 h-fit space-y-4">
            <h2 className="text-lg font-semibold">Trade</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Cash</span><span>{fmtMoney(cash)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shares owned</span><span>{holding.qty}</span></div>
              {holding.qty > 0 && (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">Avg cost</span><span>{fmtMoney(holding.avgCost)}</span></div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">P/L</span>
                    <span className={price >= holding.avgCost ? "text-bull" : "text-bear"}>
                      {fmtMoney((price - holding.avgCost) * holding.qty)}
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
              <button onClick={buy} className="bg-bull text-bull-foreground font-semibold py-2.5 rounded-lg hover:opacity-90 transition">
                Buy
              </button>
              <button onClick={sell} className="bg-bear text-bear-foreground font-semibold py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-40" disabled={holding.qty === 0}>
                Sell
              </button>
            </div>

            {toast && (
              <div className="text-xs text-center text-muted-foreground bg-secondary rounded-lg py-2">{toast}</div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
