import { useChainId, useReadContract } from 'wagmi'
import { InfoCard } from '#/components/common/InfoCard.tsx'
import { Amount } from '#/components/common/Amount.tsx'
import { polyLendAbi, getContractConfig } from '@polylend/sdk'

export function RequestsList(props: RequestsList.Props) {
	const { onSelectRequest } = props
	const chainId = useChainId()
	const config = getContractConfig(chainId)

	const { data: nextRequestId } = useReadContract({
		address: config.polyLend,
		abi: polyLendAbi,
		functionName: 'nextRequestId',
	})

	const { data: requestData } = useReadContract({
		address: config.polyLend,
		abi: polyLendAbi,
		functionName: 'requests',
		args: nextRequestId != null && nextRequestId > 0n ? [nextRequestId - 1n] : undefined,
		query: { enabled: nextRequestId != null && nextRequestId > 0n },
	})

	const request = requestData as [
		`0x${string}`, bigint, bigint, bigint,
	] | undefined

	const isActive = request && request[0] !== '0x0000000000000000000000000000000000000000'

	if (!isActive) {
		return (
			<div className="px-[16px] py-[24px] text-center text-[13px] text-tertiary">
				No open loan requests
			</div>
		)
	}

	const [borrower, positionId, collateralAmount, minimumDuration] = request

	return (
		<div className="flex flex-col gap-[16px] px-[16px] py-[16px]">
			<InfoCard
				title="Open Request"
				sections={[
					{ label: 'Borrower', value: `${borrower.slice(0, 6)}...${borrower.slice(-4)}` },
					{ label: 'Collateral', value: <Amount value={collateralAmount} decimals={6} /> },
					{ label: 'Position ID', value: (() => { const s = String(positionId); return s.length > 12 ? `${s.slice(0, 6)}...${s.slice(-4)}` : s })() },
					{ label: 'Min duration', value: `${Number(minimumDuration) / 3600}h` },
				]}
			/>
			<button
				type="button"
				onClick={() => onSelectRequest?.(nextRequestId! - 1n)}
				className="w-full h-[42px] rounded-[10px] bg-accent text-white text-[14px] font-medium border border-accent hover:bg-accent-hover transition-colors press-down"
			>
				Make Offer
			</button>
		</div>
	)
}

export declare namespace RequestsList {
	type Props = {
		onSelectRequest?: (requestId: bigint) => void
	}
}
