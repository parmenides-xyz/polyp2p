## PolyP2P

*Native leverage on Polymarket.*

$451M in USDC sits locked across Polymarket positions right now. Over half won't resolve for 30+ days. $155M stays frozen for over a year.

None of that capital earns yield, serves as margin, or offsets risk anywhere. It waits in a contract until resolution.

### What is PolyP2P?

PolyP2P brings peer-to-peer lending to Polymarket's outcome tokens. Traders borrow USDC against their Polymarket positions, and lenders earn yield by supplying capital to those borrowers. We're live on the Amoy testnet for Polygon PoS (alongside Polymarket's live contracts) at [polyp2p.xyz](https://polyp2p.xyz).

PolyP2P's frontend pulls live market data—prices, outcomes, icons—directly from Polymarket's CLOB API, so every position reflects real-time probability pricing.

### Why PolyP2P?

Currently, Polymarket offers no leverage. Capital stays completely idle—no margin trading, no hedging, nothing until resolution.

PolyP2P solves three problems:

1. **Borrow against your positions.** Post Polymarket shares as collateral, receive USDC. Interest rates emerge from a peer-to-peer orderbook. Repay anytime.

2. **Lend to Polymarket traders.** Supply USDC, set your rate, earn yield by filling loan requests. Borrower defaults transfer their collateral to you.

3. **Leverage your positions.** Loop collateral in one click—deposit USDC, split into conditional tokens, post as collateral, borrow more.

### Running locally

```bash
# Install dependencies
pnpm install

# Build the SDK
pnpm --filter @polylend/sdk build

# Run contract tests
forge test

# Start a local chain and deploy contracts
anvil &
forge script script/DeployTestnet.s.sol --broadcast --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
CONDITIONAL_TOKENS=<logged_address> USDC=<logged_address> forge script script/SetupTestMarket.s.sol --broadcast --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Start the frontend
pnpm --filter @polylend/app dev

# Start the market maker bot (separate terminal)
cd scripts
PRIVATE_KEY=<key> CHAIN_ID=31337 RPC_URL=http://localhost:8545 npx tsx src/market-maker.ts
```
