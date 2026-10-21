import { useLeaderboard } from "../hooks/usePaperPerps";
import { formatUsd6, shortenAddress } from "../utils/format";

/// Public leaderboard: reads `PaperPerps.leaderboard()` directly, which is backed by the
/// contract's append-only per-user trade history. No backend database, no account system
/// — anyone with the contract address can read the exact same ranking this UI shows.
export function Leaderboard() {
  const { data, isLoading, isFetched, error } = useLeaderboard(0, 25);

  if (isLoading && !isFetched) return <div className="panel">Loading leaderboard...</div>;
  if (error) return <div className="panel error">Failed to load leaderboard: {error.message}</div>;

  const [traders, pnls] = data ?? [[], []];
  const ranked = traders
    .map((addr, i) => ({ addr, pnl: pnls[i] }))
    .sort((a, b) => Number(b.pnl - a.pnl));

  return (
    <div className="panel">
      <div className="label">Leaderboard — cumulative realized PnL, onchain</div>
      {ranked.length === 0 ? (
        <div className="hint">No traders yet. Be the first to open a position.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Trader</th>
              <th>Total realized PnL</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row, i) => (
              <tr key={row.addr}>
                <td>{i + 1}</td>
                <td>{shortenAddress(row.addr)}</td>
                <td className={row.pnl >= 0n ? "pos" : "neg"}>{formatUsd6(row.pnl)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
