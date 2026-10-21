import { useEffect, useState } from "react";
import { WalletConnectButton } from "./components/WalletConnectButton";
import { PerpPicker } from "./components/PerpPicker";
import { PriceTicker } from "./components/PriceTicker";
import { PositionForm } from "./components/PositionForm";
import { PositionPanel } from "./components/PositionPanel";
import { HistoryTable } from "./components/HistoryTable";
import { Leaderboard } from "./components/Leaderboard";
import { useHyperliquidMeta, type PerpAsset } from "./hooks/useHyperliquidMeta";
import { PAPER_PERPS_ADDRESS, HYPEREVM_TESTNET_EXPLORER_URL } from "./config/contract";
import "./App.css";

const CONTRACT_NOT_DEPLOYED = PAPER_PERPS_ADDRESS === "0x0000000000000000000000000000000000000000";

function App() {
  const { assets, loading, error } = useHyperliquidMeta();
  const [selected, setSelected] = useState<PerpAsset | undefined>(undefined);

  useEffect(() => {
    if (!selected && assets.length > 0) {
      const btc = assets.find((a) => a.name === "BTC");
      setSelected(btc ?? assets[0]);
    }
  }, [assets, selected]);

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-mark">ZeroImpact</span>
          <span className="brand-sub">fully onchain perps paper trading on HyperEVM</span>
        </div>
        <WalletConnectButton />
      </header>

      {CONTRACT_NOT_DEPLOYED && (
        <div className="banner">
          Contract address not configured yet (set VITE_PAPER_PERPS_ADDRESS). Reads/writes below will fail until a
          deployed PaperPerps address is wired in — see the repo README for the live testnet deploy status.
        </div>
      )}

      <main className="main">
        <section className="column">
          <PerpPicker assets={assets} loading={loading} error={error} selected={selected} onSelect={setSelected} />
          <PriceTicker asset={selected} />
          <PositionPanel asset={selected} />
          <PositionForm asset={selected} />
        </section>

        <section className="column">
          <HistoryTable />
          <Leaderboard />
        </section>
      </main>

      <footer className="footer">
        <a href={HYPEREVM_TESTNET_EXPLORER_URL} target="_blank" rel="noreferrer">
          HyperEVM Testnet Explorer
        </a>
        <span>·</span>
        <a href="https://github.com/caelum0x/zeroimpact" target="_blank" rel="noreferrer">
          Source (MIT)
        </a>
      </footer>
    </div>
  );
}

export default App;
