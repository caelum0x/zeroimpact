import { useAccount } from "wagmi";
import { useHistory } from "../hooks/usePaperPerps";
import { formatUsd6 } from "../utils/format";

export function HistoryTable() {
  const { address } = useAccount();
  const { data: history } = useHistory(address);

  if (!address) return null;

  return (
    <div className="panel">
      <div className="label">Your trade history (append-only, onchain)</div>
      {!history || history.length === 0 ? (
        <div className="hint">No closed trades yet.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Perp #</th>
              <th>Side</th>
              <th>Leverage</th>
              <th>PnL</th>
              <th>Liquidated</th>
              <th>Closed at</th>
            </tr>
          </thead>
          <tbody>
            {[...history].reverse().map((trade, i) => (
              <tr key={i}>
                <td>#{trade.perpIndex}</td>
                <td>{trade.isLong ? "LONG" : "SHORT"}</td>
                <td>{trade.leverage}x</td>
                <td className={trade.pnlUsd6 >= 0n ? "pos" : "neg"}>{formatUsd6(trade.pnlUsd6)}</td>
                <td>{trade.liquidated ? "yes" : "-"}</td>
                <td>{new Date(Number(trade.closedAt) * 1000).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
