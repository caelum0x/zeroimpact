// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HyperCoreRead} from "./HyperCoreRead.sol";

/// @title PaperPerps
/// @notice Fully onchain perpetuals PAPER-TRADING engine on HyperEVM.
///
/// The four claims this contract makes literal:
///
/// 1. "1000x leverage" — `MAX_LEVERAGE == 1000`. Safe to allow because no real collateral
///    is ever custodied: `marginUsd6` is just a number in a mapping, not a token balance.
/// 2. "0 market impact" — trades never call HyperCore's matching engine (there is no
///    order placement, no CoreWriter action). Positions are bookkeeping entries settled
///    against a price *read* from HyperCore, never written to it.
/// 3. "100% user owned" — all state lives in `positions`/`history`, keyed by `msg.sender`.
///    There is no backend database and no admin key that can alter a user's position or
///    history; every state change is a transaction the user signs themselves.
/// 4. "Fully onchain" — every settlement price comes from `HyperCoreRead._markPx`, a
///    `staticcall` to HyperEVM's native read precompile at 0x...806, which answers with
///    live HyperCore state in the same block. No off-chain oracle, no keeper, no price
///    pushed by this contract's deployer.
contract PaperPerps is HyperCoreRead {
    uint32 public constant MAX_LEVERAGE = 1000;
    uint32 public constant MIN_LEVERAGE = 1;

    struct Position {
        bool open;
        bool isLong;
        uint16 perpIndex;
        uint32 leverage;
        uint64 entryPrice;
        uint64 openedAt;
        uint256 marginUsd6;
        uint256 notionalUsd6;
    }

    struct TradeRecord {
        uint16 perpIndex;
        bool isLong;
        bool liquidated;
        uint32 leverage;
        uint64 entryPrice;
        uint64 exitPrice;
        uint64 closedAt;
        uint256 marginUsd6;
        int256 pnlUsd6;
    }

    /// @dev position per (user, perpIndex) — one open position per perp per user.
    mapping(address => mapping(uint16 => Position)) public positions;

    /// @dev append-only trade history per user, used for the public leaderboard.
    mapping(address => TradeRecord[]) private _history;

    mapping(address => int256) public totalPnlUsd6;
    mapping(address => bool) private _isTrader;
    address[] private _traders;

    event PositionOpened(
        address indexed user, uint16 indexed perpIndex, bool isLong, uint256 marginUsd6, uint32 leverage, uint64 entryPrice
    );
    event PositionIncreased(
        address indexed user,
        uint16 indexed perpIndex,
        uint256 addedMarginUsd6,
        uint32 newLeverage,
        uint64 newEntryPrice,
        uint256 newNotionalUsd6
    );
    event PositionClosed(
        address indexed user, uint16 indexed perpIndex, uint64 exitPrice, int256 pnlUsd6, uint256 marginUsd6
    );
    event PositionLiquidated(
        address indexed user, uint16 indexed perpIndex, uint64 markPriceAtLiquidation, uint256 marginLostUsd6
    );

    error InvalidLeverage(uint32 leverage);
    error InvalidMargin();
    error NoOpenPosition();
    error PositionDirectionMismatch();
    error ZeroPrice();

    /// @notice Open a new virtual leveraged position, or add margin to an existing one in
    ///         the same direction (increase). Reverts if a position is open in the
    ///         opposite direction — close it first.
    /// @param perpIndex Hyperliquid numeric perp asset index (see Hyperliquid `/info` meta,
    ///        e.g. 0 == BTC on mainnet; indices are venue-defined, not hardcoded here).
    /// @param isLong true for long, false for short.
    /// @param marginUsd6 virtual margin posted, in 1e6-scaled USD (6 decimals, like USDC).
    /// @param leverage 1..1000.
    function openPosition(uint16 perpIndex, bool isLong, uint256 marginUsd6, uint32 leverage) external {
        if (leverage < MIN_LEVERAGE || leverage > MAX_LEVERAGE) revert InvalidLeverage(leverage);
        if (marginUsd6 == 0) revert InvalidMargin();

        _liquidateIfNecessary(msg.sender, perpIndex);
        // (return values unused here: a fresh/increased position is opened unconditionally
        // right after, whether or not a prior position on this perp just got liquidated)

        uint64 currentPrice = _markPx(perpIndex);
        if (currentPrice == 0) revert ZeroPrice();

        Position storage p = positions[msg.sender][perpIndex];
        uint256 addedNotional = marginUsd6 * leverage;

        if (p.open) {
            if (p.isLong != isLong) revert PositionDirectionMismatch();

            uint256 newNotional = p.notionalUsd6 + addedNotional;
            // Notional-weighted average entry price across the old and new tranche. Safe:
            // weighted average of two uint64 prices always fits in uint64.
            // forge-lint: disable-next-line(unsafe-typecast)
            uint64 newEntryPrice = uint64((p.notionalUsd6 * p.entryPrice + addedNotional * currentPrice) / newNotional);
            uint256 newMargin = p.marginUsd6 + marginUsd6;
            // Safe: weighted average of two leverages each <= MAX_LEVERAGE (1000) fits in uint32.
            // forge-lint: disable-next-line(unsafe-typecast)
            uint32 newLeverage = uint32(newNotional / newMargin);
            if (newLeverage < MIN_LEVERAGE) newLeverage = MIN_LEVERAGE;

            p.marginUsd6 = newMargin;
            p.notionalUsd6 = newNotional;
            p.entryPrice = newEntryPrice;
            p.leverage = newLeverage;

            emit PositionIncreased(msg.sender, perpIndex, marginUsd6, newLeverage, newEntryPrice, newNotional);
        } else {
            positions[msg.sender][perpIndex] = Position({
                open: true,
                isLong: isLong,
                perpIndex: perpIndex,
                leverage: leverage,
                entryPrice: currentPrice,
                openedAt: uint64(block.timestamp),
                marginUsd6: marginUsd6,
                notionalUsd6: addedNotional
            });
            _registerTrader(msg.sender);
            emit PositionOpened(msg.sender, perpIndex, isLong, marginUsd6, leverage, currentPrice);
        }
    }

    /// @notice Close the caller's open position on `perpIndex`, settling PnL against the
    ///         live HyperCore mark price and appending to the caller's append-only history.
    function closePosition(uint16 perpIndex) external returns (int256 pnlUsd6) {
        // If the position was already underwater, this call *is* the liquidation — it
        // commits (event + history + cleared position) and returns the realized loss
        // rather than reverting, exactly like a real "close" would.
        (bool wasLiquidated, int256 liqPnl) = _liquidateIfNecessary(msg.sender, perpIndex);
        if (wasLiquidated) return liqPnl;

        Position storage p = positions[msg.sender][perpIndex];
        if (!p.open) revert NoOpenPosition();

        uint64 exitPrice = _markPx(perpIndex);
        if (exitPrice == 0) revert ZeroPrice();

        pnlUsd6 = _computePnl(p, exitPrice);

        _appendHistory(msg.sender, p, exitPrice, pnlUsd6, false);

        emit PositionClosed(msg.sender, perpIndex, exitPrice, pnlUsd6, p.marginUsd6);

        delete positions[msg.sender][perpIndex];
    }

    /// @notice Live unrealized PnL + equity preview for an open position, read-only (no
    ///         gas, no transaction) — used by the frontend's live PnL view.
    function previewEquity(address user, uint16 perpIndex)
        external
        view
        returns (bool open, int256 pnlUsd6, int256 equityUsd6, uint64 markPrice)
    {
        Position storage p = positions[user][perpIndex];
        if (!p.open) {
            return (false, 0, 0, 0);
        }
        markPrice = _markPx(perpIndex);
        pnlUsd6 = _computePnl(p, markPrice);
        equityUsd6 = int256(p.marginUsd6) + pnlUsd6;
        open = true;
    }

    /// @notice Public passthrough to the live HyperCore mark price precompile, so the
    ///         frontend / anyone can confirm onchain that the price this contract settles
    ///         against really is HyperCore's own live mark price.
    function getMarkPrice(uint16 perpIndex) external view returns (uint64) {
        return _markPx(perpIndex);
    }

    function historyLength(address user) external view returns (uint256) {
        return _history[user].length;
    }

    function historyAt(address user, uint256 index) external view returns (TradeRecord memory) {
        return _history[user][index];
    }

    function getHistory(address user) external view returns (TradeRecord[] memory) {
        return _history[user];
    }

    function traderCount() external view returns (uint256) {
        return _traders.length;
    }

    /// @notice Paginated leaderboard: every trader who has ever opened a position, with
    ///         their cumulative realized PnL from closed/liquidated trades.
    function leaderboard(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory traders, int256[] memory pnls)
    {
        uint256 total = _traders.length;
        if (offset >= total) {
            return (new address[](0), new int256[](0));
        }
        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 n = end - offset;

        traders = new address[](n);
        pnls = new int256[](n);
        for (uint256 i = 0; i < n; i++) {
            address user = _traders[offset + i];
            traders[i] = user;
            pnls[i] = totalPnlUsd6[user];
        }
    }

    /// @dev If the caller's position on `perpIndex` has equity <= 0 at the current live
    ///      mark price, force-liquidate it: record the full margin loss to history and
    ///      clear the position. Called at the top of every state-changing entrypoint so a
    ///      liquidatable position is always settled on the very next interaction, exactly
    ///      as the spec requires ("auto-liquidates on the next interaction").
    function _liquidateIfNecessary(address user, uint16 perpIndex)
        internal
        returns (bool liquidated, int256 pnlUsd6)
    {
        Position storage p = positions[user][perpIndex];
        if (!p.open) return (false, 0);

        uint64 currentPrice = _markPx(perpIndex);
        if (currentPrice == 0) return (false, 0);

        int256 pnl = _computePnl(p, currentPrice);
        int256 equity = int256(p.marginUsd6) + pnl;

        if (equity <= 0) {
            int256 fullLoss = -int256(p.marginUsd6);
            uint256 marginLost = p.marginUsd6;
            _appendHistory(user, p, currentPrice, fullLoss, true);
            emit PositionLiquidated(user, perpIndex, currentPrice, marginLost);
            delete positions[user][perpIndex];
            return (true, fullLoss);
        }
        return (false, 0);
    }

    function _computePnl(Position storage p, uint64 currentPrice) internal view returns (int256) {
        int256 priceDelta = int256(uint256(currentPrice)) - int256(uint256(p.entryPrice));
        int256 notional = int256(p.notionalUsd6);
        int256 raw = (notional * priceDelta) / int256(uint256(p.entryPrice));
        return p.isLong ? raw : -raw;
    }

    function _appendHistory(address user, Position storage p, uint64 exitPrice, int256 pnlUsd6, bool liquidated)
        internal
    {
        _history[user].push(
            TradeRecord({
                perpIndex: p.perpIndex,
                isLong: p.isLong,
                liquidated: liquidated,
                leverage: p.leverage,
                entryPrice: p.entryPrice,
                exitPrice: exitPrice,
                closedAt: uint64(block.timestamp),
                marginUsd6: p.marginUsd6,
                pnlUsd6: pnlUsd6
            })
        );
        totalPnlUsd6[user] += pnlUsd6;
        _registerTrader(user);
    }

    function _registerTrader(address user) internal {
        if (!_isTrader[user]) {
            _isTrader[user] = true;
            _traders.push(user);
        }
    }
}
