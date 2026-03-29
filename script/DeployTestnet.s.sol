// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "../lib/forge-std/src/Script.sol";
import {PolyLend} from "../src/PolyLend.sol";
import {USDC} from "../src/dev/USDC.sol";

contract DeployTestnet is Script {
    function run() public {
        address ct = vm.envAddress("CONDITIONAL_TOKENS");

        vm.startBroadcast();

        USDC usdc = new USDC();
        console.log("USDC:", address(usdc));

        PolyLend polyLend = new PolyLend(ct, address(usdc));
        console.log("PolyLend:", address(polyLend));

        usdc.mint(msg.sender, 1_000_000e6);
        console.log("Minted 1M USDC to deployer");

        vm.stopBroadcast();
    }
}
