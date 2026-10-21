import { priceDecimalsFor } from "../hooks/useHyperliquidMeta";

/// Formats a 1e6-scaled USD value (matches the contract's `marginUsd6` / `pnlUsd6`
/// convention) as a human-readable dollar string.
export function formatUsd6(value: bigint | number | undefined): string {
  if (value === undefined) return "-";
  const num = typeof value === "bigint" ? Number(value) / 1e6 : value;
  const sign = num < 0 ? "-" : "";
  return `${sign}$${Math.abs(num).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

/// Formats a raw onchain `markPx`/`oraclePx` integer using Hyperliquid's documented
/// perp price-decimals convention: raw / 10^(6 - szDecimals).
export function formatRawPerpPrice(raw: bigint | number | undefined, szDecimals: number): string {
  if (raw === undefined) return "-";
  const decimals = priceDecimalsFor(szDecimals);
  const num = typeof raw === "bigint" ? Number(raw) : raw;
  return (num / 10 ** decimals).toLocaleString(undefined, { maximumFractionDigits: decimals });
}

export function shortenAddress(addr: string | undefined): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
