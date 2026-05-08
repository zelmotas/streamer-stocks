import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { fmtMoney } from "@/lib/game";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard · StreamStocks" }] }),
  component: LeaderboardPage,
});

type Row = { id: string; username: string; cash: number; net_worth: number };

function LeaderboardPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, cash, net_worth")
        .order("net_worth", { ascending: false })
        .limit(50);
      if (!mounted) return;
      setRows(
        (data ?? []).map((r) => ({
          id: r.id,
          username: r.username,
          cash: Number(r.cash),
          net_worth: Number(r.net_worth),
        })),
      );
      setLoading(false);
    };
    load();
    const i = setInterval(load, 5000);
    return () => {
      mounted = false;
      clearInterval(i);
    };
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-brand to-bull grid place-items-center">
          <Trophy className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">Top traders by net worth</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            No traders yet. <Link to="/auth" className="text-brand underline">Create an account</Link> to play.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.slice(0, 25).map((r, i) => {
              const isMe = r.id === user?.id;
              return (
                <li key={r.id} className={`flex items-center gap-4 px-5 py-4 ${isMe ? "bg-accent/30" : ""}`}>
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
                    <div className="font-bold tabular-nums text-bull">{fmtMoney(r.net_worth)}</div>
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
