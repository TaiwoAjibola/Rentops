"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Field, Input } from "@/components/ui/field";

export function PasswordField({
  name,
  label,
  autoComplete,
  hint,
  error,
  placeholder,
  required = true,
  defaultValue,
}: {
  name: string;
  label: string;
  autoComplete?: string;
  hint?: string;
  error?: string | null;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} required={required}>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          defaultValue={defaultValue}
          className="pr-11"
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-700"
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    </Field>
  );
}
