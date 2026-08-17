'use client';

import type { KeyboardEvent, ReactNode } from 'react';
import { cn } from '../../lib/cn.js';

/** chip · row · inline text · with thumbnail (assets). */
export const ENTITY_REF_VARIANTS = ['chip', 'row', 'inline', 'thumbnail'] as const;
export type SyEntityRefVariant = (typeof ENTITY_REF_VARIANTS)[number];

export const ENTITY_REF_STATES = [
  'resolved',
  'loading',
  'deleted',
  'no-permission',
  'deprecated',
] as const;
export type SyEntityRefState = (typeof ENTITY_REF_STATES)[number];

type Common = {
  /**
   * The entity type, as a word: "Sign", "Lesson", "Asset".
   *
   * A string rather than a union of entity types. Decision D3 keeps domain
   * vocabulary out of this package — the component is "a pointer to any
   * entity", and which entities exist is the application's business.
   */
  typeLabel: string;
  id: string;
  variant?: SyEntityRefVariant;
  /** The type glyph. Decorative; the caller supplies it (open decision D6). */
  glyph?: ReactNode;
  /** For the thumbnail variant. Decorative — the name carries the meaning. */
  thumbnail?: ReactNode;
  /** Enter opens. */
  onOpen?: () => void;
  /** ⌘Enter opens in a side peek, without losing the current context. */
  onPeek?: () => void;
  className?: string;
};

/** A reference that has not resolved yet may not know its name. */
type Loading = { state: 'loading'; name?: string };

/**
 * "Replacement declared or explicitly none" (§15.3). Nullable rather than
 * optional, so a deprecated reference cannot omit the question.
 */
type Deprecated = { state: 'deprecated'; name: string; replacement: string | null };

type Named = { state?: 'resolved' | 'deleted' | 'no-permission'; name: string };

export type SyEntityRefProps = Common & (Named | Loading | Deprecated);

const VARIANT_BOX: Record<SyEntityRefVariant, string> = {
  chip: 'inline-flex items-center gap-200 rounded-sm border border-border-default bg-surface-default px-200 py-050',
  row: 'flex w-full items-center gap-200 rounded-sm px-200 py-100',
  inline: 'inline-flex items-baseline gap-100',
  thumbnail:
    'inline-flex items-center gap-200 rounded-sm border border-border-default bg-surface-default p-050 pe-200',
};

/** States that can be opened. A deleted or forbidden entity has nowhere to go. */
const OPENABLE: ReadonlySet<SyEntityRefState> = new Set(['resolved', 'deprecated']);

export function SyEntityRef(props: SyEntityRefProps) {
  const { typeLabel, id, variant = 'chip', glyph, thumbnail, onOpen, onPeek, className } = props;

  const state: SyEntityRefState = props.state ?? 'resolved';
  const { name } = props;
  const isDeleted = state === 'deleted';
  const interactive = Boolean(onOpen) && OPENABLE.has(state);

  /**
   * Accessible name = type + name + ID, and never a bare ID link. The state
   * is announced too, whenever it is anything other than resolved.
   */
  const accessibleName = [
    typeLabel,
    name,
    id,
    state === 'resolved' ? null : stateSuffix(props, state),
  ]
    .filter(Boolean)
    .join(', ');

  const body =
    state === 'loading' ? (
      // The reference itself is loading. A skeleton, never a blank.
      <span aria-hidden="true" className="flex items-center gap-200">
        <span className="h-200 w-600 rounded-sm bg-surface-subtle" />
        <span className="h-200 w-400 rounded-sm bg-surface-subtle" />
      </span>
    ) : (
      <>
        {variant === 'thumbnail' && thumbnail ? (
          <span aria-hidden="true" className="inline-flex shrink-0">
            {thumbnail}
          </span>
        ) : null}

        {glyph ? (
          <span aria-hidden="true" className="inline-flex shrink-0">
            {glyph}
          </span>
        ) : null}

        <span aria-hidden="true" className="text-mono text-text-tertiary uppercase">
          {typeLabel}
        </span>

        <span
          aria-hidden="true"
          className={cn(
            'text-body text-text-primary',
            // The canonical specimen: "unresolvable refs render struck
            // through with a 'deleted' note — never a blank".
            isDeleted && 'line-through',
            interactive && variant === 'inline' && 'underline',
          )}
        >
          {name}
        </span>

        <span aria-hidden="true" className="text-mono text-text-tertiary">
          {id}
        </span>

        {state === 'resolved' ? null : (
          // The note the specimen calls for, visible rather than only spoken.
          <span aria-hidden="true" className="text-caption text-text-tertiary">
            {stateSuffix(props, state)}
          </span>
        )}
      </>
    );

  const classes = cn(VARIANT_BOX[variant], !interactive && 'text-start', className);

  if (!interactive) {
    return (
      <span role="group" aria-label={accessibleName} className={classes}>
        {body}
      </span>
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    // ⌘Enter (⌃Enter on a PC keyboard) peeks instead of navigating, so the
    // current context survives.
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && onPeek) {
      event.preventDefault();
      onPeek();
    }
  }

  return (
    <button
      type="button"
      aria-label={accessibleName}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      className={cn(classes, 'hover:bg-surface-subtle')}
    >
      {body}
    </button>
  );
}

/** How a non-resolved state reads, both on screen and to a screen reader. */
function stateSuffix(props: SyEntityRefProps, state: SyEntityRefState): string | null {
  switch (state) {
    case 'resolved':
      return null;
    case 'loading':
      return 'loading';
    case 'deleted':
      return 'deleted';
    case 'no-permission':
      return 'no permission';
    case 'deprecated':
      return props.state === 'deprecated' && props.replacement
        ? `deprecated, replaced by ${props.replacement}`
        : 'deprecated, no replacement declared';
  }
}
