"use client";

import { useEffect, useMemo, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ChevronDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BASE_CURRENCY,
  convertToBaseCurrency,
  formatExchangeRate,
  formatInCurrency,
  getCurrencySymbol,
  isBaseCurrency,
  LOG_CURRENCIES,
} from "@/lib/currency";
import { formatCurrency } from "@/lib/format";

interface CurrencyMoneyInputProps {
  value: string;
  onChange: (value: string) => void;
  currency: string;
  onCurrencyChange: (currency: string) => void;
  exchangeRate: number | null;
  onExchangeRateChange: (rate: number | null, rateDate: string | null) => void;
  /** Transaction date (YYYY-MM-DD) for historical rates */
  transactionDate: string;
  label?: string;
  autoFocus?: boolean;
  required?: boolean;
  disabled?: boolean;
  /** Lock currency to INR (subscriptions / EMIs) */
  forceBaseCurrency?: boolean;
}

export function CurrencyMoneyInput({
  value,
  onChange,
  currency,
  onCurrencyChange,
  exchangeRate,
  onExchangeRateChange,
  transactionDate,
  label = "Amount",
  autoFocus,
  required,
  disabled,
  forceBaseCurrency = false,
}: CurrencyMoneyInputProps) {
  const getExchangeRate = useAction(api.currency.getExchangeRate);
  const [loadingRate, setLoadingRate] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  const effectiveCurrency = forceBaseCurrency ? BASE_CURRENCY : currency;
  const symbol = getCurrencySymbol(effectiveCurrency);
  const parsed = parseFloat(value);
  const isForeign = !isBaseCurrency(effectiveCurrency);

  const convertedAmount = useMemo(() => {
    if (!isForeign || !exchangeRate || !parsed || parsed <= 0) return null;
    return convertToBaseCurrency(parsed, exchangeRate, effectiveCurrency);
  }, [isForeign, exchangeRate, parsed, effectiveCurrency]);

  const fetchRate = async (from: string, date: string) => {
    if (isBaseCurrency(from)) {
      onExchangeRateChange(null, null);
      setRateError(null);
      return;
    }

    setLoadingRate(true);
    setRateError(null);
    try {
      const result = await getExchangeRate({ from, date });
      onExchangeRateChange(result.rate, result.date);
    } catch (err) {
      onExchangeRateChange(null, null);
      setRateError(err instanceof Error ? err.message : "Could not load exchange rate");
    } finally {
      setLoadingRate(false);
    }
  };

  useEffect(() => {
    if (forceBaseCurrency) return;
    void fetchRate(effectiveCurrency, transactionDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveCurrency, transactionDate, forceBaseCurrency]);

  return (
    <div className="rounded-2xl border border-border/40 bg-muted/15 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-caption font-medium text-muted-foreground">
          {label}
        </p>
        {!forceBaseCurrency && (
          <label className="relative -my-2 inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-full bg-card px-3 text-[13px] font-semibold text-foreground ring-1 ring-border/80 transition-colors focus-within:ring-2 focus-within:ring-primary/30 hover:bg-muted/50">
            {effectiveCurrency}
            <ChevronDown size={14} className="text-muted-foreground" aria-hidden />
            <select
              aria-label="Currency"
              value={effectiveCurrency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              disabled={disabled}
              className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
            >
              {LOG_CURRENCIES.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code} · {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <label className="mt-2 flex cursor-text items-baseline justify-center gap-1">
        <span className="text-2xl font-medium text-muted-foreground" aria-hidden>
          {symbol}
        </span>
        <input
          aria-label={`${label} in ${effectiveCurrency}`}
          style={{ width: `${Math.max(value.length, 1) + 0.5}ch` }}
          type="number"
          step={effectiveCurrency === "JPY" ? "1" : "0.01"}
          min={effectiveCurrency === "JPY" ? "1" : "0.01"}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder="0"
          className="min-h-11 min-w-0 max-w-full bg-transparent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none text-center text-4xl font-bold tabular-nums tracking-tight text-foreground outline-none placeholder:text-muted-foreground/30"
        />
      </label>

      {isForeign && (
        <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
          {loadingRate ? (
            <p className="text-center text-xs text-muted-foreground">Loading exchange rate…</p>
          ) : rateError ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-center text-xs text-[hsl(var(--expense))]">{rateError}</p>
              <button
                type="button"
                onClick={() => void fetchRate(effectiveCurrency, transactionDate)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-foreground hover:underline"
              >
                <RefreshCw size={12} />
                Retry
              </button>
            </div>
          ) : exchangeRate ? (
            <>
              <p className="text-center text-xs text-muted-foreground">
                {formatExchangeRate(effectiveCurrency, BASE_CURRENCY, exchangeRate)}
                {convertedAmount != null && (
                  <>
                    {" "}
                    · saves as{" "}
                    <span className="font-medium text-foreground">
                      {formatCurrency(convertedAmount)}
                    </span>
                  </>
                )}
              </p>
              {parsed > 0 && convertedAmount != null && (
                <p className="text-center text-[11px] text-muted-foreground">
                  {formatInCurrency(parsed, effectiveCurrency)} → {formatCurrency(convertedAmount)}
                </p>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function getConvertedAmount(
  value: string,
  currency: string,
  exchangeRate: number | null,
): number | null {
  const parsed = parseFloat(value);
  if (!parsed || parsed <= 0) return null;
  if (isBaseCurrency(currency)) return parsed;
  if (!exchangeRate) return null;
  return convertToBaseCurrency(parsed, exchangeRate, currency);
}
