import { cx } from '#/lib/css.ts'

export function MarketCard(props: MarketCard.Props) {
	const { name, yesPrice, noPrice, imageUrl, selectedSide, onSideChange, onChangeMaket } = props

	return (
		<div className="px-[16px] py-[16px]">
			<button
				type="button"
				onClick={onChangeMaket}
				className="flex items-center gap-[10px] mb-[12px] press-down"
			>
				{imageUrl && (
					<img src={imageUrl} alt={name} className="w-[32px] h-[32px] rounded-full" />
				)}
				<span className="text-[14px] font-medium text-primary text-left">{name}</span>
			</button>
			<div className="flex gap-[8px]">
				<button
					type="button"
					onClick={() => onSideChange?.('yes')}
					className={cx(
						'flex-1 h-[36px] rounded-[8px] text-[13px] font-medium transition-colors press-down',
						selectedSide === 'yes'
							? 'bg-positive/15 text-positive border border-positive/30'
							: 'bg-base-alt text-secondary border border-transparent hover:border-card-border',
					)}
				>
					Yes {yesPrice != null && <span className="ml-[4px]">¢{(yesPrice * 100).toFixed(1)}</span>}
				</button>
				<button
					type="button"
					onClick={() => onSideChange?.('no')}
					className={cx(
						'flex-1 h-[36px] rounded-[8px] text-[13px] font-medium transition-colors press-down',
						selectedSide === 'no'
							? 'bg-negative/15 text-negative border border-negative/30'
							: 'bg-base-alt text-secondary border border-transparent hover:border-card-border',
					)}
				>
					No {noPrice != null && <span className="ml-[4px]">¢{(noPrice * 100).toFixed(1)}</span>}
				</button>
			</div>
		</div>
	)
}

export declare namespace MarketCard {
	type Props = {
		name: string
		yesPrice?: number
		noPrice?: number
		imageUrl?: string
		selectedSide?: 'yes' | 'no'
		onSideChange?: (side: 'yes' | 'no') => void
		onChangeMaket?: () => void
	}
}
