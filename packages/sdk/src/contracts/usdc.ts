import type { PublicClient } from "viem";
import { usdcAbi } from "./abi.ts";

export async function getBalance(
    client: PublicClient,
    address: `0x${string}`,
    owner: `0x${string}`,
): Promise<bigint> {
    return client.readContract({
        address,
        abi: usdcAbi,
        functionName: "balanceOf",
        args: [owner],
    }) as Promise<bigint>;
}

export async function getAllowance(
    client: PublicClient,
    address: `0x${string}`,
    owner: `0x${string}`,
    spender: `0x${string}`,
): Promise<bigint> {
    return client.readContract({
        address,
        abi: usdcAbi,
        functionName: "allowance",
        args: [owner, spender],
    }) as Promise<bigint>;
}
