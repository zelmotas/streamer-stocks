import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { fmtMoney, fmtShares, getStoredPrices } from "@/lib/game";
import { useAuth } from "@/hooks/use-auth";
import { fetchHoldings, updateNetWorth, type DbHolding } from "@/lib/trading";

export const Route = createFileRoute("/portfolio")({
  head: () => ({ meta: [{ title: "Portfolio · StreamStocks" }] }),
  component: PortfolioPage,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function PortfolioPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [holdings, setHoldings] = useState<DbHolding[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});

  const reload = useCallback(async () => {
    if (!user) return;
    const h = await fetchHoldings(user.id);
    setHoldings(h);
    setPrices(getStoredPrices());
  }, [user]);

  useEffect(() => {
    reload();
    const i = setInterval(() => {
      setPrices(getStoredPrices());
    }, 2000);
    const r = setInterval(reload, 8000);
    return () => {
      clearInterval(i);
      clearInterval(r);
    };
  }, [reload]);

  const cash = profile?.cash ?? 0;
  const rows = holdings.map((h) => ({
    login: h.streamer_login,
    qty: h.qty,
    avgCost: h.avg_cost,
    price: prices[h.streamer_login] ?? h.avg_cost,
  }));
  const stockValue = rows.reduce((a, r) => a + r.price * r.qty, 0);
  const total = cash + stockValue;
  const pieData = rows.map((r) => ({ name: r.login, value: r.price * r.qty }));
  if (cash > 0) pieData.push({ name: "Cash", value: cash });

  // Periodically sync net worth
  useEffect(() => {
    if (!user || !profile) return;
    updateNetWorth(user.id, total).then(refreshProfile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.round(total * 100)]);

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">Sign in to view your portfolio</h1>
        <Link to="/auth" className="text-brand underline">Create an account</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Your Portfolio</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Stat label="Net Worth" value={fmtMoney(total)} accent="text-bull" />
        <Stat label="Cash" value={fmtMoney(cash)} />
        <Stat label="Stock Value" value={fmtMoney(stockValue)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border font-semibold">Holdings</div>
          {rows.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              No holdings yet. <Link to="/" className="text-brand underline">Browse the market</Link>.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Streamer</th>
                  <th className="text-right px-4 py-3">Qty</th>
                  <th className="text-right px-4 py-3">Avg Cost</th>
                  <th className="text-right px-4 py-3">Price</th>
                  <th className="text-right px-4 py-3">Value</th>
                  <th className="text-right px-4 py-3">P/L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const pl = (r.price - r.avgCost) * r.qty;
                  const up = pl >= 0;
                  return (
                    <tr key={r.login} className="hover:bg-secondary/50">
                      <td className="px-4 py-3 font-medium">
                        <Link to="/stock/$login" params={{ login: r.login }} className="hover:text-brand">
                          {r.login}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtShares(r.qty)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtMoney(r.avgCost)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtMoney(r.price)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtMoney(r.price * r.qty)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums font-medium ${up ? "text-bull" : "text-bear"}`}>
                        {up ? "+" : ""}{fmtMoney(pl)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold mb-2">Allocation</h3>
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} innerRadius={50} paddingAngle={2}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="var(--card)" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                    formatter={(v: number) => fmtMoney(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold mt-1 tabular-nums ${accent ?? ""}`}>{value}</div>
    </div>
  );
}
