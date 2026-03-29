import * as React from 'react'
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { InfoCard } from '#/components/common/InfoCard.tsx'
import { polyLendAbi, usdcAbi, getContractConfig, apyToRate } from '@polylend/sdk'

export function OfferForm(props: OfferForm.Props) {
	const { requestId } = props
	const { address } = useAccount()
	const chainId = useChainId()
	const config = getContractConfig(chainId)

	const [amount, setAmount] = React.useState('')
	const [apyInput, setApyInput] = React.useState('10')

	const parsedAmount = amount ? BigInt(Math.floor(Number(amount) * 1e6)) : 0n
	const apy = Number(apyInput) || 0
	const rate = apy > 0 ? apyToRate(apy) : 0n

	const { data: balance } = useReadContract({
		address: config.usdc,
		abi: usdcAbi,
		functionName: 'balanceOf',
		args: address ? [address] : undefined,
		query: { enabled: !!address },
	})

	const { data: allowance } = useReadContract({
		address: config.usdc,
		abi: usdcAbi,
		functionName: 'allowance',
		args: address ? [address, config.polyLend] : undefined,
		query: { enabled: !!address },
	})

	const { writeContract: approve, data: approveTxHash } = useWriteContract()
	const { writeContract: offer, data: offerTxHash } = useWriteContract()
	const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash })
	const { isSuccess: offerConfirmed } = useWaitForTransactionReceipt({ hash: offerTxHash })

	const needsApproval = allowance != null && parsedAmount > 0n && (allowance as bigint) < parsedAmount && !approveConfirmed

	const gasOverrides = { maxFeePerGas: 35_000_000_000n, maxPriorityFeePerGas: 30_000_000_000n, gas: 500_000n }

	const handleApprove = () => {
		approve({
			address: config.usdc,
			abi: usdcAbi,
			functionName: 'approve',
			args: [config.polyLend, parsedAmount * 2n],
			...gasOverrides,
		})
	}

	const handleOffer = () => {
		if (requestId == null || parsedAmount === 0n || rate === 0n) return
		offer({
			address: config.polyLend,
			abi: polyLendAbi,
			functionName: 'offer',
			args: [requestId, parsedAmount, rate],
			...gasOverrides,
		})
	}

	const projectedEarnings = apy > 0 && Number(amount) > 0
		? (Number(amount) * apy / 100)
		: 0

	const fmtUsd = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

	return (
		<div className="flex flex-col gap-[16px] px-[16px] py-[16px]">
			<div>
				<div className="flex items-center justify-between mb-[8px]">
					<span className="text-[13px] text-tertiary">Loan amount</span>
					<span className="text-[13px] font-medium text-accent">USDC</span>
				</div>
				<input
					type="number"
					value={amount}
					onChange={(e) => setAmount(e.target.value)}
					placeholder="0"
					className="w-full bg-transparent text-[28px] font-bold text-primary outline-none placeholder:text-disabled [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
				/>
				<div className="flex items-center justify-between mt-[6px]">
					<span className="text-[13px] text-tertiary">{fmtUsd(Number(amount || 0))}</span>
					<span className="text-[13px] text-tertiary">
						Balance: {balance != null ? `${(Number(balance) / 1e6).toLocaleString()}` : '—'}
					</span>
				</div>
			</div>

			<div>
				<span className="text-[13px] text-tertiary mb-[8px] block">Interest rate (APY %)</span>
				<input
					type="number"
					value={apyInput}
					onChange={(e) => setApyInput(e.target.value)}
					placeholder="10"
					className="w-full h-[42px] bg-base-alt border border-card-border rounded-[10px] px-[16px] text-[14px] text-primary outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
				/>
			</div>

			<InfoCard
				sections={[
					{ label: 'Your position', value: fmtUsd(Number(amount || 0)) },
					{ label: 'APY', value: `${apy.toFixed(2)}%` },
					{ label: 'Projected annual earnings', value: fmtUsd(projectedEarnings) },
				]}
			/>

			{offerConfirmed ? (
				<div className="text-center py-[12px] text-positive text-[13px] font-medium">
					Offer submitted
				</div>
			) : needsApproval ? (
				<button
					type="button"
					onClick={handleApprove}
					disabled={!address}
					className="w-full h-[42px] rounded-[10px] bg-accent text-white text-[14px] font-medium border border-accent hover:bg-accent-hover transition-colors press-down disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Approve USDC
				</button>
			) : (
				<button
					type="button"
					onClick={handleOffer}
					disabled={!address || parsedAmount === 0n || rate === 0n}
					className="w-full h-[42px] rounded-[10px] bg-accent text-white text-[14px] font-medium border border-accent hover:bg-accent-hover transition-colors press-down disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Supply
				</button>
			)}
		</div>
	)
}

export declare namespace OfferForm {
	type Props = {
		requestId?: bigint
	}
}
