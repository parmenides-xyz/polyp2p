import * as React from 'react'
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { InfoCard } from '#/components/common/InfoCard.tsx'
import { Amount } from '#/components/common/Amount.tsx'
import { polyLendAbi, conditionalTokensAbi, getContractConfig } from '@polylend/sdk'

export function DepositTab(props: DepositTab.Props) {
	const { positionId, price, side } = props

	const { address } = useAccount()
	const chainId = useChainId()
	const config = getContractConfig(chainId)

	const [amount, setAmount] = React.useState('')

	const { data: balance } = useReadContract({
		address: config.conditionalTokens,
		abi: conditionalTokensAbi,
		functionName: 'balanceOf',
		args: address && positionId != null ? [address, BigInt(positionId)] : undefined,
		query: { enabled: !!address && positionId != null },
	})

	const { data: isApproved, refetch: refetchApproval } = useReadContract({
		address: config.conditionalTokens,
		abi: conditionalTokensAbi,
		functionName: 'isApprovedForAll',
		args: address ? [address, config.polyLend] : undefined,
		query: { enabled: !!address },
	})

	const { writeContract: approve, data: approveTxHash } = useWriteContract()
	const { writeContract: requestLoan, data: requestTxHash } = useWriteContract()

	const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash })
	const { isSuccess: requestConfirmed } = useWaitForTransactionReceipt({ hash: requestTxHash })

	React.useEffect(() => { if (approveConfirmed) refetchApproval() }, [approveConfirmed, refetchApproval])

	const parsedAmount = amount ? BigInt(Math.floor(Number(amount) * 1e6)) : 0n
	const collateralValue = price != null && parsedAmount > 0n
		? Number(parsedAmount) / 1e6 * price
		: 0
	const maxLoan = collateralValue * 0.5

	const gasOverrides = { maxFeePerGas: 35_000_000_000n, maxPriorityFeePerGas: 30_000_000_000n, gas: 500_000n }

	const handleApprove = () => {
		approve({
			address: config.conditionalTokens,
			abi: conditionalTokensAbi,
			functionName: 'setApprovalForAll',
			args: [config.polyLend, true],
			...gasOverrides,
		})
	}

	const handleDeposit = () => {
		if (positionId == null || parsedAmount === 0n) return
		requestLoan({
			address: config.polyLend,
			abi: polyLendAbi,
			functionName: 'request',
			args: [BigInt(positionId), parsedAmount, 86400n],
			...gasOverrides,
		})
	}

	const needsApproval = !isApproved && !approveConfirmed
	const fmtUsd = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

	return (
		<div className="flex flex-col gap-[16px] px-[16px] py-[16px]">
			<div>
				<div className="flex items-center justify-between mb-[8px]">
					<span className="text-[13px] text-tertiary">Deposit</span>
					<span className="text-[13px] font-medium text-accent">
						{side ? side.toUpperCase() : '—'}
					</span>
				</div>
				<input
					type="number"
					value={amount}
					onChange={(e) => setAmount(e.target.value)}
					placeholder="0"
					className="w-full bg-transparent text-[28px] font-bold text-primary outline-none placeholder:text-disabled [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
				/>
				<div className="flex items-center justify-between mt-[6px]">
					<span className="text-[13px] text-tertiary">{fmtUsd(collateralValue)}</span>
					<div className="flex items-center gap-[8px]">
						<span className="text-[13px] text-tertiary">
							Balance: {balance != null ? <Amount value={balance} decimals={6} /> : '—'}
						</span>
						<button
							type="button"
							onClick={() => balance && setAmount((Number(balance) / 1e6).toString())}
							className="text-[12px] font-medium text-tertiary bg-base-alt border border-card-border px-[8px] py-[2px] rounded-[6px] press-down hover:border-secondary transition-colors"
						>
							Max
						</button>
					</div>
				</div>
			</div>

			<InfoCard
				sections={[
					{ label: 'Your collateral', value: fmtUsd(collateralValue) },
					{ label: 'Max loan available', value: fmtUsd(maxLoan) },
					{ label: 'Current LTV', value: collateralValue > 0 ? '0%' : 'N/A' },
					{ label: 'Liquidation price', value: parsedAmount > 0n ? '¢100' : 'N/A' },
				]}
			/>

			{requestConfirmed ? (
				<div className="flex flex-col gap-[12px] animate-in">
					<div className="flex flex-col items-center gap-[8px] py-[12px]">
						<span className="text-[11px] uppercase font-mono px-[6px] py-[2px] rounded-[4px] text-positive bg-positive/10">Success</span>
						<span className="text-[14px] font-medium text-primary">Loan request submitted</span>
						<span className="text-[13px] text-tertiary">Waiting for a lender to fill your request</span>
					</div>
					{requestTxHash && (
						<div className="p-[10px] rounded-[8px] bg-positive/10 border border-positive/20">
							<p className="text-[12px] text-positive font-mono break-all">tx: {requestTxHash}</p>
						</div>
					)}
				</div>
			) : needsApproval ? (
				<button
					type="button"
					onClick={handleApprove}
					disabled={!address}
					className="w-full h-[42px] rounded-[10px] bg-accent text-white text-[14px] font-medium border border-accent hover:bg-accent-hover transition-colors press-down disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Approve Collateral
				</button>
			) : (
				<button
					type="button"
					onClick={handleDeposit}
					disabled={!address || parsedAmount === 0n}
					className="w-full h-[42px] rounded-[10px] bg-accent text-white text-[14px] font-medium border border-accent hover:bg-accent-hover transition-colors press-down disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Deposit
				</button>
			)}
		</div>
	)
}

export declare namespace DepositTab {
	type Props = {
		positionId?: string
		price?: number
		side?: 'yes' | 'no'
	}
}
