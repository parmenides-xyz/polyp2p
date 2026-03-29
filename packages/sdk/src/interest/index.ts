/// Port of InterestLib.sol — fixed-point exponentiation with ONE = 10^18

export const ONE = 10n ** 18n;
export const ONE_THOUSAND_APY = 76_036_763_191n;
export const MAX_INTEREST = ONE + ONE_THOUSAND_APY;
export const SECONDS_PER_YEAR = 31_536_000n;

/**
 * Fixed-point exponentiation by squaring.
 * Mirrors InterestLib.pow(base, exponent) in Solidity.
 *
 * amount_owed = loanAmount * pow(rate, duration) / ONE
 */
export function pow(base: bigint, exponent: bigint): bigint {
    if (exponent === 0n) {
        return ONE;
    } else if (exponent % 2n === 0n) {
        const half = pow(base, exponent / 2n);
        return (half * half) / ONE;
    } else {
        return (base * pow(base, exponent - 1n)) / ONE;
    }
}

/**
 * Calculate total amount owed on a loan.
 * Mirrors PolyLend.getAmountOwed(loanId, paybackTime).
 */
export function calculateAmountOwed(
    loanAmount: bigint,
    rate: bigint,
    durationSeconds: bigint,
): bigint {
    return (loanAmount * pow(rate, durationSeconds)) / ONE;
}

/**
 * Convert a per-second compound rate to annualized percentage yield.
 * Uses floating-point since the result is for display only.
 */
export function rateToAPY(rate: bigint): number {
    const rateFloat = Number(rate) / Number(ONE);
    return (rateFloat ** Number(SECONDS_PER_YEAR) - 1) * 100;
}

/**
 * Convert an APY percentage to a per-second compound rate.
 * Returns the rate as a bigint with ONE = 10^18 precision.
 */
export function apyToRate(apyPercent: number): bigint {
    const annualMultiplier = 1 + apyPercent / 100;
    const perSecondRate = annualMultiplier ** (1 / Number(SECONDS_PER_YEAR));
    return BigInt(Math.round(perSecondRate * Number(ONE)));
}
