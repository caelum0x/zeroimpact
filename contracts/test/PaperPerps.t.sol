// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PaperPerps} from "../src/PaperPerps.sol";

/// @notice Foundry cannot execute HyperEVM's native read precompiles inside a plain unit
///         test VM (they are chain-level native logic, not deployed bytecode) — so every
///         test here mocks the exact `staticcall` the contract makes to 0x...806 via
///         `vm.mockCall`, matching Hyperliquid's own documented calling convention
///         (`staticcall(abi.encode(perpIndex))` -> `abi.decode(_, (uint64))`). This proves
///         the contract's *logic* is correct against any price the precompile could ever
///         return. `test/TestnetPrecompileIntegration.t.sol` is the companion test that
///         hits the *real* live testnet precompile over RPC.
contract PaperPerpsTest is Test {
    PaperPerps internal perps;

    address internal constant MARK_PX = 0x0000000000000000000000000000000000000806;

    uint16 internal constant BTC = 3;
    uint16 internal constant ETH = 4;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function setUp() public {
        perps = new PaperPerps();
    }

    function _mockPrice(uint16 perpIndex, uint64 price) internal {
        vm.mockCall(MARK_PX, abi.encode(perpIndex), abi.encode(price));
    }

    // ---------------------------------------------------------------- open

    function test_OpenPosition_StoresPositionAtLivePrice() public {
        _mockPrice(BTC, 60_000e6);

        vm.prank(alice);
        perps.openPosition(BTC, true, 1_000e6, 10);

        (bool open, bool isLong, uint16 perpIndex, uint32 leverage, uint64 entryPrice,, uint256 margin, uint256 notional) =
            perps.positions(alice, BTC);

        assertTrue(open);
        assertTrue(isLong);
        assertEq(perpIndex, BTC);
        assertEq(leverage, 10);
        assertEq(entryPrice, 60_000e6);
        assertEq(margin, 1_000e6);
        assertEq(notional, 10_000e6);
    }

    function test_OpenPosition_RevertsOnLeverageZero() public {
        _mockPrice(BTC, 60_000e6);
        vm.expectRevert(abi.encodeWithSelector(PaperPerps.InvalidLeverage.selector, uint32(0)));
        vm.prank(alice);
        perps.openPosition(BTC, true, 1_000e6, 0);
    }

    function test_OpenPosition_RevertsOnLeverageAbove1000x() public {
        _mockPrice(BTC, 60_000e6);
        vm.expectRevert(abi.encodeWithSelector(PaperPerps.InvalidLeverage.selector, uint32(1001)));
        vm.prank(alice);
        perps.openPosition(BTC, true, 1_000e6, 1001);
    }

    function test_OpenPosition_Allows1000xLeverage() public {
        _mockPrice(BTC, 60_000e6);
        vm.prank(alice);
        perps.openPosition(BTC, true, 100e6, 1000);

        (bool open,,, uint32 leverage,,,, uint256 notional) = perps.positions(alice, BTC);
        assertTrue(open);
        assertEq(leverage, 1000);
        assertEq(notional, 100_000e6);
    }

    function test_OpenPosition_RevertsOnZeroMargin() public {
        _mockPrice(BTC, 60_000e6);
        vm.expectRevert(PaperPerps.InvalidMargin.selector);
        vm.prank(alice);
        perps.openPosition(BTC, true, 0, 10);
    }

    function test_OpenPosition_NoRealTokenTransfer() public {
        // "No custodial backend" / "100% user owned": opening a position must never move
        // ETH or any token out of the caller's wallet — it is pure bookkeeping.
        _mockPrice(BTC, 60_000e6);
        uint256 balBefore = alice.balance;
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        perps.openPosition(BTC, true, 1_000e6, 10);
        assertEq(alice.balance, 1 ether);
        assertEq(address(perps).balance, 0);
        balBefore; // silence unused warning in some solc configs
    }

    // ------------------------------------------------------------ increase

    function test_IncreasePosition_AveragesEntryPriceAndLeverage() public {
        _mockPrice(BTC, 60_000e6);
        vm.prank(alice);
        perps.openPosition(BTC, true, 1_000e6, 10); // notional 10_000e6 @ 60_000e6

        _mockPrice(BTC, 70_000e6);
        vm.prank(alice);
        perps.openPosition(BTC, true, 1_000e6, 10); // notional 10_000e6 @ 70_000e6

        (bool open, bool isLong,, uint32 leverage, uint64 entryPrice,, uint256 margin, uint256 notional) =
            perps.positions(alice, BTC);

        assertTrue(open);
        assertTrue(isLong);
        assertEq(margin, 2_000e6);
        assertEq(notional, 20_000e6);
        assertEq(leverage, 10);
        // notional-weighted average: (10_000e6*60_000e6 + 10_000e6*70_000e6) / 20_000e6
        assertEq(entryPrice, 65_000e6);
    }

    function test_IncreasePosition_RevertsOnOppositeDirection() public {
        _mockPrice(BTC, 60_000e6);
        vm.prank(alice);
        perps.openPosition(BTC, true, 1_000e6, 10);

        vm.expectRevert(PaperPerps.PositionDirectionMismatch.selector);
        vm.prank(alice);
        perps.openPosition(BTC, false, 500e6, 5);
    }

    // --------------------------------------------------------------- close

    function test_ClosePosition_LongProfit() public {
        _mockPrice(BTC, 50_000e6);
        vm.prank(alice);
        perps.openPosition(BTC, true, 1_000e6, 10); // notional 10_000e6

        _mockPrice(BTC, 55_000e6); // +10% move
        vm.prank(alice);
        int256 pnl = perps.closePosition(BTC);

        // pnl = notional * (55000-50000)/50000 = 10_000e6 * 0.10 = 1_000e6
        assertEq(pnl, 1_000e6);
        assertEq(perps.totalPnlUsd6(alice), 1_000e6);

        (bool open,,,,,,,) = perps.positions(alice, BTC);
        assertFalse(open);

        PaperPerps.TradeRecord[] memory hist = perps.getHistory(alice);
        assertEq(hist.length, 1);
        assertEq(hist[0].pnlUsd6, 1_000e6);
        assertFalse(hist[0].liquidated);
        assertEq(hist[0].exitPrice, 55_000e6);
    }

    function test_ClosePosition_ShortProfit() public {
        _mockPrice(ETH, 3_000e6);
        vm.prank(bob);
        perps.openPosition(ETH, false, 500e6, 20); // notional 10_000e6 short

        _mockPrice(ETH, 2_700e6); // -10% move, good for shorts
        vm.prank(bob);
        int256 pnl = perps.closePosition(ETH);

        // short pnl = -(notional * delta/entry) = -(10_000e6 * (2700-3000)/3000) = 1_000e6
        assertEq(pnl, 1_000e6);
    }

    function test_ClosePosition_RevertsWhenNoOpenPosition() public {
        vm.expectRevert(PaperPerps.NoOpenPosition.selector);
        vm.prank(alice);
        perps.closePosition(BTC);
    }

    // ---------------------------------------------------------- liquidation

    function test_Liquidation_AutoTriggersOnNextInteractionWhenUnderwater() public {
        _mockPrice(BTC, 60_000e6);
        vm.prank(alice);
        perps.openPosition(BTC, true, 1_000e6, 100); // notional 100_000e6, 1% move wipes margin

        // Price drops >1% against a 100x long -> equity <= 0.
        _mockPrice(BTC, 59_000e6);

        vm.expectEmit(true, true, false, false);
        emit PaperPerps.PositionLiquidated(alice, BTC, 59_000e6, 1_000e6);

        // closePosition() on an already-underwater position *is* the liquidation: it
        // commits and returns the realized full-margin loss, it does not revert.
        vm.prank(alice);
        int256 pnl = perps.closePosition(BTC);
        assertEq(pnl, -1_000e6);

        (bool open,,,,,,,) = perps.positions(alice, BTC);
        assertFalse(open);

        PaperPerps.TradeRecord[] memory hist = perps.getHistory(alice);
        assertEq(hist.length, 1);
        assertTrue(hist[0].liquidated);
        assertEq(hist[0].pnlUsd6, -1_000e6);
        assertEq(perps.totalPnlUsd6(alice), -1_000e6);
    }

    function test_Liquidation_SettlesBeforeNewOpenOnSamePerp() public {
        _mockPrice(BTC, 60_000e6);
        vm.prank(alice);
        perps.openPosition(BTC, true, 1_000e6, 100);

        _mockPrice(BTC, 59_000e6); // underwater
        vm.prank(alice);
        perps.openPosition(BTC, true, 500e6, 5); // fresh open triggers liquidation first

        PaperPerps.TradeRecord[] memory hist = perps.getHistory(alice);
        assertEq(hist.length, 1);
        assertTrue(hist[0].liquidated);

        (bool open,,, uint32 leverage,,,, uint256 notional) = perps.positions(alice, BTC);
        assertTrue(open);
        assertEq(leverage, 5);
        assertEq(notional, 2_500e6);
    }

    // ------------------------------------------------------------- preview

    function test_PreviewEquity_ReflectsLivePriceWithoutMutatingState() public {
        _mockPrice(BTC, 60_000e6);
        vm.prank(alice);
        perps.openPosition(BTC, true, 1_000e6, 10);

        _mockPrice(BTC, 66_000e6);
        (bool open, int256 pnl, int256 equity, uint64 mark) = perps.previewEquity(alice, BTC);

        assertTrue(open);
        assertEq(mark, 66_000e6);
        assertEq(pnl, 1_000e6); // 10_000e6 * 10% move
        assertEq(equity, 2_000e6); // margin 1000e6 + pnl 1000e6

        // Preview is a view call — position must be untouched.
        (bool stillOpen,,,, uint64 entryPrice,,,) = perps.positions(alice, BTC);
        assertTrue(stillOpen);
        assertEq(entryPrice, 60_000e6);
    }

    function test_GetMarkPrice_PassesThroughLivePrecompile() public {
        _mockPrice(ETH, 3_456e6);
        assertEq(perps.getMarkPrice(ETH), 3_456e6);
    }

    // --------------------------------------------------------- leaderboard

    function test_Leaderboard_TracksEveryTraderAndCumulativePnl() public {
        _mockPrice(BTC, 60_000e6);
        vm.prank(alice);
        perps.openPosition(BTC, true, 1_000e6, 10);

        _mockPrice(ETH, 3_000e6);
        vm.prank(bob);
        perps.openPosition(ETH, true, 1_000e6, 10);

        _mockPrice(BTC, 66_000e6);
        vm.prank(alice);
        perps.closePosition(BTC);

        assertEq(perps.traderCount(), 2);

        (address[] memory traders, int256[] memory pnls) = perps.leaderboard(0, 10);
        assertEq(traders.length, 2);
        assertEq(traders[0], alice);
        assertEq(traders[1], bob);
        assertEq(pnls[0], 1_000e6);
        assertEq(pnls[1], 0);
    }

    function test_Leaderboard_PaginatesCorrectly() public {
        _mockPrice(BTC, 100e6);
        for (uint256 i = 0; i < 5; i++) {
            address trader = address(uint160(1000 + i));
            vm.prank(trader);
            perps.openPosition(BTC, true, 10e6, 2);
        }

        (address[] memory page1,) = perps.leaderboard(0, 2);
        (address[] memory page2,) = perps.leaderboard(2, 2);
        (address[] memory page3,) = perps.leaderboard(4, 2);

        assertEq(page1.length, 2);
        assertEq(page2.length, 2);
        assertEq(page3.length, 1);
    }

    // ---------------------------------------------------------------- fuzz

    function testFuzz_LongAndShortPnlAreMirrorImages(
        uint64 entryRaw,
        uint32 leverageRaw,
        int32 bpsMoveRaw,
        uint128 marginRaw
    ) public {
        uint64 entry = uint64(bound(entryRaw, 1e6, 1_000_000e6));
        uint32 leverage = uint32(bound(leverageRaw, 1, 1000));
        uint256 margin = bound(marginRaw, 1e6, 1_000_000e6);

        // Keep the move well inside both sides' liquidation threshold (loss fraction *
        // leverage < 1) so both the long and the short can close normally and we're
        // testing PnL symmetry, not the liquidation path (that's covered separately above).
        int256 maxBps = int256(10_000) / int256(uint256(leverage)) / 2;
        if (maxBps < 1) maxBps = 1;
        int256 bpsMove = bound(int256(bpsMoveRaw), -maxBps, maxBps);
        int256 exitSigned = int256(uint256(entry)) + (int256(uint256(entry)) * bpsMove) / 10_000;
        if (exitSigned < 1e6) exitSigned = 1e6;
        uint64 exit = uint64(uint256(exitSigned));

        _mockPrice(BTC, entry);
        vm.prank(alice);
        perps.openPosition(BTC, true, margin, leverage);

        _mockPrice(BTC, entry);
        vm.prank(bob);
        perps.openPosition(BTC, false, margin, leverage);

        _mockPrice(BTC, exit);
        vm.prank(alice);
        int256 longPnl = perps.closePosition(BTC);

        vm.prank(bob);
        int256 shortPnl = perps.closePosition(BTC);

        assertEq(longPnl, -shortPnl);
    }
}
