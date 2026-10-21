// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PaperPerps} from "../src/PaperPerps.sol";

/// @notice Deploys PaperPerps. Run against HyperEVM testnet with:
///   forge script script/Deploy.s.sol:Deploy --rpc-url hyperevm_testnet --broadcast --private-key $DEPLOYER_PRIVATE_KEY
contract Deploy is Script {
    function run() external returns (PaperPerps) {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerKey);
        PaperPerps perps = new PaperPerps();
        vm.stopBroadcast();

        console.log("PaperPerps deployed at:", address(perps));
        return perps;
    }
}
