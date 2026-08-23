'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../../lib/cn.js';
import { fieldControlVariants, type SyFieldState, type SyFieldVariant } from './field.variants.js';

export type { SyFieldState, SyFieldVariant };

export type SyFieldOption = { value: string; label: string };

type Common = {
  /** Always visible. The contract admits no label-less field. */
  label: string;
  /** Helper text, e.g. "Uppercase, hyphenated". */
  helper?: ReactNode;
  required?: boolean;
  /** Message. Its presence is the invalid state, and it is never colour alone. */
  invalid?: string;
  /** Message. Non-blocking counterpart to `invalid`. */
  warning?: string;
  /**
   * The value came from a model and awaits a decision. Renders the AI
   * register; the accept and reject affordances belong to SySuggestion,
   * which wraps this field and is not part of Phase 1.
   */
  suggested?: boolean;
  className?: string;
};

/** "Reason shown, never silently disabled" — the specimen's own words. */
type ReadOnly =
  { readOnly: true; readOnlyReason: string } | { readOnly?: false; readOnlyReason?: never };

type Disabled =
  { disabled: true; disabledReason: string } | { disabled?: false; disabledReason?: never };

type FreeText = {
  variant?: 'text' | 'mono' | 'number' | 'date' | 'textarea';
  value: string;
  onValueChange?: (value: string) => void;
};

type SingleChoice = {
  variant: 'select' | 'combobox';
  value: string;
  onValueChange?: (value: string) => void;
  options: SyFieldOption[];
  /** Options are still arriving. */
  loading?: boolean;
};

type MultiChoice = {
  variant: 'multi-facet';
  values: string[];
  onValuesChange?: (values: string[]) => void;
  options: SyFieldOption[];
  loading?: boolean;
};

export type SyFieldProps = Common & ReadOnly & Disabled & (FreeText | SingleChoice | MultiChoice);

const INPUT_TYPE: Partial<Record<SyFieldVariant, string>> = {
  text: 'text',
  mono: 'text',
  number: 'number',
  date: 'date',
};

/** One labelled value of any type. */
export function SyField(props: SyFieldProps) {
  const {
    label,
    helper,
    required = false,
    invalid,
    warning,
    suggested = false,
    className,
    readOnly = false,
    disabled = false,
  } = props;

  const variant: SyFieldVariant = props.variant ?? 'text';
  /** The value an in-progress edit reverts to when Esc is pressed. */
  const revertTo = useRef<string | null>(null);
  const controlId = useId();
  const helperId = useId();
  const messageId = useId();
  const listboxId = useId();

  const loading = 'loading' in props ? Boolean(props.loading) : false;
  const inert = readOnly || disabled;

  const tone = invalid ? 'invalid' : warning ? 'warning' : suggested ? 'suggested' : 'default';

  // The reason a field cannot be edited is stated, never left implicit.
  const reason = disabled ? props.disabledReason : readOnly ? props.readOnlyReason : undefined;

  const describedBy =
    [invalid || warning ? messageId : null, helper || reason ? helperId : null]
      .filter(Boolean)
      .join(' ') || undefined;

  const controlClass = cn(fieldControlVariants({ variant, tone, inert }), className);

  const shared = {
    id: controlId,
    'aria-describedby': describedBy,
    'aria-invalid': invalid ? (true as const) : undefined,
    'aria-required': required || undefined,
    disabled,
    className: controlClass,
  };

  return (
    <div className="flex w-full flex-col gap-100">
      <label htmlFor={controlId} className="text-caption text-text-primary">
        {label}
        {required ? (
          // The asterisk is decoration; `aria-required` on the control is
          // what a screen reader hears.
          <span aria-hidden="true" className="text-status-danger-fg">
            {' *'}
          </span>
        ) : null}
      </label>

      {renderControl()}

      {invalid || warning ? (
        <p
          id={messageId}
          className={cn(
            'text-caption',
            invalid ? 'text-status-danger-fg' : 'text-status-warning-fg',
          )}
        >
          {/* "invalid = border + icon + text". The specimen's icon is the
              character itself, so no icon set is involved (D6 untouched).
              It is aria-hidden: the message beside it is what carries the
              meaning, so nothing is said by the glyph alone. */}
          <span aria-hidden="true">⚠ </span>
          {invalid ?? warning}
        </p>
      ) : null}

      {helper || reason ? (
        <p id={helperId} className="text-caption text-text-tertiary">
          {reason ?? helper}
        </p>
      ) : null}
    </div>
  );

  function renderControl() {
    if (variant === 'textarea') {
      return (
        <textarea
          {...shared}
          readOnly={readOnly}
          value={(props as FreeText).value}
          onChange={(event) => (props as FreeText).onValueChange?.(event.target.value)}
          onKeyDown={handleRevertKey}
          onFocus={(event) => {
            revertTo.current = event.currentTarget.value;
          }}
        />
      );
    }

    if (variant === 'select') {
      const single = props as SingleChoice;
      return (
        <select
          {...shared}
          value={single.value}
          onChange={(event) => single.onValueChange?.(event.target.value)}
        >
          {loading ? (
            <option value="">Loading options…</option>
          ) : (
            single.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          )}
        </select>
      );
    }

    if (variant === 'combobox' || variant === 'multi-facet') {
      const multi = variant === 'multi-facet';
      const choice = props as SingleChoice | MultiChoice;
      const selected = multi
        ? (props as MultiChoice).values
        : [(props as SingleChoice).value].filter(Boolean);

      return (
        <ComboControl
          shared={shared}
          controlId={controlId}
          listboxId={listboxId}
          label={label}
          multi={multi}
          loading={loading}
          readOnly={readOnly}
          disabled={disabled}
          options={choice.options}
          selected={selected}
          displayValue={multi ? selected.join(', ') : (props as SingleChoice).value}
          onCommit={(value) => {
            if (multi) {
              const current = (props as MultiChoice).values;
              (props as MultiChoice).onValuesChange?.(
                current.includes(value)
                  ? current.filter((entry) => entry !== value)
                  : [...current, value],
              );
              return;
            }
            (props as SingleChoice).onValueChange?.(value);
          }}
        />
      );
    }

    return (
      <input
        {...shared}
        type={INPUT_TYPE[variant] ?? 'text'}
        readOnly={readOnly}
        value={(props as FreeText).value}
        onChange={(event) => (props as FreeText).onValueChange?.(event.target.value)}
        onKeyDown={handleRevertKey}
        onFocus={(event) => {
          revertTo.current = event.currentTarget.value;
        }}
      />
    );
  }

  function handleRevertKey(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    // "Esc reverts an in-progress inline edit" — back to whatever the value
    // was when this edit began, not to empty.
    if (event.key === 'Escape' && revertTo.current !== null) {
      event.preventDefault();
      (props as FreeText).onValueChange?.(revertTo.current);
    }
  }
}

