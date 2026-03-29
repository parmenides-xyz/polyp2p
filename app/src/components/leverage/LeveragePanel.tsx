import * as React from 'react'
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { createPublicClient, http } from 'viem'
import { polygonAmoy, foundry } from 'viem/chains'
import { InfoCard } from '#/components/common/InfoCard.tsx'
import { Amount } from '#/components/common/Amount.tsx'
import { MarketSelector, type Market } from '#/components/common/MarketSelector.tsx'
import { MarketCard } from '#/components/borrow/MarketCard.tsx'
import { polyLendAbi, usdcAbi, conditionalTokensAbi, getContractConfig, rateToAPY } from '@polylend/sdk'

type Step = 'input' | 'approve-usdc' | 'split' | 'approve-ct' | 'request' | 'waiting' | 'complete'
type OfferData = { id: bigint; loanAmount: bigint; apy: number; lender: string }

const gasOverrides = { maxFeePerGas: 35_000_000_000n, maxPriorityFeePerGas: 30_000_000_000n, gas: 500_000n }

export function LeveragePanel() {
	const { address } = useAccount()
	const chainId = useChainId()
	const config = getContractConfig(chainId)

	const [market, setMarket] = React.useState<Market | null>(null)
	const [picking, setPicking] = React.useState(true)
	const [selectedSide, setSelectedSide] = React.useState<'yes' | 'no'>('yes')
	const [amount, setAmount] = React.useState('')
	const [leverage, setLeverage] = React.useState(2)
	const [step, setStep] = React.useState<Step>('input')
	const [offers, setOffers] = React.useState<OfferData[]>([])

	const tokens = market?.tokens
	const yesToken = tokens?.find((t) => t.outcome === 'Yes')
	const noToken = tokens?.find((t) => t.outcome === 'No')
	const price = selectedSide === 'yes' ? yesToken?.price : noToken?.price

	const depositUsd = Number(amount) || 0
	const parsedAmount = amount ? BigInt(Math.floor(Number(amount) * 1e6)) : 0n
	const totalPosition = depositUsd * leverage
	const shares = price && price > 0 ? totalPosition / price : 0
	const toWin = shares - totalPosition
	const liquidationPrice = leverage > 1 && price ? price * (1 - 1 / leverage) : 0

	const positionId = config.testPositionIds
		? (selectedSide === 'yes' ? config.testPositionIds.yes : config.testPositionIds.no)
		: undefined
	const conditionId = config.testConditionId

	const { data: usdcBalance } = useReadContract({
		address: config.usdc, abi: usdcAbi, functionName: 'balanceOf',
		args: address ? [address] : undefined, query: { enabled: !!address },
	})

	// Step 1-4 transactions
	const { writeContract: approveUsdc, data: approveUsdcHash } = useWriteContract()
	const { isSuccess: approveUsdcDone } = useWaitForTransactionReceipt({ hash: approveUsdcHash })
	const { writeContract: splitPosition, data: splitHash } = useWriteContract()
	const { isSuccess: splitDone } = useWaitForTransactionReceipt({ hash: splitHash })
	const { writeContract: approveCt, data: approveCtHash } = useWriteContract()
	const { isSuccess: approveCtDone } = useWaitForTransactionReceipt({ hash: approveCtHash })
	const { writeContract: requestLoan, data: requestHash } = useWriteContract()
	const { isSuccess: requestDone } = useWaitForTransactionReceipt({ hash: requestHash })

	// Step 5: accept offer
	const { writeContract: acceptOffer, data: acceptHash } = useWriteContract()
	const { isSuccess: acceptDone } = useWaitForTransactionReceipt({ hash: acceptHash })

	// Auto-advance steps
	React.useEffect(() => { if (approveUsdcDone && step === 'approve-usdc') doSplit() }, [approveUsdcDone, step])
	React.useEffect(() => { if (splitDone && step === 'split') doApproveCt() }, [splitDone, step])
	React.useEffect(() => { if (approveCtDone && step === 'approve-ct') doRequest() }, [approveCtDone, step])
	React.useEffect(() => { if (requestDone && step === 'request') setStep('waiting') }, [requestDone, step])
	React.useEffect(() => { if (acceptDone && step === 'waiting') setStep('complete') }, [acceptDone, step])

	// Poll for offers when waiting
	const { data: nextOfferId } = useReadContract({
		address: config.polyLend, abi: polyLendAbi, functionName: 'nextOfferId',
		query: { refetchInterval: step === 'waiting' ? 3000 : false },
	})

	const { data: nextRequestId } = useReadContract({
		address: config.polyLend, abi: polyLendAbi, functionName: 'nextRequestId',
		query: { refetchInterval: step === 'waiting' ? 3000 : false },
	})

	const currentRequestId = nextRequestId != null && nextRequestId > 0n ? nextRequestId - 1n : null

	React.useEffect(() => {
		if (step !== 'waiting' || !nextOfferId || nextOfferId === 0n || currentRequestId == null) return
		const chain = chainId === 80002 ? polygonAmoy : foundry
		const client = createPublicClient({ chain, transport: http(chainId === 80002 ? 'https://polygon-amoy-bor-rpc.publicnode.com' : 'http://localhost:8545') })

		async function fetch() {
			const results: OfferData[] = []
			const total = Number(nextOfferId)
			for (let i = total - 1; i >= Math.max(0, total - 20); i--) {
				try {
					const data = await client.readContract({ address: config.polyLend, abi: polyLendAbi, functionName: 'offers', args: [BigInt(i)] }) as [bigint, string, bigint, bigint]
					// Only include offers for the current request that haven't been invalidated
					if (data[0] === currentRequestId && data[1] !== '0x0000000000000000000000000000000000000000') {
						results.push({ id: BigInt(i), lender: data[1], loanAmount: data[2], apy: rateToAPY(data[3]) })
					}
				} catch {}
			}
			results.sort((a, b) => a.apy - b.apy)
			setOffers(results)
		}
		fetch()
	}, [nextOfferId, step, chainId, config.polyLend])

	const handleStart = () => {
		if (!parsedAmount || !conditionId) return
		setStep('approve-usdc')
		approveUsdc({ address: config.usdc, abi: usdcAbi, functionName: 'approve', args: [config.conditionalTokens, parsedAmount], ...gasOverrides })
	}

	const doSplit = () => {
		if (!conditionId) return
		setStep('split')
		splitPosition({ address: config.conditionalTokens, abi: conditionalTokensAbi, functionName: 'splitPosition',
			args: [config.usdc, '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`, conditionId, [1n, 2n], parsedAmount], ...gasOverrides })
	}

	const doApproveCt = () => {
		setStep('approve-ct')
		approveCt({ address: config.conditionalTokens, abi: conditionalTokensAbi, functionName: 'setApprovalForAll', args: [config.polyLend, true], ...gasOverrides })
	}

	const doRequest = () => {
		if (!positionId) return
		setStep('request')
		requestLoan({ address: config.polyLend, abi: polyLendAbi, functionName: 'request', args: [BigInt(positionId), parsedAmount, 86400n], ...gasOverrides })
	}

	const handleAccept = (offerId: bigint) => {
		acceptOffer({ address: config.polyLend, abi: polyLendAbi, functionName: 'accept', args: [offerId], ...gasOverrides })
	}

	const stepLabels: Record<Step, string> = {
		'input': 'Leverage', 'approve-usdc': 'Approving USDC...', 'split': 'Splitting into tokens...',
		'approve-ct': 'Approving collateral...', 'request': 'Submitting loan request...', 'waiting': 'Waiting for offers...', 'complete': 'Done',
	}

	const stepIndex = ['input', 'approve-usdc', 'split', 'approve-ct', 'request', 'waiting', 'complete'].indexOf(step)
	const progress = step === 'complete' ? 100 : step === 'waiting' ? 80 : (stepIndex / 6) * 100

	const fmtUsd = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
	const bestOffer = offers[0]

	return (
		<div className="flex flex-col">
			{picking ? (
				<div className="px-[16px] py-[16px]">
					<MarketSelector selected={market} onSelect={(m) => { setMarket(m); setPicking(false) }} />
				</div>
			) : market && (
				<>
					<MarketCard name={market.question} imageUrl={market.icon} yesPrice={yesToken?.price} noPrice={noToken?.price}
						selectedSide={selectedSide} onSideChange={setSelectedSide} onChangeMaket={() => setPicking(true)} />
					<div className="border-t border-dashed border-card-border" />

					{step === 'complete' ? (
						<div className="flex flex-col gap-[16px] px-[16px] py-[16px] animate-in">
							<div className="flex flex-col items-center gap-[8px] py-[12px]">
								<span className="text-[11px] uppercase font-mono px-[6px] py-[2px] rounded-[4px] text-positive bg-positive/10">Success</span>
								<span className="text-[14px] font-medium text-primary">Leveraged position active</span>
								<span className="text-[13px] text-tertiary">{leverage.toFixed(1)}x leverage on {selectedSide.toUpperCase()}</span>
							</div>
							{acceptHash && (
								<div className="p-[10px] rounded-[8px] bg-positive/10 border border-positive/20">
									<p className="text-[12px] text-positive font-mono break-all">tx: {acceptHash}</p>
								</div>
							)}
						</div>
					) : step === 'waiting' ? (
						<div className="flex flex-col gap-[16px] px-[16px] py-[16px]">
							<div className="flex flex-col gap-[6px]">
								<div className="h-[4px] rounded-full bg-base-alt overflow-hidden">
									<div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
								</div>
								<span className="text-[12px] text-tertiary text-center">Loan request submitted — waiting for offers</span>
							</div>

							<InfoCard sections={[
								{ label: 'Open offers', value: String(offers.length) },
								{ label: 'Best rate', value: bestOffer ? `${bestOffer.apy.toFixed(2)}% APY` : '—' },
							]} />

							{offers.length > 0 && (
								<div className="flex flex-col gap-[8px]">
									{offers.map((offer, i) => (
										<button key={String(offer.id)} type="button" onClick={() => handleAccept(offer.id)}
											className="animate-in flex items-center justify-between px-[14px] py-[12px] rounded-[10px] border border-card-border bg-base-alt hover:border-secondary transition-all press-down"
											style={{ animationDelay: `${i * 60}ms` }}>
											<div className="flex flex-col gap-[2px] items-start">
												<span className="text-[13px] font-medium text-primary"><Amount value={offer.loanAmount} decimals={6} prefix="" /> USDC</span>
												<span className="text-[11px] text-tertiary font-mono">{offer.lender.slice(0, 6)}...{offer.lender.slice(-4)}</span>
											</div>
											<span className="text-[14px] font-medium text-accent">{offer.apy.toFixed(2)}%</span>
										</button>
									))}
								</div>
							)}

							{bestOffer && (
								<button type="button" onClick={() => handleAccept(bestOffer.id)}
									className="w-full h-[42px] rounded-[10px] bg-accent text-white text-[14px] font-medium border border-accent hover:bg-accent-hover transition-colors press-down">
									Accept Best Offer ({bestOffer.apy.toFixed(2)}%)
								</button>
							)}
						</div>
					) : (
						<div className="flex flex-col gap-[16px] px-[16px] py-[16px]">
							<div>
								<div className="flex items-center justify-between mb-[8px]">
									<span className="text-[13px] text-tertiary">Deposit</span>
									<span className="text-[13px] font-medium text-accent">USDC</span>
								</div>
								<input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" disabled={step !== 'input'}
									className="w-full bg-transparent text-[28px] font-bold text-primary outline-none placeholder:text-disabled [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:opacity-50" />
								<div className="flex items-center justify-between mt-[6px]">
									<span className="text-[13px] text-tertiary">{fmtUsd(depositUsd)}</span>
									<span className="text-[13px] text-tertiary">Balance: {usdcBalance != null ? (Number(usdcBalance) / 1e6).toLocaleString() : '—'}</span>
								</div>
							</div>
							<div className="flex items-center gap-[16px]">
								<input type="range" min={1} max={5} step={0.1} value={leverage} onChange={(e) => setLeverage(Number(e.target.value))}
									disabled={step !== 'input'} className="flex-1 accent-accent disabled:opacity-50" />
								<div className="px-[10px] py-[4px] rounded-[8px] bg-base-alt border border-card-border text-primary text-[13px] font-mono font-medium min-w-[60px] text-center">
									{leverage.toFixed(1)}x
								</div>
							</div>
							<InfoCard sections={[
								{ label: 'Total position', value: fmtUsd(totalPosition) },
								{ label: 'Average price', value: price != null ? `¢${(price * 100).toFixed(1)}` : '—' },
								{ label: 'Liquidation price', value: liquidationPrice > 0 ? `¢${(liquidationPrice * 100).toFixed(1)}` : '—' },
							]} />
							{toWin > 0 && (
								<div className="flex items-center justify-between px-[4px]">
									<span className="text-[13px] text-tertiary">To win</span>
									<span className="text-[20px] font-bold text-positive">{fmtUsd(toWin)}</span>
								</div>
							)}
							{step !== 'input' && (
								<div className="flex flex-col gap-[6px] animate-in">
									<div className="h-[4px] rounded-full bg-base-alt overflow-hidden">
										<div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
									</div>
									<span className="text-[12px] text-tertiary text-center">{stepLabels[step]}</span>
								</div>
							)}
							<button type="button" disabled={!address || depositUsd <= 0 || step !== 'input' || !conditionId} onClick={handleStart}
								className="w-full h-[42px] rounded-[10px] bg-accent text-white text-[14px] font-medium border border-accent hover:bg-accent-hover transition-colors press-down disabled:opacity-50 disabled:cursor-not-allowed">
								{step === 'input' ? 'Leverage' : stepLabels[step]}
							</button>
						</div>
					)}
				</>
			)}
		</div>
	)
}
