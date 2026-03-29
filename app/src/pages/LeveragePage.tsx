import { Sections } from '#/components/common/Sections.tsx'
import { LeveragePanel } from '#/components/leverage/LeveragePanel.tsx'
import { ExitPanel } from '#/components/leverage/ExitPanel.tsx'
import * as React from 'react'

export function LeveragePage() {
	const [activeTab, setActiveTab] = React.useState(0)

	return (
		<div className="w-full max-w-[480px]">
			<Sections
				activeSection={activeTab}
				onSectionChange={setActiveTab}
				sections={[
					{
						title: 'Leverage position',
						content: <LeveragePanel />,
					},
					{
						title: 'Exit position',
						content: <ExitPanel />,
					},
				]}
			/>
		</div>
	)
}
