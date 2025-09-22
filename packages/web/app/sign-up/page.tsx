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
    | "creating_checkout"
    | "redirecting"
    | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!code) {
        setStatus("need_code");
        return;
      }
      setStatus("checking_session");
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setStatus("login_required");
        return;
      }
      try {
        setStatus("creating_checkout");
        const resp = await postWithAuth<{ url: string }>("create-checkout-session", { code });
        setStatus("redirecting");
        window.location.assign(resp.url);
      } catch (e: any) {
        setError(e?.message ?? String(e));
        setStatus("error");
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleGoogle = async () => {
    if (!code) return;
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
        <p>Missing device code. Please start from the CLI to generate a sign-up link.</p>
      )}
      {status === "checking_session" && <p>Checking session…</p>}
      {status === "login_required" && (
        <div>
          <p>Sign in with Google to continue.</p>
          <button onClick={handleGoogle} style={{ padding: 8 }}>Sign in with Google</button>
        </div>
      )}
      {status === "creating_checkout" && <p>Creating checkout session…</p>}
      {status === "redirecting" && <p>Redirecting to Stripe Checkout…</p>}
      {status === "error" && (
        <div>
          <p style={{ color: "crimson" }}>Error: {error}</p>
          <p>Please retry from the CLI.</p>
        </div>
      )}
      <hr />
      <p style={{ fontSize: 12, opacity: 0.7 }}>Device code: {code ?? "(none)"}</p>
    </div>
  );
}
