'use client';

import { useEffect, useRef, useState, useTransition, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import type { DuplicateProjectResult } from '@sayva/application';
import { SyButton, SyDrawer, SyField, SyStateBlock } from '@sayva/design-system';
import { duplicateProjectAction } from './duplicate-project-action';

/**
 * The Duplicate drawer — Screens §04 §7, as closed by the Duplicate closure
 * (D1–D10).
 *
 * The same surface as Create — `SyDrawer`, `SyField`, `SyButton` and
 * `SyStateBlock`, and nothing else — with its own copy and its own outcome.
 * The field starts empty and the drawer never names the source (D2): names
 * carry no uniqueness, so a prefilled or source-derived name would quietly
 * make a second Project of the same name. Like Create's, it is never dirty:
 * `Esc` and `Cancel` close it directly.
 *
 * Each opening is its own session, mounted fresh by the frame (DP-6), so a
 * new `SyDrawer` registers its own trigger and takes focus into its panel.
 * A session ends when it is closed, replaced by another drawer, or left by
 * navigating away. A result that arrives after that changes nothing here,
 * announces nothing and moves no focus; a copy that was written, or a source
 * that has gone, still re-scans the list so it is shown as it is.
 *
 * The outcomes, in the closure's terms:
 * - D3, a refused name: "Give the project a name." on the field, until the
 *   next result replaces it — the Domain decides, on submission only (B13).
 * - D4, busy: `Duplicate Project` shows `SyButton`'s loading state, so it
 *   keeps its label and focus and ignores activation; `Cancel` stays.
 * - D5, duplicated: close — A07 returns focus to this row's Duplicate — then
 *   re-scan, so the copy takes its place by `updatedAt`. Nothing opens and
 *   nothing is announced.
 * - D6, the source is not here: stay open and busy while the list re-scans,
 *   and close only once the re-scan has settled — listed, first-run or the
 *   list's own error — then announce "Can't find that project" in the
 *   frame's region. By then the row is gone, so A07 has nothing to return
 *   focus to; if the re-scan still lists it, focus returns there as on any
 *   close.
 * - D7 and D8, the source can't be read or the copy can't be written: the
 *   error panel, below the field, with the location and this occurrence's
 *   trace ID. The list is not re-scanned.
 * - D9, Retry: the whole command again, with the name now in the field.
 */

const TITLE = 'Duplicate'; // D2
const FIELD_LABEL = 'Project name'; // D2
const INVALID = 'Give the project a name.'; // D3
const CONFIRM = 'Duplicate Project'; // D2
const DISMISS = 'Cancel'; // D2
const FAILED = "Can't duplicate the project"; // D7, D8
const RETRY = 'Retry'; // D9

type Failure = { traceId: string; location: string };

export function DuplicateProjectDrawer({
  projectId,
  onClose,
  onNotHere,
  triggerRef,
}: {
  /** The source: the Project whose row's Duplicate opened this drawer. */
  projectId: string;
  onClose: () => void;
  /** Announces "Can't find that project" in the frame's live region (D6). */
  onNotHere: () => void;
  /** The control that opened the drawer — where A07 returns focus. */
  triggerRef: RefObject<HTMLElement | null>;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  /** `Duplicate Project` is busy: from a submission until its outcome has been shown. */
  const [pending, setPending] = useState(false);
  const [rescanning, startRescan] = useTransition();

  /** This session has ended — closed, replaced or navigated away from. */
  const ended = useRef(false);
  /** Guards a second submission — ⌘Enter and Retry included — before `pending` has rendered. */
  const inFlight = useRef(false);
  /** The source was not here, and the drawer is waiting for the re-scan to settle (D6). */
  const awaitingRescan = useRef(false);

  // Unmounting ends the session: the frame replaced it, or the Picker is gone.
  useEffect(() => {
    ended.current = false;
    return () => {
      ended.current = true;
    };
  }, []);

  // D6, once the re-scan has settled: close, then announce.
  useEffect(() => {
    if (rescanning || !awaitingRescan.current) return;
    awaitingRescan.current = false;
    if (ended.current) return;
    ended.current = true;
    onClose();
    onNotHere();
  }, [rescanning, onClose, onNotHere]);

  function close() {
    ended.current = true;
    onClose();
  }

  async function submit() {
    if (inFlight.current || pending || ended.current) return;
    inFlight.current = true;
    setPending(true);

    let result: DuplicateProjectResult;
    try {
      result = await duplicateProjectAction(projectId, name);
    } catch (error) {
      inFlight.current = false;
      if (!ended.current) setPending(false);
      throw error;
    }

    if (ended.current) {
      // The session ended while this was in flight. The list still shows
      // what happened on disk; nothing else does.
      if (result.status === 'duplicated' || result.status === 'not-here') router.refresh();
      return;
    }

    if (result.status === 'duplicated') {
      // D5: close first, so A07 hands focus back to the row's Duplicate.
      close();
      router.refresh();
      return;
    }

    if (result.status === 'not-here') {
      // D6: still busy, the drawer still open. The effect above closes and
      // announces once the re-scan has settled.
      awaitingRescan.current = true;
      startRescan(() => router.refresh());
      return;
    }

    inFlight.current = false;
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
      open
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
      <SyField
        label={FIELD_LABEL}
        value={name}
        onValueChange={setName}
        invalid={invalid ? INVALID : undefined}
      />

      {failure ? (
        // D7, D8: below the name field, `panel` size, and never on the field.
        // Keyed by trace ID because each failure is its own occurrence: a new
        // one mounts a new block, which hands Retry focus again.
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
