import { useAccount } from "wagmi";
import { usePosition, usePreviewEquity, useClosePosition } from "../hooks/usePaperPerps";
import { formatRawPerpPrice, formatUsd6 } from "../utils/format";
import type { PerpAsset } from "../hooks/useHyperliquidMeta";

export function PositionPanel({ asset }: { asset: PerpAsset | undefined }) {
  const { address } = useAccount();
  const { data: position, refetch: refetchPosition } = usePosition(asset?.index ?? 0);
  const { data: preview } = usePreviewEquity(address, asset?.index ?? 0);
  const { close, isPending, isConfirming, isSuccess, error } = useClosePosition();

  // `positions(address,uint16)` is Solidity's auto-generated struct getter, which
  // flattens the struct into a positional tuple (not a named object) once decoded by
  // viem: [open, isLong, perpIndex, leverage, entryPrice, openedAt, marginUsd6, notionalUsd6].
  const [isOpen, isLong, , leverage, entryPrice, , marginUsd6, notionalUsd6] = position ?? [
    false,
    false,
    0,
    0,
    0n,
    0n,
    0n,
    0n,
  ];

  if (!asset || !address) return null;
  if (!isOpen) {
    return <div className="panel">No open {asset.name}-PERP position.</div>;
  }

  const [, pnlUsd6, equityUsd6, markPrice] = preview ?? [false, 0n, 0n, 0n];
  const pnlPositive = (pnlUsd6 ?? 0n) >= 0n;

  return (
    <div className="panel position-panel">
      <div className="label">Open position — {asset.name}-PERP</div>
      <div className="grid">
        <div>
          <span className="k">Side</span>
          <span className={isLong ? "v long" : "v short"}>{isLong ? "LONG" : "SHORT"}</span>
        </div>
        <div>
          <span className="k">Leverage</span>
          <span className="v">{leverage}x</span>
        </div>
        <div>
          <span className="k">Margin</span>
          <span className="v">{formatUsd6(marginUsd6)}</span>
        </div>
        <div>
          <span className="k">Notional</span>
          <span className="v">{formatUsd6(notionalUsd6)}</span>
        </div>
        <div>
          <span className="k">Entry mark</span>
          <span className="v">{formatRawPerpPrice(entryPrice, asset.szDecimals)}</span>
        </div>
        <div>
          <span className="k">Live onchain mark</span>
          <span className="v">{formatRawPerpPrice(markPrice, asset.szDecimals)}</span>
        </div>
        <div>
          <span className="k">Live PnL</span>
          <span className={pnlPositive ? "v pos" : "v neg"}>{formatUsd6(pnlUsd6)}</span>
        </div>
        <div>
          <span className="k">Live equity</span>
          <span className="v">{formatUsd6(equityUsd6)}</span>
        </div>
      </div>

      <button
        className="btn btn-primary wide"
        disabled={isPending || isConfirming}
        onClick={() => {
          close(asset.index);
          setTimeout(refetchPosition, 4000);
        }}
      >
        {isPending ? "Signing..." : isConfirming ? "Confirming onchain..." : "Close position"}
      </button>
      {isSuccess && <div className="success">Position closed and settled onchain.</div>}
      {error && <div className="error">{error.message}</div>}
    </div>
  );
}
