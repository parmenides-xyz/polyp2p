import * as React from 'react'
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { createPublicClient, http } from 'viem'
import { polygonAmoy, foundry } from 'viem/chains'
import { InfoCard } from '#/components/common/InfoCard.tsx'
import { Amount } from '#/components/common/Amount.tsx'
import { polyLendAbi, usdcAbi, getContractConfig, calculateAmountOwed, rateToAPY } from '@polylend/sdk'

const gasOverrides = { maxFeePerGas: 35_000_000_000n, maxPriorityFeePerGas: 30_000_000_000n, gas: 500_000n }

type LoanInfo = {
	id: bigint
	data: [`0x${string}`, `0x${string}`, bigint, bigint, bigint, bigint, bigint, bigint, bigint]
}

export function ExitPanel() {
	const { address } = useAccount()
	const chainId = useChainId()
	const config = getContractConfig(chainId)
	const [now, setNow] = React.useState(() => Math.floor(Date.now() / 1000))
	const [activeLoan, setActiveLoan] = React.useState<LoanInfo | null>(null)

	React.useEffect(() => {
		const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
		return () => clearInterval(interval)
	}, [])

	const { data: nextLoanId } = useReadContract({
		address: config.polyLend, abi: polyLendAbi, functionName: 'nextLoanId',
		query: { refetchInterval: 5000 },
	})

	// Scan for user's active loan
	React.useEffect(() => {
		if (!nextLoanId || nextLoanId === 0n || !address) return
		const chain = chainId === 80002 ? polygonAmoy : foundry
		const client = createPublicClient({ chain, transport: http(chainId === 80002 ? 'https://polygon-amoy-bor-rpc.publicnode.com' : 'http://localhost:8545') })

		async function scan() {
			for (let i = Number(nextLoanId) - 1; i >= 0; i--) {
				try {
					const data = await client.readContract({ address: config.polyLend, abi: polyLendAbi, functionName: 'loans', args: [BigInt(i)] }) as [`0x${string}`, `0x${string}`, bigint, bigint, bigint, bigint, bigint, bigint, bigint]
					if (address && data[0].toLowerCase() === address.toLowerCase() && data[0] !== '0x0000000000000000000000000000000000000000') {
						setActiveLoan({ id: BigInt(i), data })
						return
					}
				} catch {}
			}
			setActiveLoan(null)
		}
		scan()
	}, [nextLoanId, address, chainId, config.polyLend])

	const loan = activeLoan?.data
	const isActive = !!loan

	const amountOwed = isActive ? calculateAmountOwed(loan[4], loan[5], BigInt(now) - loan[6]) : 0n
	const apy = isActive ? rateToAPY(loan[5]) : 0

	const { data: allowance } = useReadContract({
		address: config.usdc, abi: usdcAbi, functionName: 'allowance',
		args: address ? [address, config.polyLend] : undefined, query: { enabled: !!address },
	})

	const { writeContract: approveUsdc, data: approveTxHash } = useWriteContract()
	const { writeContract: repay, data: repayTxHash } = useWriteContract()
	const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash })
	const { isSuccess: repayConfirmed } = useWaitForTransactionReceipt({ hash: repayTxHash })

	const needsApproval = allowance != null && amountOwed > 0n && allowance < amountOwed && !approveConfirmed

	const handleApprove = () => {
		approveUsdc({ address: config.usdc, abi: usdcAbi, functionName: 'approve', args: [config.polyLend, amountOwed * 2n], ...gasOverrides })
	}

	const handleRepay = () => {
		if (!activeLoan) return
		repay({ address: config.polyLend, abi: polyLendAbi, functionName: 'repay', args: [activeLoan.id, BigInt(now)], ...gasOverrides })
	}

	if (!isActive) {
		return (
			<div className="px-[16px] py-[24px] text-center text-[13px] text-tertiary">
				No active leveraged position to close
			</div>
		)
	}

	if (repayConfirmed) {
		return (
			<div className="flex flex-col gap-[12px] px-[16px] py-[16px] animate-in">
				<div className="flex flex-col items-center gap-[8px] py-[12px]">
					<span className="text-[11px] uppercase font-mono px-[6px] py-[2px] rounded-[4px] text-positive bg-positive/10">Success</span>
					<span className="text-[14px] font-medium text-primary">Position closed</span>
					<span className="text-[13px] text-tertiary">Loan repaid and collateral returned</span>
				</div>
				{repayTxHash && (
					<div className="p-[10px] rounded-[8px] bg-positive/10 border border-positive/20">
						<p className="text-[12px] text-positive font-mono break-all">tx: {repayTxHash}</p>
					</div>
				)}
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-[16px] px-[16px] py-[16px]">
			<InfoCard sections={[
				{ label: 'Amount owed', value: <Amount value={amountOwed} decimals={6} suffix=" USDC" /> },
				{ label: 'Principal', value: <Amount value={loan[4]} decimals={6} suffix=" USDC" /> },
				{ label: 'APY', value: `${apy.toFixed(2)}%` },
				{ label: 'Collateral locked', value: <Amount value={loan[3]} decimals={6} /> },
			]} />

			{needsApproval ? (
				<button type="button" onClick={handleApprove}
					className="w-full h-[42px] rounded-[10px] bg-accent text-white text-[14px] font-medium border border-accent hover:bg-accent-hover transition-colors press-down">
					Approve USDC
				</button>
			) : (
				<button type="button" onClick={handleRepay}
					className="w-full h-[42px] rounded-[10px] bg-accent text-white text-[14px] font-medium border border-accent hover:bg-accent-hover transition-colors press-down">
					Close Position
				</button>
			)}
		</div>
	)
}
