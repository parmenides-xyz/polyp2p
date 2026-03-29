import * as React from 'react'
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { createPublicClient, http } from 'viem'
import { polygonAmoy, foundry } from 'viem/chains'
import { InfoCard } from '#/components/common/InfoCard.tsx'
import { Amount } from '#/components/common/Amount.tsx'
import { polyLendAbi, getContractConfig, rateToAPY } from '@polylend/sdk'

type OfferData = {
	id: bigint
	lender: string
	loanAmount: bigint
	rate: bigint
	apy: number
}

function useOffers() {
	const chainId = useChainId()
	const config = getContractConfig(chainId)
	const [offers, setOffers] = React.useState<OfferData[]>([])

	const { data: nextOfferId } = useReadContract({
		address: config.polyLend,
		abi: polyLendAbi,
		functionName: 'nextOfferId',
		query: { refetchInterval: 4000 },
	})

	const { data: nextRequestId } = useReadContract({
		address: config.polyLend,
		abi: polyLendAbi,
		functionName: 'nextRequestId',
		query: { refetchInterval: 4000 },
	})

	const currentRequestId = nextRequestId != null && nextRequestId > 0n ? nextRequestId - 1n : null
	const count = Number(nextOfferId ?? 0n)

	React.useEffect(() => {
		if (count === 0 || currentRequestId == null) { setOffers([]); return }

		const chain = chainId === 80002 ? polygonAmoy : foundry
		const client = createPublicClient({
			chain,
			transport: http(chainId === 80002 ? 'https://polygon-amoy-bor-rpc.publicnode.com' : 'http://localhost:8545'),
		})

		async function fetchOffers() {
			const results: OfferData[] = []
			for (let i = count - 1; i >= Math.max(0, count - 20); i--) {
				try {
					const data = await client.readContract({
						address: config.polyLend,
						abi: polyLendAbi,
						functionName: 'offers',
						args: [BigInt(i)],
					}) as [bigint, string, bigint, bigint]

					if (data[0] === currentRequestId && data[1] !== '0x0000000000000000000000000000000000000000') {
						const apy = rateToAPY(data[3])
						results.push({
							id: BigInt(i),
							lender: data[1],
							loanAmount: data[2],
							rate: data[3],
							apy,
						})
					}
				} catch { /* offer may not exist */ }
			}
			results.sort((a, b) => a.apy - b.apy)
			setOffers(results)
		}

		fetchOffers()
	}, [count, chainId, config.polyLend, currentRequestId])

	return { offers }
}

export function BorrowTab() {
	const { address } = useAccount()
	const chainId = useChainId()
	const config = getContractConfig(chainId)
	const { offers } = useOffers()

	const { writeContract: acceptOffer, data: acceptTxHash } = useWriteContract()
	const { isSuccess: acceptConfirmed } = useWaitForTransactionReceipt({ hash: acceptTxHash })

	const gasOverrides = { maxFeePerGas: 35_000_000_000n, maxPriorityFeePerGas: 30_000_000_000n, gas: 500_000n }

	const handleAccept = (offerId: bigint) => {
		acceptOffer({
			address: config.polyLend,
			abi: polyLendAbi,
			functionName: 'accept',
			args: [offerId],
			...gasOverrides,
		})
	}

	const bestOffer = offers[0]

	if (acceptConfirmed) {
		return (
			<div className="flex flex-col gap-[16px] px-[16px] py-[16px] animate-in">
				<div className="flex flex-col items-center gap-[8px] py-[12px]">
					<span className="text-[11px] uppercase font-mono px-[6px] py-[2px] rounded-[4px] text-positive bg-positive/10">Success</span>
					<span className="text-[14px] font-medium text-primary">Loan accepted</span>
					<span className="text-[13px] text-tertiary">Your USDC has been deposited</span>
				</div>
				{acceptTxHash && (
					<div className="p-[10px] rounded-[8px] bg-positive/10 border border-positive/20">
						<p className="text-[12px] text-positive font-mono break-all">tx: {acceptTxHash}</p>
					</div>
				)}
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-[16px] px-[16px] py-[16px]">
			<InfoCard
				sections={[
					{ label: 'Open offers', value: String(offers.length) },
					{ label: 'Best rate', value: bestOffer ? `${bestOffer.apy.toFixed(2)}% APY` : '—' },
				]}
			/>

			{offers.length > 0 && (
				<div className="flex flex-col gap-[8px]">
					<span className="text-[13px] text-tertiary">Available offers</span>
					{offers.map((offer, i) => (
						<button
							key={String(offer.id)}
							type="button"
							onClick={() => handleAccept(offer.id)}
							disabled={!address}
							className="animate-in flex items-center justify-between px-[14px] py-[12px] rounded-[10px] border border-card-border bg-base-alt hover:border-secondary transition-all press-down disabled:opacity-50"
							style={{ animationDelay: `${i * 60}ms` }}
						>
							<div className="flex flex-col gap-[2px] items-start">
								<span className="text-[13px] font-medium text-primary">
									<Amount value={offer.loanAmount} decimals={6} prefix="" /> USDC
								</span>
								<span className="text-[11px] text-tertiary font-mono">
									{offer.lender.slice(0, 6)}...{offer.lender.slice(-4)}
								</span>
							</div>
							<span className="text-[14px] font-medium text-accent">{offer.apy.toFixed(2)}%</span>
						</button>
					))}
				</div>
			)}

			{bestOffer && (
				<button
					type="button"
					onClick={() => handleAccept(bestOffer.id)}
					disabled={!address}
					className="w-full h-[42px] rounded-[10px] bg-accent text-white text-[14px] font-medium border border-accent hover:bg-accent-hover transition-colors press-down disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Accept Best Offer ({bestOffer.apy.toFixed(2)}%)
				</button>
			)}

			{offers.length === 0 && (
				<p className="text-[13px] text-tertiary">
					Incoming offers for your loan requests will appear here.
				</p>
			)}
		</div>
	)
}
