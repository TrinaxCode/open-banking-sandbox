/**
 * Multi-Currency & Foreign Exchange Simulator.
 *
 * Provides realistic foreign exchange rates pegged against USD as the base currency.
 * Used by the Currency Converter and international payment calculator sandbox.
 */

export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "MXN",
  "CAD",
  "JPY",
  "CHF",
  "BRL",
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export interface CurrencyMetadata {
  code: CurrencyCode;
  name: string;
  symbol: string;
  flag: string;
  ratePerUSD: number; // 1 USD = X Currency
}

export const CURRENCY_MAP: Record<CurrencyCode, CurrencyMetadata> = {
  USD: {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    flag: "🇺🇸",
    ratePerUSD: 1.0,
  },
  EUR: {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    flag: "🇪🇺",
    ratePerUSD: 0.92,
  },
  GBP: {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    flag: "🇬🇧",
    ratePerUSD: 0.79,
  },
  MXN: {
    code: "MXN",
    name: "Mexican Peso",
    symbol: "$",
    flag: "🇲🇽",
    ratePerUSD: 18.25,
  },
  CAD: {
    code: "CAD",
    name: "Canadian Dollar",
    symbol: "CA$",
    flag: "🇨🇦",
    ratePerUSD: 1.36,
  },
  JPY: {
    code: "JPY",
    name: "Japanese Yen",
    symbol: "¥",
    flag: "🇯🇵",
    ratePerUSD: 154.5,
  },
  CHF: {
    code: "CHF",
    name: "Swiss Franc",
    symbol: "CHF",
    flag: "🇨🇭",
    ratePerUSD: 0.9,
  },
  BRL: {
    code: "BRL",
    name: "Brazilian Real",
    symbol: "R$",
    flag: "🇧🇷",
    ratePerUSD: 5.45,
  },
};

export interface ConversionResult {
  fromAmount: number;
  fromCurrency: CurrencyCode;
  toAmount: number;
  toCurrency: CurrencyCode;
  rate: number;
  inverseRate: number;
  formattedFrom: string;
  formattedTo: string;
}

export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
): ConversionResult {
  const fromMeta = CURRENCY_MAP[from] ?? CURRENCY_MAP.USD;
  const toMeta = CURRENCY_MAP[to] ?? CURRENCY_MAP.EUR;

  // Convert from -> USD -> to
  const amountInUSD = amount / fromMeta.ratePerUSD;
  const convertedAmount = amountInUSD * toMeta.ratePerUSD;
  const rate = toMeta.ratePerUSD / fromMeta.ratePerUSD;
  const inverseRate = 1 / rate;

  const decimals = to === "JPY" ? 0 : 2;
  const roundedTo = Number(convertedAmount.toFixed(decimals));

  return {
    fromAmount: amount,
    fromCurrency: from,
    toAmount: roundedTo,
    toCurrency: to,
    rate: Number(rate.toFixed(4)),
    inverseRate: Number(inverseRate.toFixed(4)),
    formattedFrom: `${fromMeta.symbol}${amount.toFixed(2)}`,
    formattedTo: `${toMeta.symbol}${roundedTo.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`,
  };
}
