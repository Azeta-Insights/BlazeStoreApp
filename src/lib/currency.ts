/**
 * Nigerian Naira (NGN / ₦) Currency Helpers & Formatters
 */

export const CURRENCY_SYMBOL = '₦';
export const CURRENCY_CODE = 'NGN';

/**
 * Formats any numeric value into standard Nigerian Naira display (e.g., ₦25,000 or ₦25,000.50)
 */
export function formatNaira(
  amount: number | string | undefined | null,
  options?: {
    showDecimals?: boolean;
    compact?: boolean;
  }
): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return '₦0';
  }

  const num = Number(amount);

  if (options?.compact && Math.abs(num) >= 1_000_000) {
    return `₦${(num / 1_000_000).toFixed(1)}M`;
  }
  if (options?.compact && Math.abs(num) >= 1_000) {
    return `₦${(num / 1_000).toFixed(0)}K`;
  }

  const hasFraction = num % 1 !== 0;
  const showDecimals = options?.showDecimals ?? hasFraction;

  return `₦${num.toLocaleString('en-NG', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  })}`;
}

export const formatPrice = formatNaira;
export const formatCurrency = formatNaira;
