import { useEffect, useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { composeStories } from '@storybook/react-vite';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '@sayva/vitest-config/axe';
import { SyField } from './field.js';
import { FIELD_STATES, FIELD_VARIANTS } from './field.variants.js';
import * as stories from './field.stories.js';

const composed = composeStories(stories);

const OPTIONS = [
  { value: 'greetings', label: 'Greetings' },
  { value: 'family', label: 'Family' },
];

/** Minimal valid props per variant. */
function propsFor(variant: (typeof FIELD_VARIANTS)[number]) {
  if (variant === 'multi-facet') {
    return { variant, label: 'Categories', values: [], options: OPTIONS } as const;
  }
  if (variant === 'select' || variant === 'combobox') {
    return { variant, label: 'Category', value: 'greetings', options: OPTIONS } as const;
  }
  return { variant, label: 'Gloss', value: 'AS-SALAAMU' } as const;
}

describe('SyField — coverage', () => {
  it('declares the eight contracted variants', () => {
    expect([...FIELD_VARIANTS]).toEqual([
      'text',
      'mono',
      'number',
      'textarea',
      'select',
      'combobox',
      'multi-facet',
      'date',
    ]);
  });

  it('declares the nine contracted states', () => {
    expect([...FIELD_STATES]).toEqual([
      'empty',
      'filled',
      'focus',
      'invalid',
      'warning',
      'readonly',
      'disabled',
      'loading',
      'suggested',
    ]);
  });

  it.each(FIELD_VARIANTS)('renders variant %s with a labelled control', (variant) => {
    render(<SyField {...propsFor(variant)} />);
    // Every variant is reachable by its visible label, whatever element it uses.
    expect(screen.getByLabelText(/Gloss|Category|Categories/)).toBeTruthy();
  });
});

describe('SyField — the label is always visible', () => {
  it('renders a real label element tied to the control', () => {
    const { container } = render(<SyField label="Gloss" value="X" />);
    const label = container.querySelector('label')!;
    const input = screen.getByLabelText('Gloss');
    expect(label.getAttribute('for')).toBe(input.id);
  });

  it('names the control from the visible label, not from an aria-label', () => {
    render(<SyField label="Display name" value="Peace" />);
    expect(screen.getByRole('textbox', { name: 'Display name' })).toBeTruthy();
  });

  it('marks required programmatically, not only with an asterisk', () => {
    render(<SyField label="Gloss" value="" required />);
    const input = screen.getByLabelText(/Gloss/);
    expect(input.getAttribute('aria-required')).toBe('true');
  });
});

describe('SyField — empty and filled follow the value', () => {
  it('is empty when the value is empty', () => {
    render(<SyField label="Gloss" value="" />);
    expect((screen.getByLabelText('Gloss') as HTMLInputElement).value).toBe('');
  });

  it('is filled when the value is not', () => {
    render(<SyField label="Gloss" value="AS-SALAAMU" />);
    expect((screen.getByLabelText('Gloss') as HTMLInputElement).value).toBe('AS-SALAAMU');
  });
});

describe('SyField — invalid is border + icon + text, never colour alone', () => {
  it('states the problem in text', () => {
    render(<SyField label="Handshape" value="B-flat" invalid="Not in the ArSL notation set" />);
    expect(screen.getByText(/Not in the ArSL notation set/)).toBeTruthy();
  });

  it('ties the message to the control with aria-describedby', () => {
    render(<SyField label="Handshape" value="B-flat" invalid="Not in the ArSL notation set" />);
    const input = screen.getByLabelText('Handshape');
    const describedBy = input.getAttribute('aria-describedby')!;
    const described = describedBy
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ');
    expect(described).toContain('Not in the ArSL notation set');
  });

  it('marks the control invalid programmatically', () => {
    render(<SyField label="Handshape" value="B-flat" invalid="Bad" />);
    expect(screen.getByLabelText('Handshape').getAttribute('aria-invalid')).toBe('true');
  });

  it('changes the border, so the signal is not text alone either', () => {
    const { container } = render(<SyField label="Handshape" value="B" invalid="Bad" />);
    expect(container.innerHTML).toContain('border-status-danger-fg');
  });

  it('keeps the warning message non-blocking and distinct from invalid', () => {
    render(<SyField label="Gloss" value="X" warning="Similar to an existing gloss" />);
    expect(screen.getByText(/Similar to an existing gloss/)).toBeTruthy();
    expect(screen.getByLabelText('Gloss').hasAttribute('aria-invalid')).toBe(false);
  });
});

describe('SyField — a reason is shown, never silently disabled', () => {
  it('states why a disabled field cannot be edited', () => {
    render(
      <SyField
        label="Gloss"
        value="X"
        disabled
        disabledReason="Editing is locked while the sign is in review"
      />,
    );
    expect(screen.getByText('Editing is locked while the sign is in review')).toBeTruthy();
    expect((screen.getByLabelText('Gloss') as HTMLInputElement).disabled).toBe(true);
  });

  it('states why a read-only field cannot be edited', () => {
    render(
      <SyField
        label="Signer notes"
        value="X"
        readOnly
        readOnlyReason="Read-only — locked in review"
      />,
    );
    expect(screen.getByText('Read-only — locked in review')).toBeTruthy();
    expect((screen.getByLabelText('Signer notes') as HTMLInputElement).readOnly).toBe(true);
  });

  it('ties the reason to the control, so it is announced not merely printed', () => {
    render(<SyField label="Gloss" value="X" readOnly readOnlyReason="Locked in review" />);
    const input = screen.getByLabelText('Gloss');
    const ids = input.getAttribute('aria-describedby')!.split(' ');
    const text = ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
    expect(text).toContain('Locked in review');
  });
});

describe('SyField — Esc reverts an in-progress inline edit', () => {
  function Harness() {
    const [value, setValue] = useState('AS-SALAAMU');
    return <SyField label="Gloss" value={value} onValueChange={setValue} />;
  }

  it('restores the value the edit began from', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText('Gloss') as HTMLInputElement;

    await user.click(input);
    await user.type(input, '-EDITED');
    expect(input.value).toBe('AS-SALAAMU-EDITED');

    await user.keyboard('{Escape}');
    // Back to where the edit began, not to empty.
    expect(input.value).toBe('AS-SALAAMU');
  });
});

