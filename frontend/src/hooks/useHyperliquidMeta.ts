import { useEffect, useState } from "react";
import { HYPERLIQUID_TESTNET_INFO_API } from "../config/contract";

export interface PerpAsset {
  /// Numeric perp index — position in Hyperliquid's `meta.universe` array. This is the
  /// exact index PaperPerps.sol passes straight through to the `markPx` precompile, so it
  /// must come from the real API, never be hand-typed.
  index: number;
  name: string;
  szDecimals: number;
  maxLeverage: number;
}

interface MetaResponse {
  universe: Array<{ name: string; szDecimals: number; maxLeverage: number }>;
}

/// Pulls the real, live perp asset universe from Hyperliquid's public `/info` REST API
/// (`{"type":"meta"}`). No hardcoded asset list anywhere in this app — if Hyperliquid adds
/// or removes a perp, this list updates on next load with no code change.
export function useHyperliquidMeta() {
  const [assets, setAssets] = useState<PerpAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(HYPERLIQUID_TESTNET_INFO_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "meta" }),
        });
        if (!res.ok) throw new Error(`Hyperliquid /info meta request failed: ${res.status}`);
        const meta: MetaResponse = await res.json();
        if (cancelled) return;
        setAssets(
          meta.universe.map((a, index) => ({
            index,
            name: a.name,
            szDecimals: a.szDecimals,
            maxLeverage: a.maxLeverage,
          })),
        );
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load Hyperliquid asset list");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { assets, loading, error };
}

/// Perp price decimals follow Hyperliquid's documented convention: raw integer price /
/// 10^(6 - szDecimals). Used purely for display formatting of onchain raw prices.
export function priceDecimalsFor(szDecimals: number): number {
  return Math.max(0, 6 - szDecimals);
}
