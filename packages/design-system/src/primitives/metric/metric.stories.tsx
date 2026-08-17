import type { Meta, StoryObj } from '@storybook/react-vite';
import { SyMetric } from './metric.js';

/** Primitive contract stories. Not a health card, not a screen. */
const meta = {
  title: 'Primitives/SyMetric',
  component: SyMetric,
  args: {
    label: 'Dataset coverage',
    figure: '78%',
    denominator: 'of 62 categories',
  },
} satisfies Meta<typeof SyMetric>;

export default meta;

type Story = StoryObj<typeof meta>;

// --- sizes ----------------------------------------------------------------

export const SizeLarge: Story = { args: { size: 'lg' } };
export const SizeMedium: Story = { args: { size: 'md' } };
export const SizeSmall: Story = { args: { size: 'sm' } };

// --- states ---------------------------------------------------------------

export const Ok: Story = { args: { state: 'ok' } };
export const Warning: Story = { args: { state: 'warning', figure: '54%' } };
export const ErrorState: Story = { args: { state: 'error', figure: '21%' } };

/** No figure exists yet — never a zero, which would read as a failure. */
export const NoData: Story = {
  args: { state: 'no-data', figure: 'No data', denominator: 'no evaluation run yet' },
};

/** The title and the denominator stay visible while the figure loads. */
export const Loading: Story = { args: { state: 'loading' } };

/** Computed by an older run, and labelled as such rather than shown fresh. */
export const Stale: Story = {
  args: { state: 'stale', trend: 'as of 6 days ago' },
};

// --- anatomy --------------------------------------------------------------

/** Trend carries sign and unit as text, never a bare arrow. */
export const WithDelta: Story = {
  args: { size: 'md', trend: '+1.6 pts since last release' },
};

export const WithTarget: Story = {
  args: { trend: '+1.6 pts', target: 'target 85%' },
};

/**
 * The budget bar. Decorative and aria-hidden — the figure beside it is what
 * a reader acts on, which is what AC16 requires.
 */
export const BudgetBar: Story = {
  args: {
    label: 'Pack size budget',
    figure: '184 MB',
    denominator: 'of a 250 MB budget',
    bar: { fraction: 0.74 },
  },
};

export const BudgetBarBelowTarget: Story = {
  args: { ...BudgetBar.args, state: 'warning', bar: { fraction: 0.92, level: 'warning' } },
};

export const BudgetBarBelowFloor: Story = {
  args: { ...BudgetBar.args, state: 'error', bar: { fraction: 1, level: 'danger' } },
};

/** Every metric is a door (P10): this one opens the list behind it. */
export const Openable: Story = {
  args: { onOpen: () => {} },
};
