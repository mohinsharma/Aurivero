import { AssetClass } from '../../types/markets';

export function formatInstrumentPrice(
  price: number | null | undefined,
  assetClass: AssetClass,
  currency = 'USD',
  decimals?: number
): string {
  if (price === null || price === undefined || Number.isNaN(price)) return '—';
  if (assetClass === 'STOCK' || currency === 'INR') {
    return `₹${price.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  if (assetClass === 'FOREX') {
    const d = decimals ?? (price > 20 ? 4 : 4);
    return price.toFixed(d);
  }
  // CRYPTO
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  if (price >= 1) {
    return `$${price.toFixed(2)}`;
  }
  return `$${price.toFixed(4)}`;
}

export function formatCompactNumber(val: number | null | undefined, prefix = ''): string {
  if (val === null || val === undefined || Number.isNaN(val)) return '—';
  const abs = Math.abs(val);
  if (abs >= 1e12) return `${prefix}${(val / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${prefix}${(val / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${prefix}${(val / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${prefix}${(val / 1e3).toFixed(1)}K`;
  return `${prefix}${val.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}
