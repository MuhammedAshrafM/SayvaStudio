import type { Meta, StoryObj } from '@storybook/react-vite';
import { SyButton } from './button.js';

/**
 * Stories are the preview surface AND the accessibility fixtures — the axe
 * gate in button.test.tsx composes these, so what is checked is what a
 * reviewer looks at.
 *
 * Every variant, size and state in the canonical contract appears below.
 */
const meta = {
  title: 'Primitives/SyButton',
  component: SyButton,
  args: { children: 'Approve' },
} satisfies Meta<typeof SyButton>;

export default meta;

type Story = StoryObj<typeof meta>;

// --- variants -------------------------------------------------------------

/** Commits the one primary action on a surface. Filled accent ground. */
export const Primary: Story = { args: { variant: 'primary' } };

export const Secondary: Story = { args: { variant: 'secondary', children: 'Request changes' } };

export const Ghost: Story = { args: { variant: 'ghost', children: 'Deprecate' } };

/** Destructive. Outlined rather than filled, as the Sign editor draws it. */
export const Danger: Story = { args: { variant: 'danger', children: 'Delete sign' } };

/** The label is required by the type, not by a runtime check. */
export const IconOnly: Story = {
  args: { variant: 'icon-only', label: 'Row actions', icon: <MoreGlyph />, children: undefined },
};

// --- sizes ----------------------------------------------------------------

export const SizeSmall: Story = { args: { size: 'sm', children: 'Validate' } };
export const SizeMedium: Story = { args: { size: 'md', children: 'Validate' } };
export const SizeLarge: Story = { args: { size: 'lg', children: 'Validate' } };

/** All three heights together — 28 / 32 / 40, each with a 32px hit area. */
export const AllSizes: Story = {
  args: { children: 'Validate' },
  render: (args) => (
    <div className="flex items-center gap-300">
      <SyButton {...args} size="sm" />
      <SyButton {...args} size="md" />
      <SyButton {...args} size="lg" />
    </div>
  ),
};

// --- states ---------------------------------------------------------------

/** Label persists, spinner replaces the icon, aria-busy set, focus kept. */
export const Loading: Story = { args: { loading: true, children: 'Building pack' } };

export const LoadingWithIcon: Story = {
  args: { loading: true, icon: <MoreGlyph />, children: 'Building pack' },
};

export const LoadingIconOnly: Story = {
  args: {
    variant: 'icon-only',
    loading: true,
    label: 'Running validation',
    icon: <MoreGlyph />,
    children: undefined,
  },
};

/**
 * Disabled always carries a stated reason. The Sign editor's blocked Approve
 * is the canonical case: the button is inert and the reason is stated.
 */
export const Disabled: Story = {
  args: {
    disabled: true,
    disabledReason: 'Approval is blocked: reference clip missing (media.missing)',
  },
};

export const DisabledDanger: Story = {
  args: {
    variant: 'danger',
    children: 'Delete sign',
    disabled: true,
    disabledReason: 'Deleting is blocked: 3 lessons still reference this sign',
  },
};

/** Leading icon, per the anatomy: label, optional leading icon. */
export const WithLeadingIcon: Story = {
  args: { variant: 'secondary', icon: <MoreGlyph />, children: 'Attach media' },
};

/** Every tone at once — the variant sweep a reviewer scans. */
export const AllVariants: Story = {
  args: { children: 'Approve' },
  // Destructured rather than spread: `SyButtonProps` is a union whose two
  // members disagree about `children` and `label`, so spreading the whole
  // args object into a specific variant cannot narrow to either one.
  render: ({ size, children }) => (
    <div className="flex items-center gap-300">
      <SyButton variant="primary" size={size}>
        {children}
      </SyButton>
      <SyButton variant="secondary" size={size}>
        {children}
      </SyButton>
      <SyButton variant="ghost" size={size}>
        {children}
      </SyButton>
      <SyButton variant="danger" size={size}>
        {children}
      </SyButton>
      <SyButton variant="icon-only" label="Row actions" icon={<MoreGlyph />} size={size} />
    </div>
  ),
};

/**
 * A decorative glyph, drawn locally rather than taken from an icon set:
 * which set the product uses is open decision D6.
 */
function MoreGlyph() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      className="size-[var(--icon-dense)]"
      fill="currentColor"
    >
      <circle cx="3" cy="8" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="13" cy="8" r="1.5" />
    </svg>
  );
}
