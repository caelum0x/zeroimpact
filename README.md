# ZeroImpact

Fully onchain perpetuals **paper trading** on [Hyperliquid](https://hyperliquid.xyz)'s HyperEVM — an open-source
alternative to the closed-source papertrade.xyz. Open a 1000x leveraged position, settle PnL against Hyperliquid's
real live mark price, never touch the real order book, never hand custody of a token to anyone.

- **Live app:** https://zeroimpact.subasiarhan3.workers.dev
- **Contract:** `contracts/src/PaperPerps.sol` (Foundry)
- **Network:** HyperEVM Testnet, chain id `998`
- **License:** MIT

## The four claims, made literal

### 1. "1000x leverage"
`PaperPerps.MAX_LEVERAGE = 1000`. This is safe to allow at all because leverage here is just an integer multiplier
on a `uint256` bookkeeping number (`marginUsd6`) — there is no real collateral anywhere that 1000x could wipe out in
a cascading liquidation. Compare to a real perp DEX, where 1000x leverage would be reckless because it risks real
depositor funds; here it risks nothing but a number in a mapping.

### 2. "0 market impact"
The contract **never calls HyperCore's matching engine**. There is no order placement, no `CoreWriter` action, no
interaction with Hyperliquid's real order book at all. `openPosition` / `closePosition` only ever *read* a price —
they never write a trade to HyperCore. A thousand ZeroImpact users opening max-leverage positions moves Hyperliquid's
real market exactly zero, because nothing is ever submitted to it.

### 3. "100% user owned"
There is no backend database, no account system, no admin key. State lives entirely in two contract mappings:

```solidity
mapping(address => mapping(uint16 => Position)) public positions;      // current position per user per perp
mapping(address => TradeRecord[]) private _history;                    // append-only trade history per user
```

Every state change is a transaction the user signs with their own wallet (`openPosition`, `closePosition`). Anyone —
not just the position owner — can read any address's full position and trade history for free, with no API key and
no gated account, via `positions()`, `getHistory()`, and `leaderboard()`. Export your own data any time: it's just a
`cast call` or a public RPC read away.

### 4. "Fully onchain"
Every settlement price in this contract comes from `HyperCoreRead._markPx()`, which does exactly this:

```solidity
address constant MARK_PX_PRECOMPILE_ADDRESS = 0x0000000000000000000000000000000000000806;

function _markPx(uint16 perpIndex) internal view returns (uint64 price) {
    (bool success, bytes memory result) = MARK_PX_PRECOMPILE_ADDRESS.staticcall(abi.encode(perpIndex));
    require(success, "precompile call failed");
    price = abi.decode(result, (uint64));
}
```

`0x...806` is one of HyperEVM's **native read precompiles** — a reserved address where the HyperEVM node itself
runs built-in logic (not deployed bytecode) that reads HyperCore's live internal state and returns it synchronously,
in the same block, to any EVM contract that calls it. This is not an oracle in the Chainlink/Pyth sense: there is no
off-chain keeper pushing a price, no multisig, no update latency — it's the same `markPx` HyperCore's own perp
engine uses internally to mark positions and compute funding, exposed directly to EVM. That is what makes "fully
onchain" literally true here instead of marketing language: swap `_markPx` for a call to any off-chain price feed
and the "fully onchain" claim would be false. We don't do that.

Precompile addresses/ABI/calling-convention (`staticcall(abi.encode(uint16 perpIndex))` → `abi.decode(uint64)`) are
Hyperliquid's own documented `L1Read.sol` reference pattern (`docs.hyperliquid.xyz` → HyperEVM → "Interacting with
HyperCore"), cross-checked against public reference implementations (e.g. `kyriediculous/hello-hl`,
`code-423n4/2025-04-kinetiq`) and confirmed with a real live RPC call during development — see
`contracts/test/TestnetPrecompileIntegration.t.sol`.

## Architecture

```
zeroimpact/
├── contracts/            Foundry project
│   ├── src/
│   │   ├── HyperCoreRead.sol   precompile wrapper (markPx, oraclePx)
│   │   └── PaperPerps.sol      the trading engine
│   ├── test/
│   │   ├── PaperPerps.t.sol                    18 unit tests, precompile mocked via vm.mockCall
│   │   └── TestnetPrecompileIntegration.t.sol  1 real test against the live testnet precompile (FFI + cast call)
│   └── script/Deploy.s.sol
└── frontend/              Vite + React + TypeScript + wagmi/viem
    ├── src/hooks/useHyperliquidMeta.ts   real asset list from Hyperliquid's public /info API
    ├── src/hooks/useLivePrice.ts         real live price ticker (display only)
    ├── src/hooks/usePaperPerps.ts        contract reads/writes via wagmi
    └── src/components/                   wallet connect, perp picker, position form/panel, history, leaderboard
```

### Why Hyperliquid's numeric perp indices matter
Hyperliquid identifies perps by **numeric index** (position in `meta.universe`), not by symbol — the same index the
`markPx` precompile takes. The frontend never hardcodes an index-to-symbol mapping: it fetches the real live
`{"type":"meta"}` response from `https://api.hyperliquid-testnet.xyz/info` on load, so if Hyperliquid adds or
reorders perps, the picker is correct with zero code changes.

### Where this project intentionally does NOT go fully onchain
The frontend's live price ticker (`useLivePrice.ts`) polls Hyperliquid's public `/info` `allMids` REST endpoint for
a snappy, frequently-updating display price. This is **display only** — it never touches settlement. When a user
actually opens or closes a position, the contract re-reads the real `markPx` precompile on its own, so even if the
REST ticker were stale or down, actual PnL is always computed from HyperCore's live onchain state.

## Development

```bash
# contracts
cd contracts
forge test                                            # 18 unit tests, mocked precompile
forge test --match-contract TestnetPrecompileIntegration -vvv   # 1 real testnet integration test
forge script script/Deploy.s.sol:Deploy --rpc-url hyperevm_testnet   # dry-run deploy simulation (no --broadcast)

# frontend
cd frontend
npm install
npm run dev
npm run build && npx wrangler deploy
```

## Known limitation (as of this write-up)

The contract is **built, fully tested, and deploy-simulated successfully against the live HyperEVM testnet** (see
`contracts/script/Deploy.s.sol` dry-run output), but has not yet actually been broadcast to testnet because the
fresh deployer wallet has zero testnet HYPE gas, and every public faucet gates on either an already-active mainnet
wallet history or a captcha — both of which need a real human with an existing wallet, not something an agent can
complete unattended. See `~/products/plans/zeroimpact.md` for the exact one-time funding step and the exact command
that deploys it the moment gas lands. The frontend is live and fully functional against any contract address — it
just needs `VITE_PAPER_PERPS_ADDRESS` set once the deploy happens.

## Roadmap (not built yet, intentionally out of scope this round)

- Mainnet deploy (deliberately deferred — real-money gas decision).
- More perps wired into richer multi-position UX (the contract and asset picker already support all 212+ live
  perps; this is about UI polish, not missing contract functionality).
- **NEAR Chain Signatures** integration for cross-chain non-custodial control of a ZeroImpact position from a NEAR
  account — planned for a future NEAR Hackathon submission. Not started.
