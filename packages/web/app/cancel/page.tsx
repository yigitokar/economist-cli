"use client";

import { useMemo } from "react";

function useQueryParam(name: string) {
  const value = useMemo(() => {
    if (typeof window === "undefined") return null;
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }, []);
  return value;
}

export default function CancelPage() {
  const code = useQueryParam("code");
  const link = code ? `/sign-up?code=${encodeURIComponent(code)}` : "/sign-up";
  return (
    <div>
      <h1>Checkout cancelled</h1>
      <p>You cancelled the checkout. You can resume the process any time.</p>
      <p>
        <a href={link}>Return to sign-up</a>
      </p>
      <p style={{ fontSize: 12, opacity: 0.7 }}>Device code: {code ?? "(none)"}</p>
    </div>
  );
}
