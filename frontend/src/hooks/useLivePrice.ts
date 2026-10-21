import { useEffect, useState } from "react";
import { HYPERLIQUID_TESTNET_INFO_API } from "../config/contract";

/// Live mid-price ticker for the UI, polled from Hyperliquid's public `/info` REST API
/// (`{"type":"allMids"}`), keyed by coin name. This is display-only — it is NOT what the
/// contract settles trades against. Settlement always reads the onchain `markPx`
/// precompile directly inside `PaperPerps.sol`, so even if this REST ticker lagged or
/// went down, a user's actual open/close PnL would still be computed from HyperCore's own
/// live onchain state, not from this ticker.
export function useLivePrice(coin: string | undefined, pollMs = 3000) {
  const [price, setPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!coin) return;
    const coinName = coin;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(HYPERLIQUID_TESTNET_INFO_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "allMids" }),
        });
        if (!res.ok) throw new Error(`allMids request failed: ${res.status}`);
        const mids: Record<string, string> = await res.json();
        if (cancelled) return;
        const raw = mids[coinName];
        setPrice(raw !== undefined ? Number(raw) : null);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load live price");
      }
    }

    poll();
    const id = setInterval(poll, pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [coin, pollMs]);

  return { price, error };
}
