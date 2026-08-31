'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '../../lib/cn.js';
import { useOverlay } from '../../overlay/index.js';
import { SyButton } from '../button/index.js';
import { MENU_STATES, type SyMenuItemTone, type SyMenuState } from './menu.variants.js';

export type { SyMenuItemTone, SyMenuState };
export { MENU_STATES };

/** A reason is shown, never a silently unavailable action. */
type Availability =
  { disabled: true; disabledReason: string } | { disabled?: false; disabledReason?: never };

export type SyMenuItem = {
  id: string;
  /** The command, as a verb. The caller's copy — this package owns no actions. */
  label: string;
  /** "shortcut shown per item" — e.g. "⌘⌫". Rendered as text beside the label. */
  shortcut?: string;
  tone?: SyMenuItemTone;
  onSelect: () => void;
} & Availability;

/**
 * One group of commands.
 *
 * The design contracts eight of these in a fixed order on every entity type,
 * but which eight and in what order is the entity action registry's business:
 * decision D3 keeps that vocabulary out of @sayva/design-system. The caller
 * supplies the groups already ordered, and the menu renders them as given —
 * which is what makes "destructive items last" the registry's guarantee
 * rather than a reordering this component performs behind the caller's back.
 */
export type SyMenuGroup = {
  id: string;
  /** The group's name. Shown, and used as the group's accessible name. */
  label?: string;
  items: SyMenuItem[];
};

export type SyMenuProps = {
  /** The trigger's accessible name, e.g. "Row actions". */
  triggerLabel: string;
  /** Decorative trigger glyph, supplied by the caller: which icon set is D6. */
  triggerIcon?: ReactNode;
  groups: SyMenuGroup[];
  /** Contents are still arriving. Shown in place, per "Loading state in place". */
  loading?: boolean;
  /**
   * A chosen action is in flight. The words are the caller's — the design
   * names the state but supplies no copy, and none is invented here.
   */
  submitting?: string;
  /** The action failed. Shown inside the menu rather than closing it. */
  error?: string;
  className?: string;
};

/** Every item across every group, in render order. */
const flatten = (groups: SyMenuGroup[]) => groups.flatMap((group) => group.items);

/**
 * Contextual actions.
 *
 * `role="menu"` per decision D15, which is stated outright in the design's
 * own accessibility cell. The keyboard model that follows — arrows rove,
 * Home/End jump, Enter and Space activate — is the WAI-ARIA menu pattern,
 * which is external convention rather than a design statement; the design
 * specifies only "Esc closes; focus returns to trigger", and both of those
 * come from the shared substrate.
 *
 * D14 ruled this surface non-modal, so Tab is not contained: it moves focus
 * onward and the menu closes behind it.
 */
