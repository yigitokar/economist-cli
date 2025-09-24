"use client";

import { useEffect, useState } from "react";
import { postWithAuth } from "@/lib/api";

export default function PortalPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setStatus("loading");
        const resp = await postWithAuth<{ url: string }>("create-billing-portal", {});
        window.location.assign(resp.url);
      } catch (e: any) {
        setError(e?.message ?? String(e));
        setStatus("error");
      }
    };
    run();
  }, []);

  return (
    <div>
      <h1>Billing Portal</h1>
      {status === "loading" && <p>Opening billing portal…</p>}
      {status === "error" && (
        <p style={{ color: "crimson" }}>Error: {error}</p>
      )}
    </div>
  );
}
