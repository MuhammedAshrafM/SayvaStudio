import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * Exercises the preview surface itself, on plain markup — there are no
 * design-system components yet.
 *
 * Without a story, `main.ts`, `preview.ts`, the a11y addon and the
 * composeStories wiring all ship unproven, and the first real story in
 * Slice 6 would be debugging the infrastructure and the component at once.
 * Filed under Infrastructure rather than a component group so nobody mistakes
 * it for part of the system. It can be deleted once real primitives exist.
 */
function PreviewHarness({ label }: { label: string }) {
  return (
    <label className="text-body text-text-primary">
      {label}
      <input name="preview-harness" className="ms-200 rounded-sm border border-border-strong" />
    </label>
  );
}

const meta = {
  title: 'Infrastructure/Preview harness',
  component: PreviewHarness,
  args: { label: 'Gloss' },
} satisfies Meta<typeof PreviewHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A labelled control: correct markup, and the case axe must pass. */
export const Accessible: Story = {};
