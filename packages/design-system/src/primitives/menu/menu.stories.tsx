import type { Meta, StoryObj } from '@storybook/react-vite';
import { SyMenu, type SyMenuGroup } from './menu.js';

/**
 * Primitive contract stories.
 *
 * The eight-group arrangement below is story data, not component behaviour.
 * The design contracts "eight fixed groups in fixed order on every entity
 * type", but decision D3 keeps that vocabulary in apps/studio: SyMenu renders
 * the groups it is handed, in the order it is handed them. Showing the
 * canonical arrangement here demonstrates the contract without encoding it.
 */
const meta = {
  title: 'Primitives/SyMenu',
  component: SyMenu,
  args: { triggerLabel: 'Row actions' },
} satisfies Meta<typeof SyMenu>;

export default meta;

type Story = StoryObj<typeof SyMenu>;

/** A decorative glyph, drawn locally: which icon set the product uses is D6. */
function MoreGlyph() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      className="size-[var(--icon-dense)]"
      fill="currentColor"
    >
      <circle cx="3" cy="8" r="1.25" />
      <circle cx="8" cy="8" r="1.25" />
      <circle cx="13" cy="8" r="1.25" />
    </svg>
  );
}

const noop = () => {};

/** The canonical eight, in the canonical order — supplied by the caller. */
const ENTITY_ACTIONS: SyMenuGroup[] = [
  { id: 'open', label: 'Open', items: [{ id: 'open-sign', label: 'Open sign', onSelect: noop }] },
  {
    id: 'edit',
    label: 'Edit',
    items: [
      { id: 'rename', label: 'Rename…', shortcut: '⌘R', onSelect: noop },
      { id: 'gloss', label: 'Edit gloss', onSelect: noop },
    ],
  },
  {
    id: 'relate',
    label: 'Relate',
    items: [{ id: 'link', label: 'Link to lesson…', onSelect: noop }],
  },
  {
    id: 'lifecycle',
    label: 'Lifecycle',
    items: [{ id: 'submit', label: 'Submit for review', shortcut: '⌘⏎', onSelect: noop }],
  },
  {
    id: 'validate',
    label: 'Validate',
    items: [{ id: 'revalidate', label: 'Re-run validation', onSelect: noop }],
  },
  {
    id: 'duplicate',
    label: 'Duplicate',
    items: [{ id: 'dup', label: 'Duplicate sign', onSelect: noop }],
  },
  {
    id: 'copy-link',
    label: 'Copy link',
    items: [{ id: 'copy', label: 'Copy link', shortcut: '⌘L', onSelect: noop }],
  },
  {
    id: 'destructive',
    label: 'Destructive',
    items: [
      { id: 'delete', label: 'Delete sign', shortcut: '⌘⌫', tone: 'destructive', onSelect: noop },
    ],
  },
];

const SHORT: SyMenuGroup[] = [
  {
    id: 'edit',
    label: 'Edit',
    items: [
      { id: 'rename', label: 'Rename…', shortcut: '⌘R', onSelect: noop },
      { id: 'gloss', label: 'Edit gloss', onSelect: noop },
    ],
  },
  {
    id: 'destructive',
    label: 'Destructive',
    items: [
      { id: 'delete', label: 'Delete sign', shortcut: '⌘⌫', tone: 'destructive', onSelect: noop },
    ],
  },
];

/** Opens the menu, so the surface a reviewer needs to see is on screen. */
const openIt: Story['play'] = async ({ canvasElement }) => {
  canvasElement.querySelector('button')?.click();
};

export const Closed: Story = { args: { groups: SHORT } };

/** The eight fixed groups, in their fixed order — supplied by the caller. */
export const EightGroups: Story = { args: { groups: ENTITY_ACTIONS }, play: openIt };

export const Open: Story = { args: { groups: SHORT }, play: openIt };

export const WithGlyph: Story = {
  args: { groups: SHORT, triggerIcon: <MoreGlyph /> },
  play: openIt,
};

/** "Unpermitted items shown disabled with the reason." */
export const UnpermittedItem: Story = {
  args: {
    groups: [
      {
        id: 'lifecycle',
        label: 'Lifecycle',
        items: [
          { id: 'submit', label: 'Submit for review', onSelect: noop },
          {
            id: 'publish',
            label: 'Publish',
            disabled: true,
            disabledReason: 'Needs an approved review',
            onSelect: noop,
          },
        ],
      },
    ],
  },
  play: openIt,
};

/** Destructive last, labelled, and set apart by a separator rather than colour alone. */
export const Destructive: Story = { args: { groups: SHORT }, play: openIt };

/** "Loading state in place." */
export const Loading: Story = { args: { groups: [], loading: true }, play: openIt };

/** A chosen action in flight. The words are the caller's. */
export const Submitting: Story = {
  args: { groups: SHORT, submitting: 'Submitting for review…' },
  play: openIt,
};

/** The failure is shown inside the menu rather than closing it. */
export const ErrorInPlace: Story = {
  args: { groups: SHORT, error: 'Could not submit — the sign is locked in review' },
  play: openIt,
};
