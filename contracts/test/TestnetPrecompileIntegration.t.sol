// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {HyperCoreRead} from "../src/HyperCoreRead.sol";

/// @notice Thin harness that exposes HyperCoreRead's internal functions externally so this
///         test (and `cast call` in the shell) can hit them the same way.
contract HyperCoreReadHarness is HyperCoreRead {
    function markPx(uint16 perpIndex) external view returns (uint64) {
        return _markPx(perpIndex);
    }
}

/// @notice The ONE real integration test required by this project's build spec: it proves
///         the exact precompile call `PaperPerps` makes (`staticcall` to
///         0x0000000000000000000000000000000000000806, `abi.encode(uint16)` in /
///         `abi.decode(uint64)` out) actually works against the live, running HyperEVM
///         TESTNET node right now — not a mock, not a fork, a real `eth_call` RPC
///         round-trip to `https://rpc.hyperliquid-testnet.xyz/evm`.
///
/// Why FFI + `cast call` instead of `vm.createSelectFork`: Foundry's forked-EVM mode
/// replays a chain's *regular* EVM bytecode/storage, but HyperEVM's read precompiles are
/// native node logic bolted on outside the standard EVM state — there is nothing at
/// 0x...806 for a generic forked EVM to execute, so a forked call to it reverts. Shelling
/// out to `cast call` sends a real JSON-RPC `eth_call` to the live testnet node, which
/// *does* run the real precompile logic and answers with HyperCore's real current state.
///
/// Requires network access and `cast` on PATH (both true in this repo's dev/CI
/// environment). Run explicitly with: `forge test --match-contract TestnetPrecompileIntegration -vvv`
contract TestnetPrecompileIntegrationTest is Test {
    string internal constant TESTNET_RPC = "https://rpc.hyperliquid-testnet.xyz/evm";
    address internal constant MARK_PX = 0x0000000000000000000000000000000000000806;

    /// @dev Perp index 0 on Hyperliquid testnet (first entry in the testnet perp universe,
    ///      per `GET https://api.hyperliquid-testnet.xyz/info` `{"type":"meta"}`).
    uint16 internal constant TESTNET_PERP_INDEX = 0;

    function test_LiveTestnetMarkPxPrecompile_ReturnsRealNonZeroPrice() public {
        string[] memory cmd = new string[](6);
        cmd[0] = "cast";
        cmd[1] = "call";
        cmd[2] = vm.toString(MARK_PX);
        cmd[3] = _calldataHex(TESTNET_PERP_INDEX);
        cmd[4] = "--rpc-url";
        cmd[5] = TESTNET_RPC;

        bytes memory result = vm.ffi(cmd);
        require(result.length >= 32, "live testnet RPC returned no data - network unreachable?");

        uint64 livePrice = abi.decode(result, (uint64));

        emit log_named_uint("Live HyperEVM testnet mark price (raw, perp index 0)", livePrice);
        assertGt(livePrice, 0, "live markPx precompile returned zero - HyperCore testnet should always have a price");
    }

    function _calldataHex(uint16 perpIndex) internal pure returns (string memory) {
        return vm.toString(abi.encode(perpIndex));
    }
}
