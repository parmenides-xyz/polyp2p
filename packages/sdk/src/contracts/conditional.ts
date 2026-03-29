import type { PublicClient } from "viem";
import { conditionalTokensAbi } from "./abi.ts";

export async function getBalance(
    client: PublicClient,
    address: `0x${string}`,
    owner: `0x${string}`,
    positionId: bigint,
): Promise<bigint> {
    return client.readContract({
        address,
        abi: conditionalTokensAbi,
        functionName: "balanceOf",
        args: [owner, positionId],
    }) as Promise<bigint>;
}

export async function isApprovedForAll(
    client: PublicClient,
    address: `0x${string}`,
    owner: `0x${string}`,
    operator: `0x${string}`,
): Promise<boolean> {
    return client.readContract({
        address,
        abi: conditionalTokensAbi,
        functionName: "isApprovedForAll",
        args: [owner, operator],
    }) as Promise<boolean>;
}

export async function getConditionId(
    client: PublicClient,
    address: `0x${string}`,
    oracle: `0x${string}`,
    questionId: `0x${string}`,
    outcomeSlotCount: bigint,
): Promise<`0x${string}`> {
    return client.readContract({
        address,
        abi: conditionalTokensAbi,
        functionName: "getConditionId",
        args: [oracle, questionId, outcomeSlotCount],
    }) as Promise<`0x${string}`>;
}

export async function getCollectionId(
    client: PublicClient,
    address: `0x${string}`,
    parentCollectionId: `0x${string}`,
    conditionId: `0x${string}`,
    indexSet: bigint,
): Promise<`0x${string}`> {
    return client.readContract({
        address,
        abi: conditionalTokensAbi,
        functionName: "getCollectionId",
        args: [parentCollectionId, conditionId, indexSet],
    }) as Promise<`0x${string}`>;
}

export async function getPositionId(
    client: PublicClient,
    address: `0x${string}`,
    collateralToken: `0x${string}`,
    collectionId: `0x${string}`,
): Promise<bigint> {
    return client.readContract({
        address,
        abi: conditionalTokensAbi,
        functionName: "getPositionId",
        args: [collateralToken, collectionId],
    }) as Promise<bigint>;
}
