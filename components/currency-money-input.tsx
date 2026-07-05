"use client";

import { useEffect, useMemo, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RefreshCw } from "lucide-react";
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
import { Select } from "@/components/ui/form";

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
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </p>
        {!forceBaseCurrency && (
          <Select
            value={effectiveCurrency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            disabled={disabled}
            className="h-8 w-auto min-w-[7.5rem] py-1 text-xs"
          >
            {LOG_CURRENCIES.map((option) => (
              <option key={option.code} value={option.code}>
                {option.code} · {option.label}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="mt-2 flex items-baseline justify-center gap-1">
        <span className="text-2xl font-medium text-muted-foreground">{symbol}</span>
        <input
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
          className="w-full max-w-[220px] bg-transparent text-center text-4xl font-bold tabular-nums tracking-tight text-foreground outline-none placeholder:text-muted-foreground/30"
        />
      </div>

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
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
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
