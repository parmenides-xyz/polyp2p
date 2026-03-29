import * as React from 'react'
import { Sections } from '#/components/common/Sections.tsx'
import { RequestsList } from '#/components/lend/RequestsList.tsx'
import { OfferForm } from '#/components/lend/OfferForm.tsx'

export function LendPage() {
	const [activeTab, setActiveTab] = React.useState(0)
	const [selectedRequestId, setSelectedRequestId] = React.useState<bigint>()

	const handleSelectRequest = (requestId: bigint) => {
		setSelectedRequestId(requestId)
		setActiveTab(0)
	}

	return (
		<div className="w-full max-w-[480px]">
			<Sections
				activeSection={activeTab}
				onSectionChange={setActiveTab}
				sections={[
					{
						title: 'Supply',
						content: (
							<>
								<RequestsList onSelectRequest={handleSelectRequest} />
								{selectedRequestId != null && (
									<OfferForm requestId={selectedRequestId} />
								)}
							</>
						),
					},
					{
						title: 'Withdraw',
						content: (
							<div className="px-[16px] py-[24px] text-center text-[13px] text-tertiary">
								Withdraw USDC after loan is repaid
							</div>
						),
					},
				]}
			/>
		</div>
	)
}
