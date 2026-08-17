import type { Meta, StoryObj } from '@storybook/react-vite';
import { SyStateBlock } from './state-block.js';

/**
 * Primitive contract stories, not product screens. Each exercises one point
 * of the contract; none assembles a workspace.
 *
 * These are the fixtures the composed-story axe gate renders, so the six
 * states and three sizes all appear below.
 */
const meta = {
  title: 'Primitives/SyStateBlock',
  component: SyStateBlock,
} satisfies Meta<typeof SyStateBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

const noop = () => {};

// --- the six states -------------------------------------------------------

/** Nothing has been created yet. Names the first step. */
export const FirstRun: Story = {
  args: {
    state: 'first-run',
    heading: 'No signs yet',
    description: 'Import a CSV of glosses, or create the first sign by hand.',
    action: { label: 'Create first sign', onAction: noop, tone: 'primary' },
  },
};

/** Content exists but the filters exclude it, so the filters are named. */
export const FilteredEmpty: Story = {
  args: {
    state: 'filtered-empty',
    heading: 'No signs match these filters',
    description: 'Status is In Review, media is Missing, and updated is Last 7 days.',
    action: { label: 'Clear filters', onAction: noop },
  },
};

/** Skeleton, not spinner. The label is the region's accessible name. */
export const Loading: Story = {
  args: { state: 'loading', label: 'Loading signs' },
};

/** Trace ID and a retry are both required by the type (AC14). */
export const ErrorState: Story = {
  args: {
    state: 'error',
    heading: 'Could not load signs',
    description: 'The request failed before any rows were returned. Filters are preserved.',
    traceId: 'a41f-9c02-77be',
    action: { label: 'Retry', onAction: noop },
  },
};

export const NoPermission: Story = {
  args: {
    state: 'no-permission',
    heading: 'You cannot view this vocabulary',
    description: 'Ask an administrator for access to the ArSL language scope.',
    action: { label: 'Request access', onAction: noop },
  },
};

export const Offline: Story = {
  args: {
    state: 'offline',
    heading: 'You are offline',
    description: 'Changes made now are kept locally and sent when the connection returns.',
    action: { label: 'Retry connection', onAction: noop },
  },
};

// --- the three sizes ------------------------------------------------------

export const SizePane: Story = {
  args: { ...FirstRun.args, size: 'pane' },
};

export const SizePanel: Story = {
  args: { ...FirstRun.args, size: 'panel' },
};

export const SizeInline: Story = {
  args: { ...FirstRun.args, size: 'inline' },
};

/** All three sizes together, for a reviewer scanning density. */
export const AllSizes: Story = {
  args: FirstRun.args,
  render: (args) => (
    <div className="flex flex-col gap-400">
      <SyStateBlock {...args} size="pane" />
      <SyStateBlock {...args} size="panel" />
      <SyStateBlock {...args} size="inline" />
    </div>
  ),
};

// --- contract details -----------------------------------------------------

/** A block with no next action: the heading and line still carry the state. */
export const WithoutAction: Story = {
  args: {
    state: 'no-permission',
    heading: 'You cannot view this vocabulary',
    description: 'Ask an administrator for access.',
  },
};

/**
 * The user just cleared the last matching row, so the next action takes
 * focus. A block present on first paint does not.
 */
export const UserInitiated: Story = {
  args: { ...FilteredEmpty.args, userInitiated: true },
};

/** Nested under an existing heading, so the block's heading steps down. */
export const HeadingLevelThree: Story = {
  args: { ...FirstRun.args, size: 'panel', headingLevel: 3 },
};
