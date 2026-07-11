"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LOG_CURRENCIES, getIconGlyph, resolveHomeCurrency } from "@/lib/currency";
import { applyPwaIconLinks, iconPath, setHomeCurrencyCookie } from "@/lib/pwa-icons";
import { parseUserError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormError, FormField, Select } from "@/components/ui/form";

interface Props {
  homeCurrency: string;
}

export function AppIconCurrencyCard({ homeCurrency }: Props) {
  const updateHomeCurrency = useMutation(api.users.updateHomeCurrency);
  const [currency, setCurrency] = useState(resolveHomeCurrency(homeCurrency));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCurrency(resolveHomeCurrency(homeCurrency));
  }, [homeCurrency]);

  const glyph = getIconGlyph(currency);
  const previewSrc = iconPath(currency, 180);
  const dirty = currency !== resolveHomeCurrency(homeCurrency);

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      const next = await updateHomeCurrency({ homeCurrency: currency });
      setHomeCurrencyCookie(next);
      applyPwaIconLinks(next);
      setCurrency(next);
      setSaved(true);
    } catch (err) {
      setError(parseUserError(err, "We couldn't update the app icon currency."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>App icon currency</CardTitle>
        <CardDescription>
          Chooses the currency symbol on Kubera&apos;s install icon. Balances and
          budgets still use Indian Rupees.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt={`Kubera icon preview with ${glyph}`}
            width={72}
            height={72}
            className="h-[72px] w-[72px] shrink-0 rounded-[18px] shadow-sm"
            key={previewSrc}
          />

          <FormField label="Symbol" className="min-w-0 flex-1">
            <Select
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                setSaved(false);
              }}
            >
              {LOG_CURRENCIES.map((option) => (
                <option key={option.code} value={option.code}>
                  {getIconGlyph(option.code)} · {option.code} — {option.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          After changing this, reinstall the app (or remove it from your home
          screen and add it again) if the icon doesn&apos;t update — especially on
          iPhone.
        </p>

        {error && (
          <FormError
            title="Icon currency not updated"
            message={error}
            onDismiss={() => setError(null)}
          />
        )}
        {saved && !dirty && (
          <p className="text-sm text-income">App icon currency saved.</p>
        )}

        <Button type="button" onClick={handleSave} disabled={loading || !dirty}>
          {loading ? "Saving…" : "Save icon currency"}
        </Button>
      </CardContent>
    </Card>
  );
}
