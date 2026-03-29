import * as React from 'react'
import { useAccount, useChainId, useReadContract } from 'wagmi'
import { createPublicClient, http } from 'viem'
import { polygonAmoy, foundry } from 'viem/chains'
import { polyLendAbi, getContractConfig, calculateAmountOwed } from '@polylend/sdk'
import { PositionCard } from '#/components/portfolio/PositionCard.tsx'

type LoanData = [`0x${string}`, `0x${string}`, bigint, bigint, bigint, bigint, bigint, bigint, bigint]
type LoanInfo = { id: bigint; data: LoanData }

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

function DeltaArrow({ positive }: { positive: boolean }) {
	return (
		<svg width="12" height="12" viewBox="0 0 12 12" className="inline-block">
			{positive ? (
				<path d="M6 2 L10 8 L2 8 Z" fill="#22c55e" />
			) : (
				<path d="M6 10 L10 4 L2 4 Z" fill="#ef4444" />
			)}
		</svg>
	)
}

export function PortfolioPage() {
	const { address, isConnected } = useAccount()
	const chainId = useChainId()
	const config = getContractConfig(chainId)
	const [now, setNow] = React.useState(() => Math.floor(Date.now() / 1000))
	const [loans, setLoans] = React.useState<LoanInfo[]>([])
	const [loading, setLoading] = React.useState(true)

	React.useEffect(() => {
		const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
		return () => clearInterval(interval)
	}, [])

	const { data: nextLoanId } = useReadContract({
		address: config.polyLend, abi: polyLendAbi, functionName: 'nextLoanId',
		query: { refetchInterval: 5000 },
	})

	// Scan for all loans where user is borrower or lender
	React.useEffect(() => {
		if (!nextLoanId || nextLoanId === 0n || !address) {
			setLoans([])
			setLoading(false)
			return
		}
		const chain = chainId === 80002 ? polygonAmoy : foundry
		const client = createPublicClient({
			chain,
			transport: http(chainId === 80002 ? 'https://polygon-amoy-bor-rpc.publicnode.com' : 'http://localhost:8545'),
		})

		let cancelled = false
		async function scan() {
			const found: LoanInfo[] = []
			for (let i = 0; i < Number(nextLoanId); i++) {
				try {
					const data = await client.readContract({
						address: config.polyLend, abi: polyLendAbi, functionName: 'loans', args: [BigInt(i)],
					}) as LoanData
					const borrower = data[0]
					const lender = data[1]
					// Loan is active only if borrower is not zeroed (zeroed = repaid/closed)
					if (borrower === ZERO_ADDRESS) continue
					const isUserLoan =
						borrower.toLowerCase() === address!.toLowerCase() ||
						lender.toLowerCase() === address!.toLowerCase()
					if (isUserLoan) {
						found.push({ id: BigInt(i), data })
					}
				} catch {
					// skip
				}
			}
			if (!cancelled) {
				setLoans(found)
				setLoading(false)
			}
		}
		setLoading(true)
		scan()
		return () => { cancelled = true }
	}, [nextLoanId, address, chainId, config.polyLend])

	// Calculate totals
	const totalCollateral = loans.reduce((acc, l) => acc + l.data[3], 0n)
	const totalLoanValue = loans.reduce((acc, l) => acc + l.data[4], 0n)
	const totalOwed = loans.reduce((acc, l) => {
		const duration = BigInt(now) - l.data[6]
		return acc + calculateAmountOwed(l.data[4], l.data[5], duration > 0n ? duration : 0n)
	}, 0n)

	// Portfolio value = collateral value (at parity) - total owed
	// At parity each share is worth $1, so collateral value in USDC terms = collateralAmount
	const portfolioValue = totalCollateral > totalOwed ? totalCollateral - totalOwed : 0n
	// Net P&L = portfolio value - initial equity (collateral - loan principal)
	const initialEquity = totalCollateral > totalLoanValue ? totalCollateral - totalLoanValue : 0n
	const pnl = portfolioValue > initialEquity
		? Number(portfolioValue - initialEquity) / 1e6
		: -Number(initialEquity - portfolioValue) / 1e6
	const pnlPositive = pnl >= 0

	// Format big value for display
	const formatUsdBig = (value: bigint) => {
		const num = Number(value) / 1e6
		return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
	}

	if (!isConnected) {
		return (
			<div className="w-full max-w-[520px] animate-in">
				<div className="flex flex-col items-center gap-[16px] py-[48px]">
					<span className="text-[28px] font-bold text-primary">Portfolio</span>
					<span className="text-[14px] text-tertiary">Connect your wallet to view positions</span>
				</div>
			</div>
		)
	}

	return (
		<div className="w-full max-w-[520px] flex flex-col gap-[24px] animate-in">
			{/* Portfolio Value Header */}
			<div className="flex flex-col gap-[4px]">
				<span className="text-[13px] text-tertiary font-sans">Portfolio Value</span>
				<div className="flex items-baseline gap-[12px]">
					<span className="text-[28px] font-bold text-primary font-mono tracking-tight">
						${loading ? '...' : formatUsdBig(portfolioValue)}
					</span>
					{!loading && loans.length > 0 && (
						<span className={`flex items-center gap-[4px] text-[14px] font-mono ${
							pnlPositive ? 'text-positive' : 'text-negative'
						}`}>
							<DeltaArrow positive={pnlPositive} />
							{pnlPositive ? '+' : ''}{pnl.toFixed(2)} USDC
						</span>
					)}
				</div>
			</div>

			{/* Summary Stats */}
			{!loading && loans.length > 0 && (
				<div className="grid grid-cols-3 gap-[12px]">
					<div className="rounded-[10px] border border-card-border bg-base-alt px-[16px] py-[12px]">
						<span className="text-[13px] text-tertiary block">Positions</span>
						<span className="text-[14px] text-primary font-mono">{loans.length}</span>
					</div>
					<div className="rounded-[10px] border border-card-border bg-base-alt px-[16px] py-[12px]">
						<span className="text-[13px] text-tertiary block">Collateral</span>
						<span className="text-[14px] text-primary font-mono">${formatUsdBig(totalCollateral)}</span>
					</div>
					<div className="rounded-[10px] border border-card-border bg-base-alt px-[16px] py-[12px]">
						<span className="text-[13px] text-tertiary block">Total Owed</span>
						<span className="text-[14px] text-primary font-mono">${formatUsdBig(totalOwed)}</span>
					</div>
				</div>
			)}

			{/* Positions */}
			<div className="flex flex-col gap-[12px]">
				<span className="text-[13px] text-tertiary font-sans">Active Positions</span>
				{loading ? (
					<div className="rounded-[10px] border border-card-border bg-base-alt px-[16px] py-[24px] text-center">
						<span className="text-[13px] text-tertiary">Scanning for positions...</span>
					</div>
				) : loans.length === 0 ? (
					<div className="rounded-[10px] border border-card-border bg-base-alt px-[16px] py-[24px] text-center">
						<span className="text-[13px] text-tertiary">No active positions</span>
					</div>
				) : (
					loans.map(loan => (
						<PositionCard
							key={loan.id.toString()}
							loanId={loan.id}
							loan={loan.data}
							testPositionIds={config.testPositionIds}
						/>
					))
				)}
			</div>
		</div>
	)
}
