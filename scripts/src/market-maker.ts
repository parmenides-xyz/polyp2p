import 'dotenv/config';
import { Mutex } from 'async-mutex';
import {
    createPublicClient,
    createWalletClient,
    http,
    type PublicClient,
    type WalletClient,
    type WatchContractEventReturnType,
    maxUint256,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry, polygonAmoy } from 'viem/chains';
import {
    polyLendAbi,
    usdcAbi,
    getContractConfig,
    apyToRate,
} from '@polylend/sdk';
import type { ContractConfig } from '@polylend/sdk';
import { logger } from './logger.ts';

interface Bot {
    readonly name: string;
    init: () => Promise<void>;
    reset: () => Promise<void>;
    startIntervalLoop: () => Promise<void>;
    healthCheck: () => Promise<boolean>;
}

interface MarketMakerConfig {
    privateKey: `0x${string}`;
    rpcUrl: string;
    chainId: number;
    offerApyPercent: number;
    offerLtvPercent: number;
}

function loadConfig(): MarketMakerConfig {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        throw new Error('Must set PRIVATE_KEY environment variable');
    }
    return {
        privateKey: privateKey as `0x${string}`,
        rpcUrl: process.env.RPC_URL ?? 'http://localhost:8545',
        chainId: Number(process.env.CHAIN_ID ?? '31337'),
        offerApyPercent: Number(process.env.OFFER_APY ?? '10'),
        offerLtvPercent: Number(process.env.OFFER_LTV ?? '50'),
    };
}

function getChain(chainId: number) {
    switch (chainId) {
        case 31337:
            return foundry;
        case 80002:
            return polygonAmoy;
        default:
            throw new Error(`Unsupported chain: ${chainId}`);
    }
}

class MarketMakerBot implements Bot {
    public readonly name = 'market-maker';

    private publicClient: PublicClient;
    private walletClient: WalletClient;
    private account: ReturnType<typeof privateKeyToAccount>;
    private contracts: ContractConfig;
    private ltvBps: bigint;

    private unwatch?: WatchContractEventReturnType;
    private watchdogTimerMutex = new Mutex();
    private watchdogTimerLastPatTime = Date.now();
    private inProgress = false;

    constructor(config: MarketMakerConfig) {
        const chain = getChain(config.chainId);
        this.account = privateKeyToAccount(config.privateKey);
        const transport = http(config.rpcUrl);

        this.publicClient = createPublicClient({ chain, transport });
        this.walletClient = createWalletClient({ chain, transport, account: this.account });
        this.contracts = getContractConfig(config.chainId);
        this.ltvBps = BigInt(config.offerLtvPercent * 100);
    }

    public async init() {
        const address = this.account.address;
        logger.info(`[${this.name}] wallet: ${address}`);

        const balance = await this.publicClient.readContract({
            address: this.contracts.usdc,
            abi: usdcAbi,
            functionName: 'balanceOf',
            args: [address],
        });
        logger.info(`[${this.name}] USDC balance: ${Number(balance) / 1e6}`);

        const allowance = await this.publicClient.readContract({
            address: this.contracts.usdc,
            abi: usdcAbi,
            functionName: 'allowance',
            args: [address, this.contracts.polyLend],
        });

        if ((allowance as bigint) < maxUint256 / 2n) {
            logger.info(`[${this.name}] approving USDC...`);
            const hash = await this.walletClient.writeContract({
                account: this.account,
                chain: null,
                address: this.contracts.usdc,
                abi: usdcAbi,
                functionName: 'approve',
                args: [this.contracts.polyLend, maxUint256],
            });
            await this.publicClient.waitForTransactionReceipt({ hash });
            logger.info(`[${this.name}] USDC approved`);
        }

        logger.info(`[${this.name}] initialized`);
    }

    public async reset() {
        this.unwatch?.();
        this.unwatch = undefined;
    }

    public async startIntervalLoop() {
        logger.info(`[${this.name}] polling for LoanRequested events every 5s...`);

        let lastBlock = await this.publicClient.getBlockNumber();

        const poll = async () => {
            try {
                const currentBlock = await this.publicClient.getBlockNumber();
                if (currentBlock <= lastBlock) return;

                const logs = await this.publicClient.getContractEvents({
                    address: this.contracts.polyLend,
                    abi: polyLendAbi,
                    eventName: 'LoanRequested',
                    fromBlock: lastBlock + 1n,
                    toBlock: currentBlock,
                });

                lastBlock = currentBlock;

                for (const log of logs) {
                    await this.handleLoanRequested(log).catch((e) => {
                        logger.error(`[${this.name}] error handling event: ${e}`);
                    });
                }
            } catch (e) {
                logger.error(`[${this.name}] poll error: ${e}`);
            }
        };

        setInterval(poll, 5000);
    }

    public async healthCheck(): Promise<boolean> {
        let healthy = false;
        await this.watchdogTimerMutex.runExclusive(async () => {
            healthy = this.watchdogTimerLastPatTime > Date.now() - 120_000;
        });
        return healthy;
    }

    private async handleLoanRequested(log: any) {
        if (this.inProgress) {
            logger.info(`[${this.name}] already processing, skipping`);
            return;
        }
        this.inProgress = true;

        try {
            const { id, borrower, positionId, collateralAmount } = log.args;
            logger.info(
                `[${this.name}] LoanRequested #${id} from ${borrower} — ` +
                `${Number(collateralAmount) / 1e6} collateral on position ${positionId}`
            );

            // Simulate multiple competing bots with different rates and amounts
            const numBots = Number(process.env.NUM_BOTS ?? '4');
            const baseApy = Number(process.env.OFFER_APY ?? '10');

            for (let i = 0; i < numBots; i++) {
                const botApy = baseApy + (i * 3) + Math.random() * 2; // e.g. 10%, 13.5%, 16.2%, 19.8%
                const ltvVariance = 0.8 + Math.random() * 0.4; // 80-120% of base LTV
                const loanAmount = (collateralAmount * this.ltvBps * BigInt(Math.floor(ltvVariance * 100))) / 1000000n;
                const rate = apyToRate(botApy);

                // Stagger offers by a few seconds
                if (i > 0) await sleepMs(2000 + Math.random() * 3000);

                logger.info(
                    `[bot-${i + 1}] offering ${Number(loanAmount) / 1e6} USDC at ${botApy.toFixed(1)}% APY`
                );

                try {
                    const hash = await this.walletClient.writeContract({
                        account: this.account,
                        chain: null,
                        address: this.contracts.polyLend,
                        abi: polyLendAbi,
                        functionName: 'offer',
                        args: [id, loanAmount, rate],
                    });

                    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
                    logger.info(`[bot-${i + 1}] offer submitted: ${receipt.transactionHash}`);
                } catch (e) {
                    logger.error(`[bot-${i + 1}] offer failed: ${e}`);
                }
            }

            await this.watchdogTimerMutex.runExclusive(async () => {
                this.watchdogTimerLastPatTime = Date.now();
            });
        } catch (e) {
            logger.error(`[${this.name}] error: ${e}`);
        } finally {
            this.inProgress = false;
        }
    }
}

function sleepMs(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const bot = new MarketMakerBot(loadConfig());

async function recursiveTryCatch(f: () => Promise<void>) {
    try {
        await f();
    } catch (e) {
        logger.error(`fatal error: ${e}`);
        await bot.reset();
        await bot.init();
        await sleepMs(15000);
        await recursiveTryCatch(f);
    }
}

async function main() {
    await bot.init();
    await bot.startIntervalLoop();
    logger.info('market-maker running, press Ctrl+C to stop');
}

recursiveTryCatch(main);
