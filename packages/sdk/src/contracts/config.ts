// Contract addresses per chain, following clob-client/src/config.ts pattern

type ContractConfig = {
    polyLend: `0x${string}`;
    usdc: `0x${string}`;
    conditionalTokens: `0x${string}`;
    testPositionIds?: {
        yes: string;
        no: string;
    };
    testConditionId?: `0x${string}`;
};

// Populated after deployment via forge script
const LOCAL_CONTRACTS: ContractConfig = {
    polyLend: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    usdc: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    conditionalTokens: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
};

const AMOY_CONTRACTS: ContractConfig = {
    polyLend: "0x2e5E20f4e5898D234C2B912AdfFeE0CFec5E0E80",
    usdc: "0x493755D1980c3228Cd11485BEa0a58479CA899B6",
    conditionalTokens: "0x69308FB512518e39F9b16112fA8d994F4e2Bf8bB",
    testPositionIds: {
        yes: "61207243817939804709452307734293057801164117708566218972172150858295036263486",
        no: "51765867450076585974955343158020287708772796654005482652441074410214637235919",
    },
    testConditionId: "0x8c651a619eed9d2e36a6fc72668e50f5c657ea52c50a72adf8e4cf0c6231384b",
};

const getContractConfig = (chainId: number): ContractConfig => {
    switch (chainId) {
        case 31337:
            return LOCAL_CONTRACTS;
        case 80002:
            return AMOY_CONTRACTS;
        default:
            throw new Error(`Unsupported chain: ${chainId}`);
    }
};

export type { ContractConfig };
export { getContractConfig, LOCAL_CONTRACTS, AMOY_CONTRACTS };
