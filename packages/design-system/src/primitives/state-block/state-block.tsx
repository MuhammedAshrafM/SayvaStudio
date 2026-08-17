'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '../../lib/cn.js';
import { SyButton, type SyButtonTone } from '../button/index.js';
import {
  stateBlockHeadingVariants,
  stateBlockVariants,
  type SyStateBlockSize,
  type SyStateBlockState,
} from './state-block.variants.js';

export type { SyStateBlockSize, SyStateBlockState };

/** The one named next action. Rendered as a SyButton, which §Primitives reuses here. */
export type SyStateBlockAction = {
  label: string;
  onAction: () => void;
  /** Defaults to `secondary`: P2 allows one primary action per surface, and
   *  a block nested in a populated screen must not claim it. */
  tone?: SyButtonTone;
};

type Common = {
  size?: SyStateBlockSize;
  className?: string;
  /** Heading element to render. The contract requires a real heading; the
   *  level depends on where the block sits, so the caller owns it. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /**
   * Whether the user's own action produced this state.
   *
   * The contract is precise: the action "receives focus on appearance only
   * when the user's action caused the state". A state present on first
   * paint must not steal focus; one the user just caused should hand them
   * the next step.
   */
  userInitiated?: boolean;
};

type Message = {
  heading: string;
  description?: ReactNode;
  action?: SyStateBlockAction;
};

/**
 * `error` requires a trace ID and an action at the type level. AC14 fails
 * "an error without a trace ID and a retry", so neither can be forgotten.
 */
type ErrorMessage = Omit<Message, 'action'> & {
  state: 'error';
  traceId: string;
  action: SyStateBlockAction;
};

/**
 * `loading` is a skeleton, not a spinner, and carries no heading — so it
 * takes a label instead, which becomes the region's accessible name.
 */
type Loading = {
  state: 'loading';
  label: string;
};

type Messaged = Message & {
  state: Exclude<SyStateBlockState, 'error' | 'loading'>;
};

export type SyStateBlockProps = Common & (Messaged | ErrorMessage | Loading);

/**
 * Every non-populated state, anywhere.
 *
 * Announcement follows the contract: errors are assertive live regions,
 * empties polite. The contract names only those two, so every other state
 * takes the polite default — a state block appearing is worth announcing,
 * and nothing but an error is worth interrupting for.
 */
export function SyStateBlock(props: SyStateBlockProps) {
  const { size = 'pane', className, headingLevel = 2, userInitiated = false } = props;
  const { state } = props;

  const headingId = useId();
  const actionRef = useRef<HTMLButtonElement>(null);
  const isError = state === 'error';

  useEffect(() => {
    if (userInitiated) actionRef.current?.focus();
  }, [userInitiated]);

  const Heading = `h${headingLevel}` as const;

  const region = (children: ReactNode, labelledBy?: string, label?: string) => (
    <div
      role={isError ? 'alert' : 'status'}
      aria-labelledby={labelledBy}
      aria-label={label}
      className={cn(stateBlockVariants({ size, state }), className)}
    >
      {children}
    </div>
  );

  if (props.state === 'loading') {
    return region(
      // Skeleton, not spinner. Hidden from assistive technology — the
      // region's own label is what gets announced.
      <span aria-hidden="true" className="flex w-full flex-col gap-200">
        <span className="h-300 w-full rounded-sm bg-surface-subtle" />
        <span className="h-300 w-600 rounded-sm bg-surface-subtle" />
      </span>,
      undefined,
      props.label,
    );
  }

  const { heading, description, action } = props;

  return region(
    <>
      <Heading id={headingId} className={stateBlockHeadingVariants({ size, state })}>
        {heading}
      </Heading>

      {description ? <p className="text-body text-text-secondary">{description}</p> : null}

      {props.state === 'error' ? (
        // Rendered as text, so the failure is never colour alone and the
        // reference a reviewer needs is on screen (AC14).
        <p className="text-caption text-text-tertiary">
          {/* `text-mono` is the design's token for IDs, versions and
              timecodes. It carries the mono type spec but not a monospace
              family: §10.3 names IBM Plex Mono in prose and the design
              tokenises no font family at all. Open decision D13. */}
          Trace ID <span className="text-mono">{props.traceId}</span>
        </p>
      ) : null}

      {action ? (
        <SyButton
          ref={actionRef}
          variant={action.tone ?? 'secondary'}
          size={size === 'inline' ? 'sm' : 'md'}
          onClick={action.onAction}
        >
          {action.label}
        </SyButton>
      ) : null}
    </>,
    headingId,
  );
}
