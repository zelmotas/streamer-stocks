import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in · StreamStocks" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { session } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) nav({ to: "/" });
  }, [session, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const uname = username.trim();
        if (uname.length < 2) throw new Error("Username must be at least 2 characters");
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { username: uname },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : "Something went wrong";
      setErr(m);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] grid place-items-center px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand to-bull grid place-items-center">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{mode === "signup" ? "Create account" : "Welcome back"}</h1>
            <p className="text-sm text-muted-foreground">
              {mode === "signup" ? "Get SB 10,000 to start trading" : "Sign in to your trader account"}
            </p>
          </div>
        </div>

        {mode === "signup" && (
          <label className="block mb-3">
            <span className="text-xs text-muted-foreground">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="trader_pro"
              className="mt-1 w-full bg-input border border-border rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        )}
        <label className="block mb-3">
          <span className="text-xs text-muted-foreground">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full bg-input border border-border rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label className="block mb-4">
          <span className="text-xs text-muted-foreground">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="mt-1 w-full bg-input border border-border rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        {err && <div className="mb-3 text-sm text-bear">{err}</div>}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-brand hover:opacity-90 transition text-brand-foreground font-semibold py-3 rounded-lg disabled:opacity-50"
        >
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="text-brand hover:underline font-medium"
          >
            {mode === "signup" ? "Sign in" : "Create one"}
          </button>
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">Back to market</Link>
        </p>
      </form>
    </main>
  );
}
