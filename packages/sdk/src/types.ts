// Mirrors Solidity structs from PolyLend.sol

export interface Loan {
    borrower: `0x${string}`;
    lender: `0x${string}`;
    positionId: bigint;
    collateralAmount: bigint;
    loanAmount: bigint;
    rate: bigint;
    startTime: bigint;
    minimumDuration: bigint;
    callTime: bigint;
}

export interface Request {
    borrower: `0x${string}`;
    positionId: bigint;
    collateralAmount: bigint;
    minimumDuration: bigint;
}

export interface Offer {
    requestId: bigint;
    lender: `0x${string}`;
    loanAmount: bigint;
    rate: bigint;
}

// Polymarket CLOB types (subset of @polymarket/clob-client types)

export interface OrderBookSummary {
    market: string;
    asset_id: string;
    timestamp: string;
    bids: OrderSummary[];
    asks: OrderSummary[];
    min_order_size: string;
    tick_size: string;
    neg_risk: boolean;
    last_trade_price: string;
    hash: string;
}

export interface OrderSummary {
    price: string;
    size: string;
}

export interface MarketPrice {
    t: number;
    p: number;
}

export enum Side {
    BUY = "BUY",
    SELL = "SELL",
}

export interface BookParams {
    token_id: string;
    side: Side;
}

export interface PriceHistoryFilterParams {
    market?: string;
    startTs?: number;
    endTs?: number;
    fidelity?: number;
    interval?: PriceHistoryInterval;
}

export enum PriceHistoryInterval {
    MAX = "max",
    ONE_WEEK = "1w",
    ONE_DAY = "1d",
    SIX_HOURS = "6h",
    ONE_HOUR = "1h",
}

export interface PaginationPayload {
    readonly limit: number;
    readonly count: number;
    readonly next_cursor: string;
    readonly data: any[];
}