/**
 * The combobox and multi-facet listbox.
 *
 * Deliberately not built on an overlay substrate: in the ARIA combobox
 * pattern focus never leaves the input — a virtual cursor moves through the
 * options via aria-activedescendant — so there is nothing to trap, stack or
 * restore. SyPalette traps focus because it is a modal surface; a field does
 * not.
 */
function ComboControl({
  shared,
  controlId,
  listboxId,
  label,
  multi,
  loading,
  readOnly,
  disabled,
  options,
  selected,
  displayValue,
  onCommit,
}: {
  shared: Record<string, unknown>;
  controlId: string;
  listboxId: string;
  label: string;
  multi: boolean;
  loading: boolean;
  readOnly: boolean;
  disabled: boolean;
  options: SyFieldOption[];
  selected: string[];
  displayValue: string;
  onCommit: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  function commit(value: string) {
    onCommit(value);
    // A single choice is finished; a facet list stays open to take another.
    if (!multi) setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled || readOnly) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) setOpen(true);
      else setActive((index) => Math.min(index + 1, options.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === 'Enter' && open && options[active]) {
      event.preventDefault();
      commit(options[active]!.value);
      return;
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input
        {...shared}
        role="combobox"
        type="text"
        readOnly
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={open && options[active] ? `${controlId}-opt-${active}` : undefined}
        aria-busy={loading || undefined}
        value={displayValue}
        onKeyDown={handleKeyDown}
        onClick={() => !disabled && !readOnly && setOpen((was) => !was)}
        onChange={() => {}}
      />

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-multiselectable={multi || undefined}
          aria-label={`${label} options`}
          className="absolute z-10 mt-100 w-full rounded-sm border border-border-default bg-surface-default p-100 shadow-elev-1"
        >
          {loading ? (
            <li className="text-caption px-200 py-100 text-text-tertiary">Loading options…</li>
          ) : (
            options.map((option, index) => (
              <li
                key={option.value}
                id={`${controlId}-opt-${index}`}
                role="option"
                aria-selected={selected.includes(option.value)}
                // mousedown, not click: it fires before blur, so the input
                // keeps focus and the listbox does not close out from under
                // the pointer. Keyboard selection is the input's Enter, per
                // the aria-activedescendant pattern.
                onMouseDown={(event) => {
                  event.preventDefault();
                  commit(option.value);
                }}
                className={cn(
                  'text-body cursor-pointer rounded-xs px-200 py-100',
                  index === active && 'bg-surface-selected',
                )}
              >
                {option.label}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
