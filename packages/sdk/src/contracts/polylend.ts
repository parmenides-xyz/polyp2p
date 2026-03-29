import type { PublicClient } from "viem";
import type { Loan, Offer, Request } from "../types.ts";
import { polyLendAbi } from "./abi.ts";

// Read functions

export async function getLoan(
    client: PublicClient,
    address: `0x${string}`,
    loanId: bigint,
): Promise<Loan> {
    const result = await client.readContract({
        address,
        abi: polyLendAbi,
        functionName: "loans",
        args: [loanId],
    });
    const [borrower, lender, positionId, collateralAmount, loanAmount, rate, startTime, minimumDuration, callTime] =
        result as [
            `0x${string}`,
            `0x${string}`,
            bigint,
            bigint,
            bigint,
            bigint,
            bigint,
            bigint,
            bigint,
        ];
    return { borrower, lender, positionId, collateralAmount, loanAmount, rate, startTime, minimumDuration, callTime };
}

export async function getRequest(
    client: PublicClient,
    address: `0x${string}`,
    requestId: bigint,
): Promise<Request> {
    const result = await client.readContract({
        address,
        abi: polyLendAbi,
        functionName: "requests",
        args: [requestId],
    });
    const [borrower, positionId, collateralAmount, minimumDuration] = result as [
        `0x${string}`,
        bigint,
        bigint,
        bigint,
    ];
    return { borrower, positionId, collateralAmount, minimumDuration };
}

export async function getOffer(
    client: PublicClient,
    address: `0x${string}`,
    offerId: bigint,
): Promise<Offer> {
    const result = await client.readContract({
        address,
        abi: polyLendAbi,
        functionName: "offers",
        args: [offerId],
    });
    const [requestId, lender, loanAmount, rate] = result as [bigint, `0x${string}`, bigint, bigint];
    return { requestId, lender, loanAmount, rate };
}

export async function getNextLoanId(client: PublicClient, address: `0x${string}`): Promise<bigint> {
    return client.readContract({
        address,
        abi: polyLendAbi,
        functionName: "nextLoanId",
    }) as Promise<bigint>;
}

export async function getNextRequestId(client: PublicClient, address: `0x${string}`): Promise<bigint> {
    return client.readContract({
        address,
        abi: polyLendAbi,
        functionName: "nextRequestId",
    }) as Promise<bigint>;
}

export async function getNextOfferId(client: PublicClient, address: `0x${string}`): Promise<bigint> {
    return client.readContract({
        address,
        abi: polyLendAbi,
        functionName: "nextOfferId",
    }) as Promise<bigint>;
}

export async function getAmountOwed(
    client: PublicClient,
    address: `0x${string}`,
    loanId: bigint,
    paybackTime: bigint,
): Promise<bigint> {
    return client.readContract({
        address,
        abi: polyLendAbi,
        functionName: "getAmountOwed",
        args: [loanId, paybackTime],
    }) as Promise<bigint>;
}

// Event watching

export function watchLoanRequested(
    client: PublicClient,
    address: `0x${string}`,
    onLogs: (logs: any[]) => void,
) {
    return client.watchContractEvent({
        address,
        abi: polyLendAbi,
        eventName: "LoanRequested",
        onLogs,
    });
}

export function watchLoanOffered(
    client: PublicClient,
    address: `0x${string}`,
    onLogs: (logs: any[]) => void,
) {
    return client.watchContractEvent({
        address,
        abi: polyLendAbi,
        eventName: "LoanOffered",
        onLogs,
    });
}

export function watchLoanAccepted(
    client: PublicClient,
    address: `0x${string}`,
    onLogs: (logs: any[]) => void,
) {
    return client.watchContractEvent({
        address,
        abi: polyLendAbi,
        eventName: "LoanAccepted",
        onLogs,
    });
}

export function watchLoanRepaid(
    client: PublicClient,
    address: `0x${string}`,
    onLogs: (logs: any[]) => void,
) {
    return client.watchContractEvent({
        address,
        abi: polyLendAbi,
        eventName: "LoanRepaid",
        onLogs,
    });
}

export function watchLoanCalled(
    client: PublicClient,
    address: `0x${string}`,
    onLogs: (logs: any[]) => void,
) {
    return client.watchContractEvent({
        address,
        abi: polyLendAbi,
        eventName: "LoanCalled",
        onLogs,
    });
}

export function watchLoanTransferred(
    client: PublicClient,
    address: `0x${string}`,
    onLogs: (logs: any[]) => void,
) {
    return client.watchContractEvent({
        address,
        abi: polyLendAbi,
        eventName: "LoanTransferred",
        onLogs,
    });
}

export function watchLoanReclaimed(
    client: PublicClient,
    address: `0x${string}`,
    onLogs: (logs: any[]) => void,
) {
    return client.watchContractEvent({
        address,
        abi: polyLendAbi,
        eventName: "LoanReclaimed",
        onLogs,
    });
}
