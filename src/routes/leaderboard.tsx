import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { fmtMoney, getLeaderboard, getCash, getPortfolio, getStoredPrices, getUsername, updateLeaderboard, type LeaderboardEntry } from "@/lib/game";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard · StreamStocks" }] }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const me = getUsername();

  useEffect(() => {
    const tick = () => {
      const u = getUsername();
      if (u) {
        const cash = getCash();
        const port = getPortfolio();
        const prices = getStoredPrices();
        let v = 0;
        for (const [k, h] of Object.entries(port)) v += (prices[k] ?? h.avgCost) * h.qty;
        updateLeaderboard({ username: u, cash, netWorth: cash + v, updatedAt: Date.now() });
      }
      setRows(getLeaderboard().slice(0, 10));
    };
    tick();
    const i = setInterval(tick, 3000);
    return () => clearInterval(i);
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-brand to-bull grid place-items-center">
          <Trophy className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">Top traders by net worth (this device)</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No traders yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r, i) => {
              const isMe = r.username === me;
              return (
                <li key={r.username} className={`flex items-center gap-4 px-5 py-4 ${isMe ? "bg-accent/30" : ""}`}>
                  <div className={`h-9 w-9 rounded-full grid place-items-center font-bold ${
                    i === 0 ? "bg-yellow-500 text-black" :
                    i === 1 ? "bg-zinc-300 text-black" :
                    i === 2 ? "bg-amber-700 text-white" :
                    "bg-secondary text-muted-foreground"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">
                      {r.username} {isMe && <span className="text-xs text-brand ml-1">(you)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Cash {fmtMoney(r.cash)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold tabular-nums text-bull">{fmtMoney(r.netWorth)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
