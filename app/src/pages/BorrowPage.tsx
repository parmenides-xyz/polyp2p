import * as React from 'react'
import { useChainId } from 'wagmi'
import { Sections } from '#/components/common/Sections.tsx'
import { MarketSelector, type Market } from '#/components/common/MarketSelector.tsx'
import { MarketCard } from '#/components/borrow/MarketCard.tsx'
import { DepositTab } from '#/components/borrow/DepositTab.tsx'
import { BorrowTab } from '#/components/borrow/BorrowTab.tsx'
import { RepayTab } from '#/components/borrow/RepayTab.tsx'
import { getContractConfig } from '@polylend/sdk'

export function BorrowPage() {
	const chainId = useChainId()
	const config = getContractConfig(chainId)
	const [activeTab, setActiveTab] = React.useState(0)
	const [selectedSide, setSelectedSide] = React.useState<'yes' | 'no'>('yes')
	const [market, setMarket] = React.useState<Market | null>(null)
	const [picking, setPicking] = React.useState(true)

	const tokens = market?.tokens
	const yesToken = tokens?.find((t) => t.outcome === 'Yes')
	const noToken = tokens?.find((t) => t.outcome === 'No')
	const selectedToken = selectedSide === 'yes' ? yesToken : noToken

	const handleSelect = (m: Market) => {
		setMarket(m)
		setPicking(false)
	}

	if (picking || !market) {
		return (
			<div className="w-full max-w-[480px]">
				<MarketSelector selected={market} onSelect={handleSelect} />
			</div>
		)
	}

	const marketCard = (
		<MarketCard
			name={market.question}
			imageUrl={market.icon}
			yesPrice={yesToken?.price}
			noPrice={noToken?.price}
			selectedSide={selectedSide}
			onSideChange={setSelectedSide}
			onChangeMaket={() => setPicking(true)}
		/>
	)

	return (
		<div className="w-full max-w-[480px]">
			<Sections
				activeSection={activeTab}
				onSectionChange={setActiveTab}
				sections={[
					{
						title: 'Deposit',
						content: (
							<div className="flex flex-col">
								{marketCard}
								<div className="border-t border-dashed border-card-border" />
								<DepositTab
									positionId={config.testPositionIds
										? (selectedSide === 'yes' ? config.testPositionIds.yes : config.testPositionIds.no)
										: selectedToken?.token_id}
									price={selectedToken?.price}
									side={selectedSide}
								/>
							</div>
						),
					},
					{
						title: 'Borrow',
						content: (
							<div className="flex flex-col">
								{marketCard}
								<div className="border-t border-dashed border-card-border" />
								<BorrowTab />
							</div>
						),
					},
					{
						title: 'Repay',
						content: <RepayTab />,
					},
					{
						title: 'Withdraw',
						content: (
							<div className="px-[16px] py-[24px] text-center text-[13px] text-secondary">
								Withdraw collateral after repaying your loan
							</div>
						),
					},
				]}
			/>
		</div>
	)
}
