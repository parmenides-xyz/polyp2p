// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "../lib/forge-std/src/Script.sol";
import {USDC} from "../src/dev/USDC.sol";
import {IConditionalTokens} from "../src/interfaces/IConditionalTokens.sol";

contract SetupTestMarket is Script {
    function run() public {
        address ct = vm.envAddress("CONDITIONAL_TOKENS");
        address usdc = vm.envAddress("USDC");

        IConditionalTokens conditionalTokens = IConditionalTokens(ct);

        vm.startBroadcast();

        bytes32 questionId = keccak256("POLYMARKET-TEST-MARKET");
        conditionalTokens.prepareCondition(msg.sender, questionId, 2);
        bytes32 conditionId = conditionalTokens.getConditionId(msg.sender, questionId, 2);
        console.log("ConditionId:");
        console.logBytes32(conditionId);

        bytes32 collectionId0 = conditionalTokens.getCollectionId(bytes32(0), conditionId, 1);
        uint256 positionId0 = conditionalTokens.getPositionId(usdc, collectionId0);

        bytes32 collectionId1 = conditionalTokens.getCollectionId(bytes32(0), conditionId, 2);
        uint256 positionId1 = conditionalTokens.getPositionId(usdc, collectionId1);

        console.log("PositionId0 (YES):", positionId0);
        console.log("PositionId1 (NO):", positionId1);

        uint256 splitAmount = 100_000e6;
        USDC(usdc).approve(ct, splitAmount);

        uint256[] memory partition = new uint256[](2);
        partition[0] = 1;
        partition[1] = 2;

        conditionalTokens.splitPosition(usdc, bytes32(0), conditionId, partition, splitAmount);
        console.log("Split 100K USDC into conditional tokens");

        vm.stopBroadcast();
    }
}
