import type { Meta, StoryObj } from '@storybook/react-vite';
import { SyEntityRef } from './entity-ref.js';

/**
 * Primitive contract stories. The type labels and IDs below are the ones the
 * canonical specimen draws; the component knows nothing about them (D3).
 */
const meta = {
  title: 'Primitives/SyEntityRef',
  component: SyEntityRef,
  args: { typeLabel: 'Sign', name: 'Peace be upon you', id: 'SIGN-04812' },
} satisfies Meta<typeof SyEntityRef>;

export default meta;

type Story = StoryObj<typeof meta>;

const noop = () => {};

// --- variants -------------------------------------------------------------

export const Chip: Story = { args: { variant: 'chip' } };

export const Row: Story = {
  args: { variant: 'row', typeLabel: 'Lesson', name: 'Greetings I', id: 'LES-221' },
};

export const InlineText: Story = {
  args: { variant: 'inline', typeLabel: 'Release', name: 'stable', id: '2026.08.1' },
};

/** Assets carry a thumbnail. Decorative — the name still carries the meaning. */
export const WithThumbnail: Story = {
  args: {
    variant: 'thumbnail',
    typeLabel: 'Asset',
    name: 'front-studio-01',
    id: 'AST-88214',
    thumbnail: <span className="block size-600 rounded-xs bg-surface-subtle" />,
  },
};

// --- states ---------------------------------------------------------------

export const Resolved: Story = { args: { state: 'resolved' } };

/** The reference itself is loading: a skeleton, never a blank. */
export const Loading: Story = {
  args: { state: 'loading', typeLabel: 'Sign', id: 'SIGN-04812', name: undefined },
};

/** Struck through with a "deleted" note, per the canonical specimen. */
export const Deleted: Story = { args: { state: 'deleted' } };

export const NoPermission: Story = { args: { state: 'no-permission' } };

/** Deprecated with its replacement declared. */
export const Deprecated: Story = {
  args: { state: 'deprecated', replacement: 'SIGN-04999' },
};

/** Deprecated with replacement explicitly none — the question is still answered. */
export const DeprecatedWithoutReplacement: Story = {
  args: { state: 'deprecated', replacement: null },
};

// --- interaction ----------------------------------------------------------

/** Enter opens; ⌘Enter opens in a side peek without losing context. */
export const Openable: Story = {
  args: { onOpen: noop, onPeek: noop },
};

export const OpenableInline: Story = {
  args: { variant: 'inline', onOpen: noop, onPeek: noop },
};

/** Every variant together, as the specimen draws them. */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-300">
      <SyEntityRef typeLabel="Sign" name="Peace be upon you" id="SIGN-04812" />
      <SyEntityRef typeLabel="Lesson" name="Greetings I" id="LES-221" />
      <SyEntityRef typeLabel="Asset" name="front-studio-01" id="AST-88214" />
      <SyEntityRef typeLabel="Model" name="recognition-arsl" id="2.4.0" />
      <SyEntityRef typeLabel="Release" name="stable" id="2026.08.1" />
    </div>
  ),
};
