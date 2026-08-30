import type { Meta, StoryObj } from '@storybook/react-vite';
import { SyField } from './field.js';

/** Primitive contract stories. Single fields, not an editor form. */
const meta = {
  title: 'Primitives/SyField',
  component: SyField,
  args: { label: 'Gloss', value: 'AS-SALAAMU-ALAYKUM' },
} satisfies Meta<typeof SyField>;

export default meta;

/**
 * Typed against the component rather than against `typeof meta`.
 *
 * Both forms reject a prop the component does not have — which is the point,
 * and what this file previously escaped by not being type-checked at all.
 * The difference is that `StoryObj<typeof meta>` also requires every story's
 * args to satisfy `SyFieldProps` on their own, which a discriminated union
 * plus meta-level defaults cannot do: `{ variant: 'mono' }` would have to
 * restate `value` even though `meta.args` already supplies it.
 */
type Story = StoryObj<typeof SyField>;

const CATEGORIES = [
  { value: 'greetings', label: 'Greetings' },
  { value: 'family', label: 'Family' },
  { value: 'numbers', label: 'Numbers' },
];

// --- variants -------------------------------------------------------------

export const Text: Story = { args: { variant: 'text', label: 'Display name', value: 'Peace' } };

/** Mono carries IDs, glosses, versions and timecodes (§10.3). */
export const Mono: Story = { args: { variant: 'mono', helper: 'Uppercase, hyphenated' } };

export const Number: Story = {
  args: { variant: 'number', label: 'Quality threshold', value: '48' },
};

export const Textarea: Story = {
  args: { variant: 'textarea', label: 'Description', value: 'A greeting used on meeting.' },
};

export const Select: Story = {
  args: { variant: 'select', label: 'Category', value: 'greetings', options: CATEGORIES },
};

export const Combobox: Story = {
  args: { variant: 'combobox', label: 'Category', value: 'greetings', options: CATEGORIES },
};

export const MultiFacet: Story = {
  args: {
    variant: 'multi-facet',
    label: 'Categories',
    values: ['greetings'],
    options: CATEGORIES,
    helper: 'Multi-select facet',
  },
};

export const DateField: Story = {
  args: { variant: 'date', label: 'Captured on', value: '2026-08-11' },
};

// --- states ---------------------------------------------------------------

export const Empty: Story = { args: { label: 'Display name', value: '' } };

export const Filled: Story = { args: { label: 'Display name', value: 'Peace be upon you' } };

/**
 * Focus is :focus-visible, which base.css owns — never removed (§16).
 *
 * There is no `focus` prop to set: the state belongs to the platform. So the
 * story focuses the control itself. It previously passed `autoFocus`, which
 * `SyField` does not accept — React never received it, nothing was focused,
 * and the story demonstrated an ordinary filled field under the name Focus.
 */
export const Focus: Story = {
  args: { label: 'Display name', value: 'Peace' },
  /*
   * The control is focused, so the story is at least in the state it names.
   *
   * The ring is a separate matter and deliberately not faked here.
   * `:focus-visible` is a keyboard-modality heuristic that only trusted input
   * satisfies: neither `.focus()` nor `userEvent.tab()` paints it, which was
   * measured in the browser rather than assumed. Tab to the field to see the
   * ring; base.css owns it and §16 forbids removing it.
   */
  play: async ({ canvasElement }) => {
    canvasElement.querySelector('input')?.focus();
  },
};

/** Border + icon + text, never colour alone. */
export const Invalid: Story = {
  args: {
    variant: 'mono',
    label: 'Handshape',
    value: 'B-flat',
    invalid: 'Not in the ArSL notation set',
  },
};

export const Warning: Story = {
  args: { label: 'Gloss', warning: 'Similar to an existing gloss' },
};

/** "Reason shown, never silently disabled." */
export const ReadOnly: Story = {
  args: {
    label: 'Signer notes',
    value: 'Recorded in studio, session 4',
    readOnly: true,
    readOnlyReason: 'Read-only — locked in review',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Gloss',
    disabled: true,
    disabledReason: 'Editing is locked while the sign is in review',
  },
};

/** Options are still arriving. */
export const Loading: Story = {
  args: { variant: 'select', label: 'Category', value: '', options: [], loading: true },
};

/**
 * The AI register. The accept and reject affordances belong to SySuggestion,
 * which wraps this field and is out of Phase 1 scope.
 */
export const Suggested: Story = {
  args: {
    label: 'Description',
    value: 'A greeting used on meeting.',
    suggested: true,
    helper: 'Suggested by translate-arsl 1.2.0',
  },
};

// --- anatomy --------------------------------------------------------------

export const Required: Story = {
  args: { variant: 'mono', required: true, helper: 'Uppercase, hyphenated' },
};

/** Every variant together, for a reviewer scanning the set. */
export const AllVariants: Story = {
  render: () => (
    <div className="flex w-1200 flex-col gap-300">
      <SyField variant="text" label="Display name" value="Peace be upon you" />
      <SyField variant="mono" label="Gloss" value="AS-SALAAMU-ALAYKUM" required />
      <SyField variant="number" label="Quality" value="48" />
      <SyField variant="date" label="Captured on" value="2026-08-11" />
      <SyField variant="textarea" label="Description" value="A greeting." />
      <SyField variant="select" label="Category" value="greetings" options={CATEGORIES} />
      <SyField variant="combobox" label="Category" value="greetings" options={CATEGORIES} />
      <SyField
        variant="multi-facet"
        label="Categories"
        values={['greetings']}
        options={CATEGORIES}
      />
    </div>
  ),
};
