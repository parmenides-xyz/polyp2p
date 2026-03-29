import { porto } from "porto/wagmi";
import { createConfig, http } from "wagmi";
import { foundry, polygonAmoy } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const config = createConfig({
    chains: [polygonAmoy, foundry],
    connectors: [injected(), porto()],
    pollingInterval: 4_000,
    transports: {
        [polygonAmoy.id]: http("https://polygon-amoy-bor-rpc.publicnode.com"),
        [foundry.id]: http("http://localhost:8545"),
    },
});

declare module "wagmi" {
    interface Register {
        config: typeof config;
    }
}
