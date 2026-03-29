import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { PolymarketClient } from '@polylend/sdk'

const polymarket = new PolymarketClient('https://clob.polymarket.com')

interface Market {
	condition_id: string
	question: string
	icon?: string
	image?: string
	tokens: Array<{ token_id: string; outcome: string; price: number }>
	active: boolean
	closed: boolean
	accepting_orders: boolean
}

export function MarketSelector(props: MarketSelector.Props) {
	const { onSelect } = props
	const [search, setSearch] = React.useState('')

	const { data: marketsPage } = useQuery({
		queryKey: ['polymarket', 'sampling-markets'],
		queryFn: () => polymarket.getSamplingMarkets(),
		staleTime: 60_000,
	})

	const markets = (marketsPage?.data as Market[] | undefined)?.filter(
		(m) => m.active && !m.closed && m.accepting_orders
	) ?? []

	const filtered = search.length > 0
		? markets.filter((m) => m.question?.toLowerCase().includes(search.toLowerCase()))
		: markets.slice(0, 20)

	return (
		<div className="rounded-[10px] border border-card-border bg-card-header overflow-hidden shadow-[0px_12px_40px_rgba(0,0,0,0.06)]">
			<input
				type="text"
				value={search}
				onChange={(e) => setSearch(e.target.value)}
				placeholder="Search markets..."
				autoFocus
				className="w-full h-[42px] px-[16px] bg-transparent text-[14px] text-primary outline-none placeholder:text-disabled border-b border-card-border"
			/>
			<div className="max-h-[320px] overflow-y-auto">
				{filtered.map((m) => (
					<button
						key={m.condition_id}
						type="button"
						onClick={() => onSelect?.(m)}
						className="w-full flex items-center gap-[10px] px-[16px] py-[10px] hover:bg-base-alt text-left press-down transition-colors"
					>
						{m.icon && (
							<img src={m.icon} alt="" className="w-[24px] h-[24px] rounded-full shrink-0" />
						)}
						<span className="text-[13px] text-primary truncate flex-1">{m.question}</span>
						<span className="text-[12px] font-mono text-tertiary shrink-0">
							{m.tokens?.[0]?.price != null && `¢${(m.tokens[0].price * 100).toFixed(1)}`}
						</span>
					</button>
				))}
				{filtered.length === 0 && (
					<div className="px-[16px] py-[24px] text-[13px] text-tertiary text-center">
						{markets.length === 0 ? 'Loading markets...' : 'No markets found'}
					</div>
				)}
			</div>
		</div>
	)
}

export declare namespace MarketSelector {
	type Props = {
		selected?: Market | null
		onSelect?: (market: Market) => void
	}
}

export type { Market }
