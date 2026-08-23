import type { Meta, StoryObj } from '@storybook/react-vite';
import { SyField } from './field.js';

/** Primitive contract stories. Single fields, not an editor form. */
const meta = {
  title: 'Primitives/SyField',
  component: SyField,
  args: { label: 'Gloss', value: 'AS-SALAAMU-ALAYKUM' },
} satisfies Meta<typeof SyField>;

export default meta;

type Story = StoryObj<typeof meta>;

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

/** Focus is :focus-visible, which base.css owns — never removed (§16). */
export const Focus: Story = { args: { label: 'Display name', value: 'Peace', autoFocus: true } };

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
