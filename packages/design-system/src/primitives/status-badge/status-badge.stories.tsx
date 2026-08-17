import type { Meta, StoryObj } from '@storybook/react-vite';
import { SyStatusBadge } from './status-badge.js';

/**
 * Primitive contract stories. The labels below are illustrative text a
 * caller would pass — the component knows nothing about them. Mapping a
 * lifecycle state to a tone and a glyph belongs to apps/studio (D3).
 */
const meta = {
  title: 'Primitives/SyStatusBadge',
  component: SyStatusBadge,
  args: { label: 'Approved', tone: 'success' },
} satisfies Meta<typeof SyStatusBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

// --- tones: the five status triplets --------------------------------------

export const Neutral: Story = { args: { tone: 'neutral', label: 'Draft' } };
export const Success: Story = { args: { tone: 'success', label: 'Approved' } };
export const Warning: Story = { args: { tone: 'warning', label: 'Changes requested' } };
export const Danger: Story = { args: { tone: 'danger', label: 'Blocked' } };
export const Info: Story = { args: { tone: 'info', label: 'In review' } };

// --- variants -------------------------------------------------------------

/** Sits in a grid row. */
export const Inline: Story = { args: { variant: 'inline' } };

/** Sits in an entity header. */
export const Detail: Story = { args: { variant: 'detail' } };

/** The modifier suffix is read as part of the name. */
export const WithModifier: Story = {
  args: { tone: 'info', label: 'In review', modifier: 'stale' },
};

/** A decorative glyph. Caller-supplied — the icon set is open decision D6. */
export const WithGlyph: Story = {
  args: {
    tone: 'success',
    label: 'Published',
    glyph: (
      <svg aria-hidden="true" viewBox="0 0 8 8" className="size-100" fill="currentColor">
        <circle cx="4" cy="4" r="4" />
      </svg>
    ),
  },
};

/** Every tone at once, for a reviewer scanning the triplets. */
export const AllTones: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-200">
      <SyStatusBadge tone="neutral" label="Draft" />
      <SyStatusBadge tone="info" label="In review" />
      <SyStatusBadge tone="warning" label="Changes requested" />
      <SyStatusBadge tone="success" label="Approved" />
      <SyStatusBadge tone="danger" label="Blocked" />
    </div>
  ),
};