export function SyMenu({
  triggerLabel,
  triggerIcon,
  groups,
  loading = false,
  submitting,
  error,
  className,
}: SyMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const menuId = useId();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const triggerWrapperRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef(new Map<string, HTMLElement>());

  const items = flatten(groups);
  const busy = loading || submitting !== undefined;

  // Esc closes topmost, focus returns to the trigger, depth is capped at two.
  const { releaseFocus } = useOverlay({
    open,
    onRequestClose: () => {
      setActiveId(null);
      setOpen(false);
    },
    // D14: SyMenu does not contain Tab.
    modal: false,
    surfaceRef,
    // "focus returns to trigger" — named, not inferred from what happened to
    // be focused when the menu opened.
    triggerRef,
  });

  /**
   * Focus entry: the first item, once the surface exists.
   *
   * Only the DOM call lives here — which item is active is set when the menu
   * opens, so this synchronises focus rather than starting another render
   * pass from inside one. `items` is read through a ref because a caller
   * that inlines its groups produces a new array every render: as a
   * dependency it would re-run on each arrow key and throw focus back to the
   * first item.
   */
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  });

  useEffect(() => {
    if (!open) return;
    const first = itemsRef.current[0];
    if (first) itemRefs.current.get(first.id)?.focus();
  }, [open]);

  /**
   * Dismissal by pointing away.
   *
   * External convention, not a design statement: the contract names only Esc.
   * A contextual menu with no pointer dismissal would still be a defect, so
   * it is implemented and labelled rather than left out or left unmarked.
   */
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (surfaceRef.current?.contains(target)) return;
      if (triggerWrapperRef.current?.contains(target)) return;
      setActiveId(null);
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function move(delta: number) {
    if (items.length === 0) return;
    const current = items.findIndex((item) => item.id === activeId);
    const next = Math.min(Math.max(current + delta, 0), items.length - 1);
    const target = items[next];
    if (!target) return;
    setActiveId(target.id);
    itemRefs.current.get(target.id)?.focus();
  }

  function jump(to: 'first' | 'last') {
    const target = to === 'first' ? items[0] : items[items.length - 1];
    if (!target) return;
    setActiveId(target.id);
    itemRefs.current.get(target.id)?.focus();
  }

  function openMenu() {
    setActiveId(items[0]?.id ?? null);
    setOpen(true);
  }

  function closeMenu() {
    setActiveId(null);
    setOpen(false);
  }

  function select(item: SyMenuItem) {
    if (item.disabled) return;
    item.onSelect();
    closeMenu();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        move(-1);
        break;
      case 'Home':
        event.preventDefault();
        jump('first');
        break;
      case 'End':
        event.preventDefault();
        jump('last');
        break;
      case 'Enter':
      case ' ': {
        const item = items.find((candidate) => candidate.id === activeId);
        if (!item) break;
        event.preventDefault();
        select(item);
        break;
      }
      default:
        break;
    }
  }

  /**
   * Tab is not contained (D14), so focus leaving the surface is a deliberate
   * move onward — and a menu left open behind the user is not the contract's
   * "closes". The substrate sees focus has moved on and leaves it there
   * rather than dragging it back to the trigger.
   */
  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (!(next instanceof Node)) return;
    if (surfaceRef.current?.contains(next)) return;
    if (triggerWrapperRef.current?.contains(next)) return;
    // The user tabbed onward rather than dismissing, so the substrate must
    // leave focus where they put it instead of restoring the trigger.
    releaseFocus();
    closeMenu();
  }

  return (
    <span ref={triggerWrapperRef} className={cn('relative inline-flex', className)}>
      <SyButton
        ref={triggerRef}
        variant="icon-only"
        label={triggerLabel}
        icon={triggerIcon}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? closeMenu() : openMenu())}
      />

      {open ? (
        <div
          ref={surfaceRef}
          id={menuId}
          role="menu"
          aria-label={triggerLabel}
          aria-busy={busy || undefined}
          /*
           * Programmatically focusable, not a tab stop. An interactive role
           * has to be able to receive focus, but the menu's own tab stop is
           * whichever item is roving — so -1 rather than 0.
           */
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          /*
           * elev.1 is the design's popover elevation, and the only variant
           * this component contracts. The width is content-driven: the design
           * gives no menu width, and `min-w-max` invents no number where
           * sizes are UNSPECIFIED BY DESIGN.
           */
          className="absolute top-full z-10 mt-100 min-w-max rounded-sm border border-border-default bg-surface-default p-100 shadow-elev-1"
        >
          {loading ? (
            <p className="text-caption px-200 py-100 text-text-tertiary">Loading actions…</p>
          ) : null}

          {groups.map((group, groupIndex) => (
            <div key={group.id}>
              {/* Structural separation, so the destructive group is set apart
                  by more than its colour (P5: colour is never the only
                  signal). border.default is the design's separation token. */}
              {groupIndex > 0 ? (
                <div role="separator" className="my-100 border-t border-border-default" />
              ) : null}

              <div role="group" aria-label={group.label}>
                {group.label ? (
                  <p className="text-caption px-200 py-050 text-text-tertiary">{group.label}</p>
                ) : null}

                {group.items.map((item) => (
                  <MenuItem
                    key={item.id}
                    item={item}
                    active={item.id === activeId}
                    onSelect={() => select(item)}
                    register={(node) => {
                      if (node) itemRefs.current.set(item.id, node);
                      else itemRefs.current.delete(item.id);
                    }}
                  />
                ))}
              </div>
            </div>
          ))}

          {submitting !== undefined ? (
            <p role="status" className="text-caption px-200 py-100 text-text-secondary">
              {submitting}
            </p>
          ) : null}

          {error ? (
            // In place, per the contract: the menu does not close on failure.
            <p role="alert" className="text-caption px-200 py-100 text-status-danger-fg">
              <span aria-hidden="true">⚠ </span>
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </span>
  );
}

function MenuItem({
  item,
  active,
  onSelect,
  register,
}: {
  item: SyMenuItem;
  active: boolean;
  onSelect: () => void;
  register: (node: HTMLElement | null) => void;
}) {
  const reasonId = useId();

  return (
    <div
      ref={register}
      role="menuitem"
      // Roving tabindex: one stop for the whole menu, arrows move within it.
      tabIndex={active ? 0 : -1}
      aria-disabled={item.disabled || undefined}
      aria-describedby={item.disabled ? reasonId : undefined}
      // mousedown, not click: it fires before blur, so the surface does not
      // close out from under the pointer — the same race SyField's listbox hit.
      onMouseDown={(event) => {
        event.preventDefault();
        onSelect();
      }}
      className={cn(
        'flex cursor-pointer items-center justify-between gap-400 rounded-xs px-200 py-100',
        'text-body',
        item.tone === 'destructive' ? 'text-status-danger-fg' : 'text-text-primary',
        active && 'bg-surface-selected',
        item.disabled && 'cursor-not-allowed text-text-tertiary',
      )}
    >
      <span className="flex flex-col">
        <span>{item.label}</span>
        {item.disabled ? (
          // "Unpermitted items shown disabled with the reason."
          <span id={reasonId} className="text-caption text-text-tertiary">
            {item.disabledReason}
          </span>
        ) : null}
      </span>

      {item.shortcut ? <span className="text-mono text-text-tertiary">{item.shortcut}</span> : null}
    </div>
  );
}
