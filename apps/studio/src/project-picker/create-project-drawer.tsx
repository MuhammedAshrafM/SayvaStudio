'use client';

import { useRef, useState, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import type { CreateProjectResult } from '@sayva/application';
import { SyButton, SyDrawer, SyField, SyStateBlock } from '@sayva/design-system';
import { createProjectAction } from './create-project-action';

/**
 * The Create drawer — Screens §04 §3, as closed by the Create decision
 * closure (B1–B15).
 *
 * Composed from four frozen primitives and nothing else: `SyDrawer`,
 * `SyField`, `SyButton` and `SyStateBlock`. Every string below is canonical
 * copy; every behaviour is a ruling, cited where it is applied.
 *
 * The drawer is **never dirty** (B5). A dirty `SyDrawer` must prompt before
 * discarding, the prompt would be a `SyDialog`, and this surface does not use
 * one — so `Esc` and `Cancel` close it directly, and the typed name goes with
 * it. `SyField`'s own `Esc` still reverts an in-progress edit first; that is
 * the field's frozen contract, not a guard added here.
 *
 * `N` is not bound (B8): it arrives in a later slice with its hint and its
 * behaviour in editable fields.
 */

const TITLE = 'New Project'; // B3
const FIELD_LABEL = 'Project name'; // B7
const INVALID = 'Give the project a name.'; // B7
const CONFIRM = 'Create Project'; // B7
const DISMISS = 'Cancel'; // B4
const FAILED = "Can't create the project"; // B2
const RETRY = 'Retry'; // the error state's action, as in §6

type Failure = { traceId: string; location: string };

export function CreateProjectDrawer({
  open,
  onClose,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  /** The control that opened the drawer — where A07 returns focus (B14). */
  triggerRef: RefObject<HTMLElement | null>;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [pending, setPending] = useState(false);

  /** Guards a second submission while one is in flight — ⌘Enter and Retry included. */
  const inFlight = useRef(false);
  /**
   * Which opening of the drawer a submission belongs to. Closing starts a
   * new one, so a result that arrives after the author has closed the drawer
   * cannot reach into a later, fresh drawer.
   */
  const opening = useRef(0);

  /** B5: close directly, and leave nothing behind for the next opening. */
  function close() {
    opening.current += 1;
    setName('');
    setInvalid(false);
    setFailure(null);
    onClose();
  }

  async function submit() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    const mine = opening.current;

    let result: CreateProjectResult;
    try {
      result = await createProjectAction(name);
    } finally {
      inFlight.current = false;
      setPending(false);
    }

    if (result.status === 'created') {
      // B1, the temporary Create/Open boundary: close, then re-scan. The new
      // Project takes its place by the list's own updatedAt order. Nothing
      // opens it — Open arrives with its own slice.
      if (mine === opening.current) close();
      router.refresh();
      return;
    }

    // The author closed the drawer while this was in flight: nothing to show.
    if (mine !== opening.current) return;

    // B13: the result replaces whatever the last one showed, and only then.
    if (result.status === 'invalid-name') {
      setFailure(null);
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setFailure({ traceId: result.traceId, location: result.location });
  }

  return (
    <SyDrawer
      open={open}
      onClose={close}
      title={TITLE}
      variant="right"
      triggerRef={triggerRef}
      onSubmit={() => void submit()}
      footer={
        <>
          <SyButton variant="secondary" onClick={close}>
            {DISMISS}
          </SyButton>
          <SyButton loading={pending} onClick={() => void submit()}>
            {CONFIRM}
          </SyButton>
        </>
      }
    >
      {/* B13: nothing is validated while typing — `invalid` changes only when
          a submission's result arrives. */}
      <SyField
        label={FIELD_LABEL}
        value={name}
        onValueChange={setName}
        invalid={invalid ? INVALID : undefined}
      />

      {failure ? (
        // B2: below the name field, `panel` size, and never on the field.
        // Keyed by trace ID because each failed write is its own occurrence:
        // a new one mounts a new block, which hands Retry focus again.
        // `userInitiated` always holds — only a submission produces this.
        <SyStateBlock
          key={failure.traceId}
          state="error"
          size="panel"
          headingLevel={3}
          heading={FAILED}
          description={failure.location}
          traceId={failure.traceId}
          userInitiated
          action={{ label: RETRY, onAction: () => void submit() }}
        />
      ) : null}
    </SyDrawer>
  );
}
