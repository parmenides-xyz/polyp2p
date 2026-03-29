import * as React from 'react'
import { InfoCard } from '#/components/common/InfoCard.tsx'
import { Amount } from '#/components/common/Amount.tsx'
import { PayoffChart } from '#/components/portfolio/PayoffChart.tsx'
import { calculateAmountOwed, rateToAPY } from '@polylend/sdk'

type LoanData = [`0x${string}`, `0x${string}`, bigint, bigint, bigint, bigint, bigint, bigint, bigint]

export function PositionCard(props: { loanId: bigint; loan: LoanData; testPositionIds?: { yes: string; no: string } }) {
	const { loanId, loan, testPositionIds } = props
	const [, , positionId, collateralAmount, loanAmount, rate, startTime, , callTime] = loan

	const [now, setNow] = React.useState(() => Math.floor(Date.now() / 1000))

	React.useEffect(() => {
		const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
		return () => clearInterval(interval)
	}, [])

	const duration = BigInt(now) - startTime
	const amountOwed = calculateAmountOwed(loanAmount, rate, duration > 0n ? duration : 0n)
	const apy = rateToAPY(rate)
	const isCalled = callTime > 0n

	// Determine YES/NO side from positionId
	let side: 'yes' | 'no' = 'yes'
	if (testPositionIds) {
		if (positionId.toString() === testPositionIds.no) {
			side = 'no'
		}
	}

	// For payoff chart: convert 6-decimal bigints to floats
	const collateralFloat = Number(collateralAmount) / 1e6
	const loanFloat = Number(loanAmount) / 1e6
	// Estimate price as loanAmount / collateralAmount (LTV proxy)
	const price = collateralFloat > 0 ? loanFloat / collateralFloat : 0.5

	// Simple P&L: collateral value at current "price" minus amount owed
	const estimatedValue = collateralFloat // at parity, 1 share = $1
	const pnl = estimatedValue - Number(amountOwed) / 1e6
	const pnlPositive = pnl >= 0

	return (
		<div className="rounded-[10px] border border-card-border bg-base-alt overflow-hidden animate-in">
			{/* Header */}
			<div className="flex items-center justify-between px-[16px] py-[12px] border-b border-card-border">
				<div className="flex items-center gap-[8px]">
					<span className={`text-[11px] uppercase font-mono px-[6px] py-[2px] rounded-[4px] ${
						side === 'yes' ? 'text-positive bg-positive/10' : 'text-negative bg-negative/10'
					}`}>
						{side}
					</span>
					<span className="text-[13px] text-tertiary font-mono">
						Loan #{loanId.toString()}
					</span>
				</div>
				<div className="flex items-center gap-[6px]">
					{isCalled && (
						<span className="text-[11px] uppercase font-mono px-[6px] py-[2px] rounded-[4px] text-negative bg-negative/10">
							Called
						</span>
					)}
					<span className={`text-[13px] font-mono ${pnlPositive ? 'text-positive' : 'text-negative'}`}>
						{pnlPositive ? '+' : ''}{pnl.toFixed(2)} USDC
					</span>
				</div>
			</div>

			{/* Payoff Chart */}
			<div className="px-[16px] py-[8px] border-b border-card-border">
				<PayoffChart
					collateralAmount={collateralFloat}
					loanAmount={loanFloat}
					price={price}
					side={side}
				/>
			</div>

			{/* Position Details */}
			<InfoCard
				sections={[
					{ label: 'Collateral', value: <Amount value={collateralAmount} decimals={6} suffix=" shares" /> },
					{ label: 'Loan', value: <Amount value={loanAmount} decimals={6} suffix=" USDC" /> },
					{ label: 'APY', value: <span className="text-[14px]">{apy.toFixed(2)}%</span> },
					{ label: 'Amount owed', value: <Amount value={amountOwed} decimals={6} suffix=" USDC" /> },
				]}
			/>
		</div>
	)
}
