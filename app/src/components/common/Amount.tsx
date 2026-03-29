import type { ReactNode } from 'react'

export function Amount(props: Amount.Props) {
	const { value, decimals, prefix, suffix, after, before, maxWidth = 24 } = props

	const raw = typeof value === 'bigint' ? value : BigInt(value)
	const divisor = 10n ** BigInt(decimals)
	const whole = raw / divisor
	const frac = raw % divisor

	const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
	const formatted = fracStr.length > 0
		? `${whole.toLocaleString()}.${fracStr}`
		: whole.toLocaleString()

	return (
		<span className="inline-flex items-center gap-1 min-w-0">
			{before}
			<span
				className="overflow-hidden text-ellipsis whitespace-nowrap min-w-0"
				style={{ maxWidth: `${maxWidth}ch` }}
				title={`${prefix ?? ''}${formatted}${suffix ?? ''}`}
			>
				{`${prefix ?? ''}${formatted}${suffix ?? ''}`}
			</span>
			{after}
		</span>
	)
}

export namespace Amount {
	export interface Props {
		value: bigint | string
		decimals: number
		after?: ReactNode
		before?: ReactNode
		maxWidth?: number
		prefix?: string
		suffix?: string
	}

	export const USDC_DECIMALS = 6
}
