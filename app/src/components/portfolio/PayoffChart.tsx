export function PayoffChart(props: PayoffChart.Props) {
	const { collateralAmount, loanAmount, side } = props

	const width = 280
	const height = 140
	const padX = 36
	const padTop = 16
	const padBottom = 24
	const plotW = width - padX * 2
	const plotH = height - padTop - padBottom

	// Total shares = collateralAmount (CT tokens as 6-decimal fixed)
	// Total cost = loanAmount (what the borrower owes)
	const shares = collateralAmount
	const totalCost = loanAmount

	// Calculate P&L at each probability from 0% to 100%
	const points: { x: number; pnl: number }[] = []
	let minPnl = 0
	let maxPnl = 0

	for (let p = 0; p <= 100; p += 2) {
		const prob = p / 100
		let pnl: number
		if (side === 'yes') {
			// Value of YES shares at probability p = shares * p
			pnl = shares * prob - totalCost
		} else {
			// Value of NO shares at probability p = shares * (1 - p)
			pnl = shares * (1 - prob) - totalCost
		}
		points.push({ x: p, pnl })
		if (pnl < minPnl) minPnl = pnl
		if (pnl > maxPnl) maxPnl = pnl
	}

	// Add margin to range
	const range = maxPnl - minPnl || 1
	const yMin = minPnl - range * 0.1
	const yMax = maxPnl + range * 0.1
	const yRange = yMax - yMin

	const toSvgX = (p: number) => padX + (p / 100) * plotW
	const toSvgY = (pnl: number) => padTop + plotH - ((pnl - yMin) / yRange) * plotH
	const zeroY = toSvgY(0)

	// Build the line path
	const linePath = points
		.map((pt, i) => `${i === 0 ? 'M' : 'L'}${toSvgX(pt.x).toFixed(1)},${toSvgY(pt.pnl).toFixed(1)}`)
		.join(' ')

	// Build filled areas (green above zero, red below)
	const greenClip = `M${toSvgX(0)},${zeroY.toFixed(1)} ${points.map(pt => `L${toSvgX(pt.x).toFixed(1)},${Math.min(toSvgY(pt.pnl), zeroY).toFixed(1)}`).join(' ')} L${toSvgX(100)},${zeroY.toFixed(1)} Z`
	const redClip = `M${toSvgX(0)},${zeroY.toFixed(1)} ${points.map(pt => `L${toSvgX(pt.x).toFixed(1)},${Math.max(toSvgY(pt.pnl), zeroY).toFixed(1)}`).join(' ')} L${toSvgX(100)},${zeroY.toFixed(1)} Z`

	// Breakeven: find where P&L crosses zero
	let breakevenX: number | null = null
	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1]
		const curr = points[i]
		if ((prev.pnl <= 0 && curr.pnl >= 0) || (prev.pnl >= 0 && curr.pnl <= 0)) {
			const t = Math.abs(prev.pnl) / (Math.abs(prev.pnl) + Math.abs(curr.pnl))
			breakevenX = prev.x + t * (curr.x - prev.x)
			break
		}
	}

	// Format USD for axis labels
	const fmtUsd = (v: number) => {
		const abs = Math.abs(v)
		if (abs >= 1_000_000) return `${v < 0 ? '-' : ''}${(abs / 1_000_000).toFixed(1)}M`
		if (abs >= 1000) return `${v < 0 ? '-' : ''}${(abs / 1000).toFixed(0)}k`
		return v.toFixed(0)
	}

	return (
		<svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 140 }}>
			{/* Zero line */}
			<line
				x1={padX} y1={zeroY} x2={width - padX} y2={zeroY}
				stroke="#6e6e6e" strokeWidth={0.5} strokeDasharray="3,3"
			/>

			{/* Green fill (profit) */}
			<path d={greenClip} fill="#22c55e" fillOpacity={0.1} />

			{/* Red fill (loss) */}
			<path d={redClip} fill="#ef4444" fillOpacity={0.1} />

			{/* P&L line */}
			<path d={linePath} fill="none" stroke="#60a5fa" strokeWidth={1.5} />

			{/* Breakeven dot */}
			{breakevenX !== null && (
				<>
					<circle cx={toSvgX(breakevenX)} cy={zeroY} r={3} fill="#ffffff" />
					<text
						x={toSvgX(breakevenX)} y={zeroY - 8}
						textAnchor="middle" fill="#ffffff" fontSize={9} fontFamily="var(--font-mono)"
					>
						{breakevenX.toFixed(0)}%
					</text>
				</>
			)}

			{/* X-axis labels */}
			<text x={padX} y={height - 4} textAnchor="middle" fill="#6e6e6e" fontSize={9} fontFamily="var(--font-mono)">0%</text>
			<text x={padX + plotW / 2} y={height - 4} textAnchor="middle" fill="#6e6e6e" fontSize={9} fontFamily="var(--font-mono)">50%</text>
			<text x={padX + plotW} y={height - 4} textAnchor="middle" fill="#6e6e6e" fontSize={9} fontFamily="var(--font-mono)">100%</text>

			{/* Y-axis labels */}
			<text x={padX - 4} y={toSvgY(maxPnl) + 3} textAnchor="end" fill="#22c55e" fontSize={8} fontFamily="var(--font-mono)">{fmtUsd(maxPnl)}</text>
			<text x={padX - 4} y={toSvgY(minPnl) + 3} textAnchor="end" fill="#ef4444" fontSize={8} fontFamily="var(--font-mono)">{fmtUsd(minPnl)}</text>
		</svg>
	)
}

export declare namespace PayoffChart {
	export type Props = {
		collateralAmount: number
		loanAmount: number
		price: number
		side: 'yes' | 'no'
	}
}
