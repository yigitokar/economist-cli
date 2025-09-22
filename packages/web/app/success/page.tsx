"use client";

import { useEffect, useMemo, useState } from "react";
import { postWithAuth } from "@/lib/api";

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
  const [status, setStatus] = useState<
    | "idle"
    | "validating"
    | "finalizing"
    | "done"
    | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!sessionId || !code) {
        setStatus("error");
        setError("Missing session or code");
        return;
      }
      try {
        setStatus("validating");
        await postWithAuth("confirm-checkout", { session_id: sessionId, code });
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
  }, [sessionId, code]);

  return (
    <div>
      <h1>Success</h1>
      {status === "validating" && <p>Validating your subscription…</p>}
      {status === "finalizing" && <p>Finalizing device link…</p>}
      {status === "done" && (
        <>
          <p>All set! You can return to the terminal.</p>
          <p style={{ fontSize: 12, opacity: 0.7 }}>Device code: {code}</p>
        </>
      )}
      {status === "error" && (
        <div>
          <p style={{ color: "crimson" }}>Error: {error}</p>
          <p>Please retry from the CLI.</p>
        </div>
      )}
    </div>
  );
}
