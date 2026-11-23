"use client";

import { useState } from "react";

import { ActionForm } from "@/components/partner/action-form";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/field";
import { addPropertyFee, deletePropertyFee } from "@/server/actions/partner-properties";

type Fee = {
  id: string;
  name: string;
  kind: "TAX" | "CAUTION_DEPOSIT" | "CLEANING" | "SERVICE" | "CUSTOM";
  calculation: "FIXED" | "PERCENTAGE" | "VARIABLE";
  amount: number | null;
  percentage: number | null;
  appliesTo: "PER_STAY" | "PER_NIGHT" | "PER_GUEST";
  isRefundable: boolean;
  isActive: boolean;
};

const KIND_LABELS: Record<Fee["kind"], string> = {
  TAX: "Tax",
  CAUTION_DEPOSIT: "Caution / deposit",
  CLEANING: "Cleaning",
  SERVICE: "Service",
  CUSTOM: "Custom",
};

function feeAmountLabel(fee: Fee, currency: string) {
  if (fee.calculation === "VARIABLE") return "Amount varies per booking";
  if (fee.calculation === "PERCENTAGE") return `${fee.percentage ?? 0}%`;
  const amount = fee.amount ?? 0;
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function PropertyFeesManager({
  propertyId,
  currency,
  fees,
}: {
  propertyId: string;
  currency: string;
  fees: Fee[];
}) {
  const [calculation, setCalculation] = useState<"FIXED" | "PERCENTAGE" | "VARIABLE">("FIXED");

  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <h2 className="font-display text-xl text-ink-900">Taxes, caution &amp; custom fees</h2>
      <p className="mt-1 text-sm text-ink-600">
        Add charges that apply to bookings for this property — e.g. VAT, a refundable caution deposit, or any custom fee.
        You can save a fixed/percentage amount, or save the <strong>name only</strong> (variable) if the amount differs each time.
      </p>

      {fees.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {fees.map((fee) => (
            <li key={fee.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-900">
                  {fee.name} <span className="font-normal text-ink-500">· {KIND_LABELS[fee.kind]}</span>
                </p>
                <p className="text-[13px] text-ink-600">
                  {feeAmountLabel(fee, currency)} · {fee.appliesTo.replace("PER_", "per ").toLowerCase()}
                  {fee.isRefundable ? " · refundable" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={fee.calculation === "VARIABLE" ? "warning" : "neutral"}>
                  {fee.calculation === "VARIABLE" ? "Variable" : fee.calculation === "PERCENTAGE" ? "Percentage" : "Fixed"}
                </Badge>
                <ActionForm
                  action={deletePropertyFee}
                  hidden={{ propertyId, feeId: fee.id }}
                  submitLabel="Remove"
                  submitVariant="ghost"
                  submitSize="sm"
                  showStatus={false}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-500">No fees configured yet.</p>
      )}

      <div className="mt-5 border-t border-line pt-4">
        <h3 className="text-[15px] font-semibold text-ink-900">Add a fee</h3>
        <ActionForm action={addPropertyFee} hidden={{ propertyId }} submitLabel="Add fee" submitPendingLabel="Adding…" className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Fee name" htmlFor="fee-name" required className="sm:col-span-2">
            <Input id="fee-name" name="name" required placeholder="e.g. VAT, Caution deposit, Resort fee" />
          </Field>
          <Field label="Type" htmlFor="fee-kind">
            <Select id="fee-kind" name="kind" defaultValue="CUSTOM">
              <option value="TAX">Tax</option>
              <option value="CAUTION_DEPOSIT">Caution / deposit</option>
              <option value="SERVICE">Service</option>
              <option value="CLEANING">Cleaning</option>
              <option value="CUSTOM">Custom</option>
            </Select>
          </Field>
          <Field label="How is it charged?" htmlFor="fee-calc">
            <Select id="fee-calc" name="calculation" value={calculation} onChange={(e) => setCalculation(e.target.value as any)}>
              <option value="FIXED">Fixed amount</option>
              <option value="PERCENTAGE">Percentage</option>
              <option value="VARIABLE">Variable (name only, amount differs each time)</option>
            </Select>
          </Field>
          {calculation === "FIXED" ? (
            <Field label={`Amount (${currency})`} htmlFor="fee-amount" required>
              <Input id="fee-amount" name="amount" type="number" min="0" step="0.01" inputMode="decimal" required />
            </Field>
          ) : null}
          {calculation === "PERCENTAGE" ? (
            <Field label="Percentage (%)" htmlFor="fee-percent" required>
              <Input id="fee-percent" name="percentage" type="number" min="0" step="0.01" inputMode="decimal" required />
            </Field>
          ) : null}
          {calculation === "VARIABLE" ? (
            <p className="sm:col-span-2 text-[13px] text-ink-600">
              This fee will be listed by name on the booking; the amount can be confirmed later and is not added to the total automatically.
            </p>
          ) : null}
          <Field label="Applies to" htmlFor="fee-applies">
            <Select id="fee-applies" name="appliesTo" defaultValue="PER_STAY">
              <option value="PER_STAY">Per stay</option>
              <option value="PER_NIGHT">Per night</option>
              <option value="PER_GUEST">Per guest</option>
            </Select>
          </Field>
          <label className="mt-6 flex items-center gap-2 text-[13px] text-ink-700">
            <input type="checkbox" name="isRefundable" value="1" className="h-4 w-4 rounded border-line-strong" />
            Refundable (e.g. caution deposit)
          </label>
        </ActionForm>
      </div>
    </section>
  );
}
