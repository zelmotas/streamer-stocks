import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { TrendingUp, Wallet, Trophy, BarChart3 } from "lucide-react";
import { fmtMoney, getCash, getPortfolio, getStoredPrices, getUsername, setUsername } from "@/lib/game";

function NavLink({ to, icon: Icon, label }: { to: string; icon: typeof TrendingUp; label: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = to === "/" ? path === "/" : path.startsWith(to);
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

export function TopNav() {
  const [username, setName] = useState<string | null>(null);
  const [cash, setCash] = useState(0);
  const [stockValue, setStockValue] = useState(0);
  const [showLogin, setShowLogin] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const u = getUsername();
    if (!u) setShowLogin(true);
    else setName(u);
    const tick = () => {
      setCash(getCash());
      const port = getPortfolio();
      const prices = getStoredPrices();
      let v = 0;
      for (const [login, h] of Object.entries(port)) {
        v += (prices[login] ?? h.avgCost) * h.qty;
      }
      setStockValue(v);
    };
    tick();
    const i = setInterval(tick, 1500);
    return () => clearInterval(i);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = draft.trim();
    if (!v) return;
    setUsername(v);
    setName(v);
    setShowLogin(false);
  };

  const total = cash + stockValue;

  return (
    <>
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="mx-auto max-w-7xl px-4 h-16 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand to-bull grid place-items-center">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className="hidden sm:inline">StreamStocks</span>
          </Link>
          <nav className="flex items-center gap-1 ml-2">
            <NavLink to="/" icon={BarChart3} label="Market" />
            <NavLink to="/portfolio" icon={Wallet} label="Portfolio" />
            <NavLink to="/leaderboard" icon={Trophy} label="Leaderboard" />
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end leading-tight">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Net Worth</span>
              <span className="font-semibold text-bull">{fmtMoney(total)}</span>
            </div>
            <div className="flex flex-col items-end leading-tight">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Cash</span>
              <span className="font-semibold">{fmtMoney(cash)}</span>
            </div>
            {username && (
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand to-accent grid place-items-center font-bold text-sm">
                {username[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </header>

      {showLogin && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4">
          <form
            onSubmit={submit}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand to-bull grid place-items-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Welcome to StreamStocks</h1>
                <p className="text-sm text-muted-foreground">Trade your favorite Twitch streamers</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Pick a username to get started. You'll receive <span className="text-bull font-semibold">SB 10,000</span> in StreamBucks.
            </p>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Your trader name"
              className="w-full bg-input border border-border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              className="mt-4 w-full bg-brand hover:opacity-90 transition text-brand-foreground font-semibold py-3 rounded-lg"
            >
              Start trading
            </button>
          </form>
        </div>
      )}
    </>
  );
}
