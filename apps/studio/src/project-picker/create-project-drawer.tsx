'use client';

import { startTransition, useEffect, useRef, useState, useTransition, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import type { CreateProjectResult } from '@sayva/application';
import { SyButton, SyDrawer, SyField, SyStateBlock } from '@sayva/design-system';
import { markOpenArrival } from '@/workspace-entry/open-arrival';
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
 *
 * Creation opens the new Project (§3, the Create-then-Open closure, CO-1 to
 * CO-6; ADR-005 OP-11). The command's result already names the Project, so
 * there is no second read here: the drawer navigates to its workspace URL,
 * whose route resolves it through the Open Query like any other arrival, and
 * the Workspace Entry's own read decides what the author sees. In order:
 * 1. `Create Project` stays busy and the drawer stays open (CO-3);
 * 2. the list re-scans, and the navigation waits for it to land (CO-6) —
 *    Next discards a re-scan still pending when a navigation starts, and
 *    Back would then show the list without the new Project;
 * 3. the arrival is marked as Open's, by the existing mark (CO-2);
 * 4. the drawer navigates to `/workspace/{projectId}` (CO-1).
 * Closing the drawer before step 3 opens nothing; the list still re-scans
 * (CO-4). A Project gone before its route resolves returns to `/`, as any
 * workspace URL does (CO-5).
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
  /** `Create Project` is busy: from a submission until its result, or until the hand-off ends. */
  const [pending, setPending] = useState(false);
  const [rescanning, startRescan] = useTransition();

  /**
   * Which opening of the drawer a submission belongs to. Closing starts a
   * new one, so a result that arrives after the author has closed the drawer
   * cannot reach into a later, fresh drawer — not its state, and not by
   * opening anything.
   */
  const opening = useRef(0);
  /**
   * The opening whose submission is in flight. Guards a second one — ⌘Enter
   * and Retry included — before the busy state has rendered; from the
   * hand-off on, `pending` holds the guard instead.
   */
  const inFlight = useRef<number | null>(null);
  /** A created Project waiting for the re-scan to land before it opens (CO-6). */
  const handOff = useRef<{ projectId: string; opening: number } | null>(null);

  // Step 3 and 4 of the hand-off, once the re-scan has landed.
  useEffect(() => {
    const created = handOff.current;
    if (rescanning || created === null) return;
    handOff.current = null;

    // CO-4: closed while the list re-scanned. The re-scan stands; nothing opens.
    if (created.opening !== opening.current) {
      if (inFlight.current === created.opening) inFlight.current = null;
      return;
    }

    markOpenArrival(created.projectId);
    startTransition(() => {
      inFlight.current = null;
      router.push(`/workspace/${encodeURIComponent(created.projectId)}`);
      // Lands with the navigation. When the Workspace Entry replaces the
      // Picker it is moot; when the navigation ends back here — a workspace
      // URL whose Project is gone returns to `/` (CO-5) — it frees the drawer.
      setPending(false);
    });
  }, [rescanning, router]);

  /** B5: close directly, and leave nothing behind for the next opening. */
  function close() {
    opening.current += 1;
    setName('');
    setInvalid(false);
    setFailure(null);
    // A later opening starts idle: a submission still in flight belongs to
    // this one, and is answered without it (CO-4).
    setPending(false);
    onClose();
  }

  async function submit() {
    const mine = opening.current;
    if (inFlight.current === mine || pending) return;
    inFlight.current = mine;
    setPending(true);

    let result: CreateProjectResult;
    try {
      result = await createProjectAction(name);
    } catch (error) {
      if (inFlight.current === mine) inFlight.current = null;
      if (mine === opening.current) setPending(false);
      throw error;
    }

    if (result.status === 'created') {
      if (mine !== opening.current) {
        // CO-4: the author closed this drawer while the write was in flight.
        // The Project exists, so the list re-scans to show it; nothing opens.
        if (inFlight.current === mine) inFlight.current = null;
        router.refresh();
        return;
      }
      // CO-3, CO-6: still busy, the drawer still open. The list re-scans
      // first; the effect above opens the Project once that has landed.
      handOff.current = { projectId: result.project.id, opening: mine };
      startRescan(() => router.refresh());
      return;
    }

    if (inFlight.current === mine) inFlight.current = null;
    // The author closed the drawer while this was in flight: nothing to show.
    if (mine !== opening.current) return;
    setPending(false);

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
