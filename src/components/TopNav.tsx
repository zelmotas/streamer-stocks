import { Link, useRouterState } from "@tanstack/react-router";
import { TrendingUp, Wallet, Trophy, BarChart3, LogOut, LogIn } from "lucide-react";
import { fmtMoney } from "@/lib/game";
import { useAuth } from "@/hooks/use-auth";

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
  const { profile, user, signOut } = useAuth();

  return (
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
          {profile ? (
            <>
              <div className="hidden md:flex flex-col items-end leading-tight">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Net Worth</span>
                <span className="font-semibold text-bull">{fmtMoney(profile.net_worth)}</span>
              </div>
              <div className="flex flex-col items-end leading-tight">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Cash</span>
                <span className="font-semibold">{fmtMoney(profile.cash)}</span>
              </div>
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand to-accent grid place-items-center font-bold text-sm" title={profile.username}>
                {profile.username[0]?.toUpperCase()}
              </div>
              <button
                onClick={signOut}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : user ? (
            <span className="text-sm text-muted-foreground">Loading…</span>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 bg-brand text-brand-foreground font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition text-sm"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
