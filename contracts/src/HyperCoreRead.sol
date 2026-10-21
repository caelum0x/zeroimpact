// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title HyperCoreRead
/// @notice Thin wrapper around HyperEVM's native read precompiles that expose live
///         HyperCore (Hyperliquid's L1 order book / perp engine) state to EVM contracts.
///         This is what makes ZeroImpact's pricing "fully onchain" rather than reliant on
///         an off-chain price oracle: every price read in this file is a `staticcall` to a
///         fixed, protocol-defined address that the HyperEVM node itself answers by reading
///         live HyperCore state, in the same block the EVM call executes.
///
///         Addresses and calling convention are the canonical ones published by Hyperliquid
///         in `L1Read.sol` (docs.hyperliquid.xyz -> HyperEVM -> "Interacting with HyperCore").
///         Reference copies of the same addresses/signatures exist in several public repos,
///         e.g. kyriediculous/hello-hl and code-423n4/2025-04-kinetiq (src/lib/L1Read.sol).
contract HyperCoreRead {
    /// @dev Returns the live mark price of a perpetual at `perpIndex`. Mark price is the
    ///      price HyperCore itself uses to mark positions / compute funding and margin — it
    ///      is the canonical "what is this perp worth right now" number on Hyperliquid.
    address internal constant MARK_PX_PRECOMPILE_ADDRESS = 0x0000000000000000000000000000000000000806;

    /// @dev Returns HyperCore's independent oracle price for a perp at `perpIndex` (a
    ///      median of external venue prices, used for liquidation safety checks on
    ///      HyperCore itself). Exposed for completeness / future use; ZeroImpact settles
    ///      against markPx by default because that is the price HyperCore's own perp
    ///      engine marks positions against.
    address internal constant ORACLE_PX_PRECOMPILE_ADDRESS = 0x0000000000000000000000000000000000000807;

    error PrecompileCallFailed(address target, bytes data);

    /// @notice Reads the live HyperCore mark price for `perpIndex`.
    /// @dev Reverts with `PrecompileCallFailed` if the staticcall itself fails (e.g. bad
    ///      index, or running on a chain without the precompile deployed).
    function _markPx(uint16 perpIndex) internal view returns (uint64 price) {
        (bool success, bytes memory result) = MARK_PX_PRECOMPILE_ADDRESS.staticcall(abi.encode(perpIndex));
        if (!success || result.length < 32) revert PrecompileCallFailed(MARK_PX_PRECOMPILE_ADDRESS, result);
        price = abi.decode(result, (uint64));
    }

    /// @notice Reads the live HyperCore oracle price for `perpIndex`. Not used for
    ///         settlement in V1 but kept available as a sanity-check / future liquidation
    ///         safety net.
    function _oraclePx(uint16 perpIndex) internal view returns (uint64 price) {
        (bool success, bytes memory result) = ORACLE_PX_PRECOMPILE_ADDRESS.staticcall(abi.encode(perpIndex));
        if (!success || result.length < 32) revert PrecompileCallFailed(ORACLE_PX_PRECOMPILE_ADDRESS, result);
        price = abi.decode(result, (uint64));
    }
}
