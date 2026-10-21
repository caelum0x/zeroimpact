import type { PerpAsset } from "../hooks/useHyperliquidMeta";

interface Props {
  assets: PerpAsset[];
  loading: boolean;
  error: string | null;
  selected: PerpAsset | undefined;
  onSelect: (asset: PerpAsset) => void;
}

/// Perp picker populated entirely from Hyperliquid's live `/info` meta API — the asset
/// list, names, and per-asset max leverage are never hardcoded in this app.
export function PerpPicker({ assets, loading, error, selected, onSelect }: Props) {
  if (loading) return <div className="panel">Loading live Hyperliquid asset list...</div>;
  if (error) return <div className="panel error">Failed to load assets: {error}</div>;

  return (
    <div className="panel">
      <label htmlFor="perp-select" className="label">
        Perp (live Hyperliquid testnet universe, {assets.length} assets)
      </label>
      <select
        id="perp-select"
        className="select"
        value={selected?.index ?? ""}
        onChange={(e) => {
          const asset = assets.find((a) => a.index === Number(e.target.value));
          if (asset) onSelect(asset);
        }}
      >
        {assets.map((a) => (
          <option key={a.index} value={a.index}>
            #{a.index} {a.name} (max {a.maxLeverage}x on real HyperCore)
          </option>
        ))}
      </select>
    </div>
  );
}
