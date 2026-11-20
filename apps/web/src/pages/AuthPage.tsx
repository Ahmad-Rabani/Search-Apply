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

  if (!loading && user) return <Navigate to="/jobs" replace />;

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
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <p className="font-display text-4xl text-teal-950">Search&Apply</p>
      <p className="mt-2 text-teal-950/70">
        Find roles, tailor an ATS-ready CV per job, track every application.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-8 space-y-4 rounded-2xl border border-teal-900/10 bg-white/70 p-6 shadow-sm backdrop-blur"
      >
        <div className="flex gap-2 rounded-lg bg-teal-900/5 p-1">
          {(["register", "login"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-md py-2 text-sm font-semibold capitalize ${
                mode === m ? "bg-teal-800 text-white" : "text-teal-950/70"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {mode === "register" && (
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Name</span>
            <input
              className="w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2 outline-none focus:border-teal-700"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
        )}

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Email</span>
          <input
            type="email"
            className="w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2 outline-none focus:border-teal-700"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Password</span>
          <input
            type="password"
            minLength={6}
            className="w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2 outline-none focus:border-teal-700"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-teal-800 py-2.5 font-semibold text-white hover:bg-teal-900 disabled:opacity-60"
        >
          {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>
    </div>
  );
}
