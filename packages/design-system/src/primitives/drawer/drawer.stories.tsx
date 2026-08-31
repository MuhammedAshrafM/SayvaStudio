import { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SyButton } from '../button/index.js';
import { SyField } from '../field/index.js';
import { SyDrawer } from './drawer.js';

/**
 * Primitive contract stories.
 *
 * SyDrawer is controlled, so every story drives it from a trigger — which is
 * also what makes focus restoration visible: the drawer returns focus to the
 * button that opened it.
 */
const meta = {
  title: 'Primitives/SyDrawer',
  component: SyDrawer,
  args: { title: 'Bulk edit' },
} satisfies Meta<typeof SyDrawer>;

export default meta;

type Story = StoryObj<typeof SyDrawer>;

/** The bulk edit drawer the design draws: checkboxed fields, then Apply to n. */
function Harness({
  variant = 'right',
  dirty = false,
  withFooter = true,
}: {
  variant?: 'right' | 'bottom-sheet';
  dirty?: boolean;
  withFooter?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [discardAsked, setDiscardAsked] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const common = {
    open,
    onClose: () => setOpen(false),
    title: 'Bulk edit',
    variant,
    triggerRef,
    onSubmit: () => setOpen(false),
    footer: withFooter ? (
      <>
        <SyButton variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </SyButton>
        <SyButton onClick={() => setOpen(false)}>Apply to 12</SyButton>
      </>
    ) : undefined,
    children: (
      <div className="flex flex-col gap-300">
        <SyField label="Category" value="greetings" />
        <SyField label="Reviewer" value="nadia" helper="Mixed (2 values)" />
      </div>
    ),
  };

  return (
    <div>
      <SyButton ref={triggerRef} onClick={() => setOpen(true)}>
        Bulk edit
      </SyButton>

      {discardAsked ? (
        <p role="status" className="text-caption mt-200 text-text-secondary">
          Discard was requested — the caller decides what to prompt with.
        </p>
      ) : null}

      {dirty ? (
        <SyDrawer {...common} dirty onRequestDiscard={() => setDiscardAsked(true)} />
      ) : (
        <SyDrawer {...common} />
      )}
    </div>
  );
}

/** Closed is a state: the drawer renders nothing at all. */
export const Closed: Story = {
  args: { open: false, onClose: () => {}, children: null },
};

export const RightDrawer: Story = {
  args: { open: false, onClose: () => {}, children: null },
  render: () => <Harness />,
};

/** "bottom sheet at narrow widths" — which width is the shell's call. */
export const BottomSheet: Story = {
  args: { open: false, onClose: () => {}, children: null },
  render: () => <Harness variant="bottom-sheet" />,
};

/** "dirty (blocks close)" — Esc asks instead of closing. */
export const Dirty: Story = {
  args: { open: false, onClose: () => {}, children: null },
  render: () => <Harness dirty />,
};

export const WithoutFooter: Story = {
  args: { open: false, onClose: () => {}, children: null },
  render: () => <Harness withFooter={false} />,
};

/** Open on arrival, for a reviewer who wants the surface without clicking. */
export const Open: Story = {
  args: {
    open: true,
    onClose: () => {},
    title: 'Bulk edit',
    children: (
      <div className="flex flex-col gap-300">
        <SyField label="Category" value="greetings" />
      </div>
    ),
    footer: <SyButton>Apply to 12</SyButton>,
  },
};
