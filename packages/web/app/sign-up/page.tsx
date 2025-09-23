"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { postWithAuth } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Terminal, ArrowRight } from "lucide-react";

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
        // Do not auto-redirect; show the Google button instead
        setStatus("login_required");
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
    // Start Google OAuth; Supabase will restore the session and reload this page
    setStatus("login_redirect");
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: typeof window !== "undefined" ? window.location.href : undefined },
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Subtle gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black" />

      {/* Content */}
      <div className="relative z-10 max-w-xl mx-auto px-6 pt-24 pb-20 text-center">
        {/* Brand */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <Terminal className="w-10 h-10 text-orange-500" />
          <span className="text-white font-bold text-2xl">EconAgent</span>
        </div>

        {/* Headline */}
        <h1 className="text-white text-[clamp(1.75rem,5vw,2.5rem)] font-semibold leading-tight mb-3">
          Create your account
        </h1>
        <p className="text-white/70 mb-8">
          Sign up with Google to access Pro onboarding and link your terminal.
        </p>

        {/* Google Sign-up CTA */}
        {status === "login_required" && (
          <div className="flex flex-col items-center">
            <Button
              onClick={handleGoogle}
              className="group relative bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-xl text-base font-semibold flex items-center gap-2 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/40 transition-all duration-300"
            >
              <span className="inline-flex items-center gap-2">
                {/* Simple Google G mark */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 -ml-1">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,16.108,18.961,13,24,13c3.059,0,5.842,1.154,7.961,3.039 l5.657-5.657C34.046,6.053,29.268,4,24,4C15.655,4,8.431,8.676,6.306,14.691z"/>
                  <path fill="#4CAF50" d="M24,44c5.167,0,9.86-1.977,13.409-5.197l-6.19-5.238C29.211,35.091,26.715,36,24,36 c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.022C8.332,39.289,15.583,44,24,44z"/>
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.094,5.565 c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                </svg>
                Sign up with Google
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
            <a href="/" className="mt-4 text-white/70 hover:text-white text-sm">Back to home</a>
          </div>
        )}

        {status === "checking_session" && (
          <p className="text-white/70">Checking session…</p>
        )}
        {status === "login_redirect" && (
          <p className="text-white/70">Redirecting to Google sign-in…</p>
        )}

        {/* Device link flow */}
        {status === "need_code" && (
          <div className="mt-6 text-left mx-auto max-w-md bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-2">Almost there</h2>
            <p className="text-white/70 text-sm">
              You are signed in, but the device code is missing. Start from the CLI to generate a link
              (or paste the link here after you run the device-link command).
            </p>
          </div>
        )}

        {status === "finalizing" && (
          <p className="text-white/70 mt-6">Finalizing device link…</p>
        )}
        {status === "done" && (
          <div className="mt-6 text-left mx-auto max-w-md bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-2">All set!</h2>
            <p className="text-white/70 text-sm">You can return to the terminal.</p>
          </div>
        )}
        {status === "error" && (
          <div className="mt-6 text-left mx-auto max-w-md bg-crimson-500/10 border border-red-500/40 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-2">Error</h2>
            <p className="text-red-300 text-sm">{error}</p>
            <p className="text-white/60 text-sm mt-1">Please retry from the CLI.</p>
          </div>
        )}

        <p className="mt-12 text-xs text-white/50" suppressHydrationWarning>
          Device code: {mounted ? (code ?? "(none)") : ""}
        </p>
      </div>
    </div>
  );
}
