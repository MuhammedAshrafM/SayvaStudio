import { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SyButton } from '../button/index.js';
import { SyDialog } from './dialog.js';

/**
 * Primitive contract stories.
 *
 * The destructive story reproduces the design's drawn specimen: an impact
 * preview in text, then three actions — Delete sign / Deprecate instead /
 * Cancel. The copy is the caller's, which is the point of "the confirm
 * button names the action and its count".
 */
const meta = {
  title: 'Primitives/SyDialog',
  component: SyDialog,
  args: { title: 'Publish 12 signs?' },
} satisfies Meta<typeof SyDialog>;

export default meta;

type Story = StoryObj<typeof SyDialog>;

const IMPACT = (
  <>
    <p>Soft delete, recoverable for 30 days.</p>
    <ul className="mt-200 flex list-inside list-disc flex-col gap-050">
      <li>2 published lessons lose a reference</li>
      <li>3 variants are orphaned</li>
      <li>1 media asset drops to 0 usages</li>
      <li>The released pack is unaffected</li>
    </ul>
  </>
);

function Harness({
  variant = 'default',
  loading = false,
  error,
  alternative = false,
}: {
  variant?: 'default' | 'destructive';
  loading?: boolean;
  error?: string;
  alternative?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div>
      <SyButton
        ref={triggerRef}
        variant={variant === 'destructive' ? 'danger' : 'primary'}
        onClick={() => setOpen(true)}
      >
        {variant === 'destructive' ? 'Delete sign' : 'Publish'}
      </SyButton>

      <SyDialog
        open={open}
        onCancel={() => setOpen(false)}
        title={variant === 'destructive' ? 'Delete SIGN-04812?' : 'Publish 12 signs?'}
        variant={variant}
        triggerRef={triggerRef}
        loading={loading}
        error={error}
        confirm={{
          label: variant === 'destructive' ? 'Delete sign' : 'Publish 12 signs',
          onSelect: () => setOpen(false),
        }}
        alternative={
          alternative ? { label: 'Deprecate instead', onSelect: () => setOpen(false) } : undefined
        }
      >
        {variant === 'destructive' ? IMPACT : <p>The 12 selected signs become publicly visible.</p>}
      </SyDialog>
    </div>
  );
}

/** Closed is not a rendered surface. */
export const Closed: Story = {
  args: {
    open: false,
    onCancel: () => {},
    confirm: { label: 'Publish 12 signs', onSelect: () => {} },
    children: null,
  },
};

export const Default: Story = {
  args: {
    open: true,
    onCancel: () => {},
    title: 'Publish 12 signs?',
    confirm: { label: 'Publish 12 signs', onSelect: () => {} },
    children: <p>The 12 selected signs become publicly visible.</p>,
  },
};

/** alertdialog, and the impact preview is text rather than a warning icon. */
export const Destructive: Story = {
  args: {
    open: true,
    onCancel: () => {},
    title: 'Delete SIGN-04812?',
    variant: 'destructive',
    confirm: { label: 'Delete sign', onSelect: () => {} },
    alternative: { label: 'Deprecate instead', onSelect: () => {} },
    children: IMPACT,
  },
};

/** The drawn specimen: impact preview, then three actions. */
export const ImpactPreview: Story = {
  args: {
    open: false,
    onCancel: () => {},
    confirm: { label: 'x', onSelect: () => {} },
    children: null,
  },
  render: () => <Harness variant="destructive" alternative />,
};

/** "Loading state in place" — the label persists and focus is kept. */
export const Loading: Story = {
  args: {
    open: true,
    onCancel: () => {},
    title: 'Publish 12 signs?',
    loading: true,
    confirm: { label: 'Publish 12 signs', onSelect: () => {} },
    children: <p>The 12 selected signs become publicly visible.</p>,
  },
};

/** The decision failed and stays on screen so it can be retried. */
export const ErrorInPlace: Story = {
  args: {
    open: true,
    onCancel: () => {},
    title: 'Publish 12 signs?',
    error: 'Two signs are missing a reference clip',
    confirm: { label: 'Publish 12 signs', onSelect: () => {} },
    children: <p>The 12 selected signs become publicly visible.</p>,
  },
};

/** Driven from a trigger, so focus restoration is visible. */
export const FromTrigger: Story = {
  args: {
    open: false,
    onCancel: () => {},
    confirm: { label: 'x', onSelect: () => {} },
    children: null,
  },
  render: () => <Harness />,
};
