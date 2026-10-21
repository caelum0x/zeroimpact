import { useState } from "react";
import { useAccount } from "wagmi";
import { parseUnits } from "viem";
import { useOpenPosition } from "../hooks/usePaperPerps";
import { USD_DECIMALS } from "../config/contract";
import type { PerpAsset } from "../hooks/useHyperliquidMeta";

export function PositionForm({ asset }: { asset: PerpAsset | undefined }) {
  const { isConnected } = useAccount();
  const [marginInput, setMarginInput] = useState("100");
  const [leverage, setLeverage] = useState(10);
  const [isLong, setIsLong] = useState(true);
  const { open, isPending, isConfirming, isSuccess, error } = useOpenPosition();

  if (!asset) return null;

  const notional = (Number(marginInput) || 0) * leverage;
  const busy = isPending || isConfirming;

  function submit() {
    if (!asset) return;
    const marginUsd6 = parseUnits(marginInput || "0", USD_DECIMALS);
    if (marginUsd6 === 0n) return;
    open(asset.index, isLong, marginUsd6, leverage);
  }

  return (
    <div className="panel">
      <div className="label">Open / increase virtual position — {asset.name}-PERP</div>

      <div className="side-toggle">
        <button className={`btn ${isLong ? "btn-long active" : "btn-long"}`} onClick={() => setIsLong(true)}>
          Long
        </button>
        <button className={`btn ${!isLong ? "btn-short active" : "btn-short"}`} onClick={() => setIsLong(false)}>
          Short
        </button>
      </div>

      <label className="label">Virtual margin (USD, no real tokens move)</label>
      <input
        className="input"
        type="number"
        min="0"
        step="1"
        value={marginInput}
        onChange={(e) => setMarginInput(e.target.value)}
      />

      <label className="label">
        Leverage: {leverage}x <span className="hint">(up to 1000x — safe, it's virtual margin, never real custody)</span>
      </label>
      <input
        className="slider"
        type="range"
        min={1}
        max={1000}
        value={leverage}
        onChange={(e) => setLeverage(Number(e.target.value))}
      />

      <div className="notional-preview">Virtual notional: ${notional.toLocaleString()}</div>

      {!isConnected ? (
        <div className="hint">Connect a wallet to trade.</div>
      ) : (
        <button className="btn btn-primary wide" disabled={busy} onClick={submit}>
          {isPending ? "Signing..." : isConfirming ? "Confirming onchain..." : `Open ${isLong ? "Long" : "Short"}`}
        </button>
      )}

      {isSuccess && <div className="success">Position opened/increased onchain.</div>}
      {error && <div className="error">{error.message}</div>}
    </div>
  );
}
