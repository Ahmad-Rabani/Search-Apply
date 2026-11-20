import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function AuthPage() {
  const { user, loading, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-16 -z-10 mx-auto h-40 max-w-md rounded-full bg-teal-700/10 blur-3xl" />
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800/70">
        Personal job agent
      </p>
      <p className="font-display mt-2 text-4xl text-teal-950 md:text-5xl">Search&Apply</p>
      <p className="mt-3 text-teal-950/65">
        Discover roles, match an ATS CV, assist apply, and let Agent mode hunt daily for you.
      </p>

      <form onSubmit={onSubmit} className="saa-card mt-8 space-y-4 p-6">
        <div className="flex gap-1 rounded-xl bg-teal-950/[0.04] p-1">
          {(["register", "login"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition ${
                mode === m ? "bg-teal-900 text-white shadow-sm" : "text-teal-950/60"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {mode === "register" && (
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-teal-950/70">Name</span>
            <input
              className="saa-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
        )}

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-teal-950/70">Email</span>
          <input
            type="email"
            className="saa-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-teal-950/70">Password</span>
          <input
            type="password"
            minLength={6}
            className="saa-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <button type="submit" disabled={busy} className="saa-btn saa-btn-primary w-full py-2.5 disabled:opacity-60">
          {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>
    </div>
  );
}
