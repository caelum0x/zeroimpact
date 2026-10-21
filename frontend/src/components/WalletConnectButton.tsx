import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { shortenAddress } from "../utils/format";
import { HYPEREVM_TESTNET_CHAIN_ID } from "../config/contract";

export function WalletConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    const injected = connectors.find((c) => c.id === "injected") ?? connectors[0];
    return (
      <button className="btn btn-primary" disabled={isPending} onClick={() => injected && connect({ connector: injected })}>
        {isPending ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  if (chainId !== HYPEREVM_TESTNET_CHAIN_ID) {
    return (
      <button className="btn btn-warn" onClick={() => switchChain({ chainId: HYPEREVM_TESTNET_CHAIN_ID })}>
        Switch to HyperEVM Testnet
      </button>
    );
  }

  return (
    <div className="wallet-pill">
      <span className="dot" />
      {shortenAddress(address)}
      <button className="btn btn-ghost" onClick={() => disconnect()}>
        Disconnect
      </button>
    </div>
  );
}
