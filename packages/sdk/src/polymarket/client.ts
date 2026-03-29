// Read-only Polymarket CLOB client, adapted from clob-client/src/client.ts
// Uses fetch instead of axios to avoid the dependency

import type {
    BookParams,
    MarketPrice,
    OrderBookSummary,
    PaginationPayload,
    PriceHistoryFilterParams,
} from "../types.ts";
import {
    GET_LAST_TRADE_PRICE,
    GET_MARKET,
    GET_MARKETS,
    GET_MIDPOINT,
    GET_MIDPOINTS,
    GET_ORDER_BOOK,
    GET_PRICE,
    GET_PRICES,
    GET_PRICES_HISTORY,
    GET_SAMPLING_MARKETS,
    GET_SIMPLIFIED_MARKETS,
    GET_SPREAD,
} from "./endpoints.ts";

const CLOB_HOST = "https://clob.polymarket.com";
const INITIAL_CURSOR = "MA==";

export class PolymarketClient {
    readonly host: string;

    constructor(host?: string) {
        const h = host ?? CLOB_HOST;
        this.host = h.endsWith("/") ? h.slice(0, -1) : h;
    }

    public async getMarkets(next_cursor = INITIAL_CURSOR): Promise<PaginationPayload> {
        return this.get(`${this.host}${GET_MARKETS}`, { next_cursor });
    }

    public async getSimplifiedMarkets(next_cursor = INITIAL_CURSOR): Promise<PaginationPayload> {
        return this.get(`${this.host}${GET_SIMPLIFIED_MARKETS}`, { next_cursor });
    }

    public async getSamplingMarkets(): Promise<PaginationPayload> {
        return this.get(`${this.host}${GET_SAMPLING_MARKETS}`);
    }

    public async getMarket(conditionId: string): Promise<any> {
        return this.get(`${this.host}${GET_MARKET}${conditionId}`);
    }

    public async getOrderBook(tokenId: string): Promise<OrderBookSummary> {
        return this.get(`${this.host}${GET_ORDER_BOOK}`, { token_id: tokenId });
    }

    public async getMidpoint(tokenId: string): Promise<any> {
        return this.get(`${this.host}${GET_MIDPOINT}`, { token_id: tokenId });
    }

    public async getMidpoints(params: BookParams[]): Promise<any> {
        return this.post(`${this.host}${GET_MIDPOINTS}`, params);
    }

    public async getPrice(tokenId: string, side: string): Promise<any> {
        return this.get(`${this.host}${GET_PRICE}`, { token_id: tokenId, side });
    }

    public async getPrices(params: BookParams[]): Promise<any> {
        return this.post(`${this.host}${GET_PRICES}`, params);
    }

    public async getSpread(tokenId: string): Promise<any> {
        return this.get(`${this.host}${GET_SPREAD}`, { token_id: tokenId });
    }

    public async getLastTradePrice(tokenId: string): Promise<any> {
        return this.get(`${this.host}${GET_LAST_TRADE_PRICE}`, { token_id: tokenId });
    }

    public async getPricesHistory(params: PriceHistoryFilterParams): Promise<MarketPrice[]> {
        return this.get(`${this.host}${GET_PRICES_HISTORY}`, params as Record<string, any>);
    }

    // HTTP helpers using native fetch

    private async get(endpoint: string, params?: Record<string, any>): Promise<any> {
        let url = endpoint;
        if (params) {
            const searchParams = new URLSearchParams();
            for (const [key, value] of Object.entries(params)) {
                if (value !== undefined) {
                    searchParams.set(key, String(value));
                }
            }
            const qs = searchParams.toString();
            if (qs) url += `?${qs}`;
        }
        const resp = await fetch(url, {
            method: "GET",
            headers: { Accept: "application/json" },
        });
        if (!resp.ok) {
            throw new Error(`CLOB API error: ${resp.status} ${resp.statusText}`);
        }
        return resp.json();
    }

    private async post(endpoint: string, data: any): Promise<any> {
        const resp = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(data),
        });
        if (!resp.ok) {
            throw new Error(`CLOB API error: ${resp.status} ${resp.statusText}`);
        }
        return resp.json();
    }
}
