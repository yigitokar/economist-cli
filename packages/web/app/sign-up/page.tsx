"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { postWithAuth } from "@/lib/api";

function useQueryParam(name: string) {
  const value = useMemo(() => {
    if (typeof window === "undefined") return null;
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }, []);
  return value;
}

export default function SignUpPage() {
  const code = useQueryParam("code");
  const [status, setStatus] = useState<
    | "idle"
    | "need_code"
    | "checking_session"
    | "login_required"
    | "login_redirect"
    | "finalizing"
    | "done"
    | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const run = async () => {
      setStatus("checking_session");
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setStatus("login_redirect");
        // Automatically start Google OAuth and return; user will land back here after login
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: typeof window !== "undefined" ? window.location.href : undefined },
        });
        return;
      }
      if (!code) {
        setStatus("need_code");
        return;
      }
      try {
        // FREE MODE: directly finalize link without Stripe checkout
        setStatus("finalizing");
        await postWithAuth("finalize-link", { code });
        setStatus("done");
      } catch (e: any) {
        setError(e?.message ?? String(e));
        setStatus("error");
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleGoogle = async () => {
    // After Google OAuth, Supabase will restore the session and reload this page
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: typeof window !== "undefined" ? window.location.href : undefined },
    });
  };

  return (
    <div>
      <h1>Sign up for Economist CLI Pro</h1>
      {status === "need_code" && (
        <p>
          You are signed in, but the device code is missing. Please start from the
          CLI to generate a sign-up link, or paste the link here when available.
        </p>
      )}
      {status === "checking_session" && <p>Checking session…</p>}
      {status === "login_redirect" && <p>Redirecting to Google sign-in…</p>}
      {status === "login_required" && (
        <div>
          <p>Sign in with Google to continue.</p>
          <button onClick={handleGoogle} style={{ padding: 8 }}>Sign in with Google</button>
        </div>
      )}
      {status === "finalizing" && <p>Finalizing device link…</p>}
      {status === "done" && (
        <>
          <p>All set! You can return to the terminal.</p>
        </>
      )}
      {status === "error" && (
        <div>
          <p style={{ color: "crimson" }}>Error: {error}</p>
          <p>Please retry from the CLI.</p>
        </div>
      )}
      <hr />
      <p style={{ fontSize: 12, opacity: 0.7 }} suppressHydrationWarning>
        Device code: {mounted ? (code ?? "(none)") : ""}
      </p>
    </div>
  );
}
