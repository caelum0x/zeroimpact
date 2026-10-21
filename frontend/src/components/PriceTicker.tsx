import { useLivePrice } from "../hooks/useLivePrice";
import type { PerpAsset } from "../hooks/useHyperliquidMeta";

export function PriceTicker({ asset }: { asset: PerpAsset | undefined }) {
  const { price, error } = useLivePrice(asset?.name);

  if (!asset) return null;

  return (
    <div className="panel ticker">
      <div className="ticker-coin">{asset.name}-PERP</div>
      <div className="ticker-price">
        {error ? "price feed error" : price !== null ? `$${price.toLocaleString()}` : "loading..."}
      </div>
      <div className="ticker-note">
        live mid from Hyperliquid testnet /info (display only — settlement reads the onchain markPx precompile)
      </div>
    </div>
  );
}