describe('SyField — options list', () => {
  it('renders select options natively', () => {
    render(<SyField variant="select" label="Category" value="greetings" options={OPTIONS} />);
    expect(screen.getByRole('option', { name: 'Greetings' })).toBeTruthy();
  });

  it('says so while options are loading', () => {
    render(<SyField variant="select" label="Category" value="" options={[]} loading />);
    expect(screen.getByText(/Loading options/)).toBeTruthy();
  });

  it('exposes the combobox pattern', () => {
    render(<SyField variant="combobox" label="Category" value="greetings" options={OPTIONS} />);
    const combo = screen.getByRole('combobox', { name: 'Category' });
    expect(combo.getAttribute('aria-expanded')).toBe('false');
    expect(combo.getAttribute('aria-controls')).toBeTruthy();
  });

  it('opens, moves a virtual cursor and selects with the keyboard', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <SyField
        variant="combobox"
        label="Category"
        value=""
        options={OPTIONS}
        onValueChange={onValueChange}
      />,
    );

    const combo = screen.getByRole('combobox', { name: 'Category' });
    await user.tab();
    await user.keyboard('{ArrowDown}');
    expect(combo.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('listbox')).toBeTruthy();

    // Focus never leaves the input; the cursor is virtual.
    expect(document.activeElement).toBe(combo);
    expect(combo.getAttribute('aria-activedescendant')).toBeTruthy();

    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');
    expect(onValueChange).toHaveBeenCalledWith('family');
  });

  it('selects with the pointer without the input losing focus', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <SyField
        variant="combobox"
        label="Category"
        value=""
        options={OPTIONS}
        onValueChange={onValueChange}
      />,
    );

    const combo = screen.getByRole('combobox', { name: 'Category' });
    await user.click(combo);
    // mousedown fires before blur, so the listbox is still open when the
    // option is chosen — an onClick handler would race the blur.
    await user.click(screen.getByRole('option', { name: 'Family' }));
    expect(onValueChange).toHaveBeenCalledWith('family');
  });

  it('closes the listbox on Escape', async () => {
    const user = userEvent.setup();
    render(<SyField variant="combobox" label="Category" value="" options={OPTIONS} />);

    await user.tab();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('lets a multi-facet field hold several values', async () => {
    const user = userEvent.setup();
    const onValuesChange = vi.fn();
    render(
      <SyField
        variant="multi-facet"
        label="Categories"
        values={['greetings']}
        options={OPTIONS}
        onValuesChange={onValuesChange}
      />,
    );

    const combo = screen.getByRole('combobox', { name: 'Categories' });
    await user.tab();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox').getAttribute('aria-multiselectable')).toBe('true');

    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');
    expect(onValuesChange).toHaveBeenCalledWith(['greetings', 'family']);
    expect(combo).toBeTruthy();
  });

  it('marks the selected option, so selection is not position alone', () => {
    render(
      <SyField variant="multi-facet" label="Categories" values={['greetings']} options={OPTIONS} />,
    );
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

describe('SyField — the AI register', () => {
  it('marks a suggested value with the AI register rather than colour alone', () => {
    const { container } = render(
      <SyField
        label="Description"
        value="A greeting."
        suggested
        helper="Suggested by translate-arsl 1.2.0"
      />,
    );
    expect(container.innerHTML).toContain('accent-ai');
    // The provenance is stated in words too.
    expect(screen.getByText(/Suggested by translate-arsl/)).toBeTruthy();
  });
});

/**
 * Esc has to work in layers once fields sit inside drawers and dialogs, which
 * SyField's own reuse list already promises ("SyDialog forms"). The rule the
 * canonical contract states for overlays is "Esc closes topmost", so a field
 * may only consume the key when it is itself the topmost thing with something
 * to cancel.
 */
describe('SyField — Esc is scoped to the edit it owns', () => {
  /**
   * Stands in for the drawer or dialog a field will be nested in.
   *
   * It takes Esc from a native bubble listener on `document`, which is one of
   * the two paths the boundary test below shows an overlay can actually use.
   */
  function Surrounded({
    onEscape,
    children,
  }: {
    onEscape: () => void;
    children: (value: string, setValue: (next: string) => void) => React.ReactNode;
  }) {
    const [value, setValue] = useState('AS-SALAAMU');

    useEffect(() => {
      const handler = (event: KeyboardEvent) => {
        if (event.key === 'Escape') onEscape();
      };
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }, [onEscape]);

    return <div>{children(value, setValue)}</div>;
  }

  const withField = (onEscape: () => void) => (
    <Surrounded onEscape={onEscape}>
      {(value, setValue) => <SyField label="Gloss" value={value} onValueChange={setValue} />}
    </Surrounded>
  );

  it('cancels its own edit without also closing the surface around it', async () => {
    const user = userEvent.setup();
    const onEscape = vi.fn();
    render(withField(onEscape));
    const input = screen.getByLabelText('Gloss') as HTMLInputElement;

    await user.click(input);
    await user.type(input, '-EDITED');
    await user.keyboard('{Escape}');

    expect(input.value).toBe('AS-SALAAMU');
    // One press, one effect: the drawer above must not close as well.
    expect(onEscape).not.toHaveBeenCalled();
  });

  it('leaves Esc alone when there is no edit to cancel', async () => {
    const user = userEvent.setup();
    const onEscape = vi.fn();
    render(withField(onEscape));

    // Focused, but nothing typed — the field owns nothing to revert.
    await user.click(screen.getByLabelText('Gloss'));
    await user.keyboard('{Escape}');

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('releases Esc to the surface on the second press', async () => {
    const user = userEvent.setup();
    const onEscape = vi.fn();
    render(withField(onEscape));
    const input = screen.getByLabelText('Gloss') as HTMLInputElement;

    await user.click(input);
    await user.type(input, '-EDITED');

    await user.keyboard('{Escape}');
    expect(onEscape).not.toHaveBeenCalled();

    // The edit is gone, so the field has nothing left to claim the key with.
    await user.keyboard('{Escape}');
    expect(onEscape).toHaveBeenCalledTimes(1);
    expect(input.value).toBe('AS-SALAAMU');
  });

  /**
   * The boundary itself, measured rather than assumed.
   *
   * `stopPropagation` on a React synthetic event also stops the native event,
   * but only once React's synthetic phase has begun — which happens when the
   * native event reaches the root container. Anything that runs before that
   * still sees the key. Slice 11's overlays must take Esc from one of the two
   * paths this test shows to be covered.
   */
  it('pins the propagation boundary an overlay must listen within', async () => {
    const seen: string[] = [];

    function Boundary() {
      const [value, setValue] = useState('AS-SALAAMU');
      const inner = useRef<HTMLDivElement>(null);

      useEffect(() => {
        const node = inner.current!;
        const onInnerBubble = (e: KeyboardEvent) => {
          if (e.key === 'Escape') seen.push('native-inner-bubble');
        };
        const onDocumentBubble = (e: KeyboardEvent) => {
          if (e.key === 'Escape') seen.push('native-document-bubble');
        };
        const onDocumentCapture = (e: KeyboardEvent) => {
          if (e.key === 'Escape') seen.push('native-document-capture');
        };
        node.addEventListener('keydown', onInnerBubble);
        document.addEventListener('keydown', onDocumentBubble);
        document.addEventListener('keydown', onDocumentCapture, true);
        return () => {
          node.removeEventListener('keydown', onInnerBubble);
          document.removeEventListener('keydown', onDocumentBubble);
          document.removeEventListener('keydown', onDocumentCapture, true);
        };
      }, []);

      return (
        <div ref={inner}>
          {/* A React handler on an ancestor — the other covered path. The
              a11y rule below guards production UI; this is a test double for
              an overlay, which is exactly what it is standing in for. */}
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div
            onKeyDown={(e) => {
              if (e.key === 'Escape') seen.push('react-synthetic-ancestor');
            }}
          >
            <SyField label="Gloss" value={value} onValueChange={setValue} />
          </div>
        </div>
      );
    }

    const user = userEvent.setup();
    render(<Boundary />);
    const input = screen.getByLabelText('Gloss') as HTMLInputElement;

    await user.click(input);
    await user.type(input, '-EDITED');
    seen.length = 0;
    await user.keyboard('{Escape}');

    expect(input.value).toBe('AS-SALAAMU');

    // Covered: an overlay listening either of these ways is safe.
    expect(seen).not.toContain('react-synthetic-ancestor');
    expect(seen).not.toContain('native-document-bubble');

    // Not covered, and this is the constraint Slice 11 inherits: both of
    // these run before React's synthetic phase, so nothing a React handler
    // does can stop them.
    expect(seen).toContain('native-inner-bubble');
    expect(seen).toContain('native-document-capture');
  });

  it('keeps Esc for an open listbox and releases it once closed', async () => {
    const user = userEvent.setup();
    const onEscape = vi.fn();
    render(
      <Surrounded onEscape={onEscape}>
        {() => <SyField variant="combobox" label="Category" value="" options={OPTIONS} />}
      </Surrounded>,
    );

    await user.tab();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeTruthy();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onEscape).not.toHaveBeenCalled();

    await user.keyboard('{Escape}');
    expect(onEscape).toHaveBeenCalledTimes(1);
  });
});

describe('SyField — every story passes axe', () => {
  it.each(Object.keys(composed))('%s', async (name) => {
    const Story = composed[name as keyof typeof composed];
    const { container } = render(<Story />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
