import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";
import { HYPEREVM_TESTNET_CHAIN_ID, HYPEREVM_TESTNET_RPC_URL, HYPEREVM_TESTNET_EXPLORER_URL } from "./contract";

export const hyperEvmTestnet = defineChain({
  id: HYPEREVM_TESTNET_CHAIN_ID,
  name: "HyperEVM Testnet",
  nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
  rpcUrls: {
    default: { http: [HYPEREVM_TESTNET_RPC_URL] },
  },
  blockExplorers: {
    default: { name: "Hyperliquid Testnet Explorer", url: HYPEREVM_TESTNET_EXPLORER_URL },
  },
  testnet: true,
});

export const wagmiConfig = createConfig({
  chains: [hyperEvmTestnet],
  connectors: [injected()],
  transports: {
    [hyperEvmTestnet.id]: http(HYPEREVM_TESTNET_RPC_URL),
  },
});
