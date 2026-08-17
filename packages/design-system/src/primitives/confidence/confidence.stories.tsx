import type { Meta, StoryObj } from '@storybook/react-vite';
import { SyConfidence } from './confidence.js';

/** Primitive contract stories. Number first, band label second (§9.4). */
const meta = {
  title: 'Primitives/SyConfidence',
  component: SyConfidence,
  args: { value: 0.86, state: 'high', threshold: 0.8 },
} satisfies Meta<typeof SyConfidence>;

export default meta;

type Story = StoryObj<typeof meta>;

// --- states ---------------------------------------------------------------

export const High: Story = { args: { value: 0.86, state: 'high' } };
export const Medium: Story = { args: { value: 0.71, state: 'medium' } };
export const Low: Story = { args: { value: 0.61, state: 'low' } };

/** No figure at all — never rendered as a zero. */
export const Unavailable: Story = { args: { value: null, state: 'unavailable' } };

/** Computed by an older model version, and said so. */
export const Stale: Story = {
  args: { value: 0.74, state: 'stale', model: 'recognition-arsl 2.3.0' },
};

// --- variants -------------------------------------------------------------

export const Inline: Story = { args: { variant: 'inline' } };
export const Column: Story = { args: { variant: 'column' } };

/** The full reading: figure, band, threshold and the model that produced it. */
export const Detail: Story = {
  args: { variant: 'detail', model: 'translate-arsl 1.2.0' },
};

export const WithoutThreshold: Story = {
  args: { threshold: undefined },
};

/** All three variants together. */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-300">
      <SyConfidence value={0.86} state="high" threshold={0.8} variant="inline" />
      <SyConfidence value={0.71} state="medium" threshold={0.8} variant="column" />
      <SyConfidence
        value={0.61}
        state="low"
        threshold={0.8}
        variant="detail"
        model="recognition-arsl 2.4.0"
      />
    </div>
  ),
};
