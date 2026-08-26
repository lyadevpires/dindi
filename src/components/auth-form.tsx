"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/app/auth/actions";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-tinta px-4 py-3 text-sm font-semibold text-creme transition hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Só um segundo..." : label}
    </button>
  );
}

export function Field({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
  autoComplete,
  required = true,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  autoComplete?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-borda bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-suave/60 focus:border-tinta"
      />
      {hint ? <span className="mt-1 block text-xs text-suave">{hint}</span> : null}
    </label>
  );
}

/** Formulário genérico ligado a uma server action. */
export function ActionForm({
  action,
  submitLabel,
  children,
  hidden,
}: {
  action: Action;
  submitLabel: string;
  children: React.ReactNode;
  hidden?: Record<string, string>;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {hidden
        ? Object.entries(hidden).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))
        : null}

      {children}

      {state?.error ? (
        <p className="rounded-xl bg-vermelhinho-claro px-3.5 py-2.5 text-sm text-vermelhinho">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="rounded-xl bg-verdinho-claro px-3.5 py-2.5 text-sm text-verdinho">
          {state.ok}
        </p>
      ) : null}

      <Submit label={submitLabel} />
    </form>
  );
}
