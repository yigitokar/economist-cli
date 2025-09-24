"use client";

import { useEffect, useMemo, useState } from "react";
import { postWithAuth } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Terminal, Copy, Check } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

function useQueryParam(name: string) {
  const value = useMemo(() => {
    if (typeof window === "undefined") return null;
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }, []);
  return value;
}

export default function SuccessPage() {
  const sessionId = useQueryParam("session_id");
  const code = useQueryParam("code");
  const router = useRouter();
  const [status, setStatus] = useState<
    | "idle"
    | "validating"
    | "finalizing"
    | "done"
    | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [discoveredCode, setDiscoveredCode] = useState<string | null>(null);

  function getDeviceCodeCookie(): string | null {
    if (typeof document === "undefined") return null;
    try {
      const m = document.cookie.match(/(?:^|; )device_code=([^;]+)/);
      return m ? decodeURIComponent(m[1]) : null;
    } catch {
      return null;
    }
  }

  function clearDeviceCodeCookie() {
    if (typeof document === "undefined") return;
    try {
      const host = window.location.hostname;
      const isLocal = host === "localhost" || /^(\d+\.){3}\d+$/.test(host);
      const root = isLocal ? "" : "; Domain=." + host.split(".").slice(-2).join(".");
      document.cookie = `device_code=; Max-Age=0; Path=/${root}`;
    } catch {}
  }

  useEffect(() => {
    const run = async () => {
      // Ensure Supabase processes any hash-based session fragments first
      await supabase.auth.getSession();

      // Flow A: Stripe checkout (expects both session_id and code)
      if (sessionId && code) {
        try {
          setStatus("validating");
          await postWithAuth("confirm-checkout", { session_id: sessionId, code });
          setStatus("finalizing");
          await postWithAuth("finalize-link", { code });
          setStatus("done");
          return;
        } catch (e: any) {
          setError(e?.message ?? String(e));
          setStatus("error");
          return;
        }
      }

      // Flow B: FREE_MODE or redirected from /sign-up after finalize-link. If only code is present,
      // attempt finalize (idempotency is handled server-side); ignore errors and show success UI.
      if (code && !sessionId) {
        try {
          setStatus("finalizing");
          await postWithAuth("finalize-link", { code });
        } catch {
          // ignore; user may already be finalized
        }
        setStatus("done");
        return;
      }

      // Flow C: No code param provided. Try to recover device_code from sessionStorage or cookie.
      let recovered: string | null = null;
      if (typeof window !== "undefined") {
        try { recovered = window.sessionStorage.getItem("device_code"); } catch {}
      }
      if (!recovered) recovered = getDeviceCodeCookie();
      if (recovered) {
        setDiscoveredCode(recovered);
        try {
          setStatus("finalizing");
          await postWithAuth("finalize-link", { code: recovered });
          // Clear stored code after success
          if (typeof window !== "undefined") {
            try { window.sessionStorage.removeItem("device_code"); } catch {}
          }
          clearDeviceCodeCookie();
        } catch (e: any) {
          // If finalize fails, surface the error but still show the page
          setError(e?.message ?? String(e));
        }
        setStatus("done");
        return;
      }

      // If neither param nor stored code is present, still show a friendly page
      setStatus("done");
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, code]);

  const installCmd = "npm i -g @careresearch/econ-agent";

  const copyInstall = async () => {
    try {
      await navigator.clipboard.writeText(installCmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await supabase.auth.signOut();
      router.replace('/sign-up');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black" />
      <div className="relative z-10 max-w-xl mx-auto px-6 pt-24 pb-20 text-center">
        {/* Brand */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <Terminal className="w-10 h-10 text-orange-500" />
          <span className="text-white font-bold text-2xl">EconAgent</span>
        </div>

        {/* Headline */}
        <h1 className="text-white text-[clamp(1.75rem,5vw,2.5rem)] font-semibold leading-tight mb-3">
          Welcome to EconAgent Pro
        </h1>
        <p className="text-white/70 mb-8">
          You’re all set. You can now close this window and return to your terminal.
        </p>

        {status === "validating" && <p className="text-white/70">Validating your subscription…</p>}
        {status === "finalizing" && <p className="text-white/70">Finalizing device link…</p>}

        {/* Quick actions */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button
            onClick={handleSignOut}
            variant="ghost"
            className="bg-transparent border border-white/20 text-white hover:bg-white/10"
            disabled={signingOut}
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </div>
        {status === "error" && (
          <div className="mt-6 text-left mx-auto max-w-md bg-crimson-500/10 border border-red-500/40 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-2">Error</h2>
            <p className="text-red-300 text-sm">{error}</p>
            <p className="text-white/60 text-sm mt-1">Please retry from the CLI.</p>
          </div>
        )}

        {/* Install guidance */}
        <div className="mt-8 text-left mx-auto max-w-md bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-2">Haven’t installed the CLI yet?</h2>
          <p className="text-white/70 text-sm mb-3">Install the CLI globally:</p>
          <div className="flex items-center gap-2">
            <code className="text-white/90 bg-white/5 px-3 py-2 rounded-lg text-sm">{installCmd}</code>
            <Button
              onClick={copyInstall}
              className="bg-transparent border border-white/20 text-white hover:bg-white/10"
              variant="ghost"
            >
              {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
            </Button>
          </div>
          <p className="text-white/70 text-sm mt-3">Then run in your terminal:</p>
          <code className="block text-white/90 bg-white/5 px-3 py-2 rounded-lg text-sm mt-1">economist /login</code>
        </div>

        <p className="mt-12 text-xs text-white/50" suppressHydrationWarning>
          Device code: {code ?? discoveredCode ?? "(none)"}
        </p>
      </div>
    </div>
  );
}
