/// Deployed PaperPerps contract address on HyperEVM testnet (chain id 998).
/// Empty until the contract is actually deployed and funded with testnet HYPE gas — see
/// the repo README's "Known limitation" section for why this is still a placeholder.
export const PAPER_PERPS_ADDRESS = (import.meta.env.VITE_PAPER_PERPS_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const HYPEREVM_TESTNET_CHAIN_ID = 998;

export const HYPEREVM_TESTNET_RPC_URL = "https://rpc.hyperliquid-testnet.xyz/evm";

export const HYPEREVM_TESTNET_EXPLORER_URL = "https://app.hyperliquid-testnet.xyz/explorer";

export const HYPERLIQUID_TESTNET_INFO_API = "https://api.hyperliquid-testnet.xyz/info";

/// USD margin values in this app are 1e6-scaled (same convention as USDC, 6 decimals),
/// matching the contract's `marginUsd6` fields.
export const USD_DECIMALS = 6;
