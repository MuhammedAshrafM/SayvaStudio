/**
 * Design-system discipline: three rules that turn design acceptance
 * criteria into build failures instead of review comments.
 *
 *   no-raw-design-values   AC2 — "A grep for hex literals in component
 *                          source returns matches" is a stated failure
 *                          condition. Extended to raw lengths inside
 *                          Tailwind arbitrary values, which are the same
 *                          violation wearing brackets.
 *   logical-properties     Foundations §15.10 — "All spacing uses logical
 *                          properties (inline-start, not left) so RTL is a
 *                          document attribute, not a stylesheet fork."
 *   no-restricted-imports  DR-15 — token *values* live in JSON for the
 *                          generator and the contrast tests. A component
 *                          that can read a value has a second way to apply
 *                          a colour, which is how AC2 gets violated.
 *
 * Written as a small local plugin rather than `no-restricted-syntax`
 * selectors on purpose. Selector regexes cannot express "an arbitrary value
 * is fine when it references a custom property", they cannot be scoped to
 * class-name positions, and every character class inside them collides with
 * esquery's own `]` terminator. They also produce one generic message,
 * where DR-12 requires a violation to name the rule it broke.
 */

/** Colours the design would express as a token. 3/4/6/8 digits, not mid-word. */
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-zA-Z])/;

/** The contents of a Tailwind arbitrary value: the `12px` in `p-[12px]`. */
const ARBITRARY = /\[([^\]]*)\]/g;

/** A hard-coded length. `%` is deliberately absent — it is layout, not a token. */
const RAW_LENGTH = /(?:^|[^\w-])\d*\.?\d+(?:px|rem|em|pt|vh|vw|ch)\b/;

/** Functions whose string arguments are class names. */
const CLASS_FUNCTIONS = new Set(['cn', 'clsx', 'cva', 'twMerge', 'classNames']);

/** Physical-direction utilities, each with the logical utility that replaces it. */
const PHYSICAL = [
  [/^-?[mp][lr]-/, 'use the logical spacing utilities — ms-/me- for margin, ps-/pe- for padding'],
  [/^-?(?:left|right)-/, 'use start-/end-'],
  [/^text-(?:left|right)$/, 'use text-start/text-end'],
  [/^float-(?:left|right)$/, 'use float-start/float-end'],
  [/^border-[lr](?:-|$)/, 'use border-s/border-e'],
  [/^rounded-(?:[lr]|tl|tr|bl|br)(?:-|$)/, 'use rounded-s/rounded-e/rounded-ss/rounded-se/…'],
  [/^-?scroll-[mp][lr]-/, 'use scroll-ms/scroll-me/scroll-ps/scroll-pe'],
];

/** Strips variant prefixes (`hover:`, `md:`) and the `!important` marker. */
function bareUtility(token) {
  return token.replace(/^(?:[a-zA-Z0-9_-]+:)+/, '').replace(/^!/, '');
}

/**
 * True when this string sits where class names go. Scoping matters for the
 * logical-properties rule: prose like "the right-hand pane" is not a
 * violation, and a rule that says it is gets disabled instead of obeyed.
 */
function inClassPosition(node) {
  let current = node.parent;
  for (let depth = 0; current && depth < 15; depth += 1) {
    if (current.type === 'JSXAttribute') {
      const name = current.name && current.name.name;
      return name === 'className' || name === 'class';
    }
    if (
      current.type === 'CallExpression' &&
      current.callee.type === 'Identifier' &&
      CLASS_FUNCTIONS.has(current.callee.name)
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/** Visits every string a component could put in the DOM. */
function stringVisitor(handle) {
  return {
    Literal(node) {
      if (typeof node.value === 'string') handle(node, node.value);
    },
    TemplateElement(node) {
      handle(node, node.value.raw);
    },
  };
}

const noRawDesignValues = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow raw colours and lengths where a design token exists (AC2).' },
    schema: [],
    messages: {
      rawHex:
        'Raw hex colour "{{value}}" — acceptance criterion AC2 fails any component containing a raw hex where a semantic token exists. Use a token from design-tokens.json.',
      rawLength:
        'Raw length "{{value}}" in a Tailwind arbitrary value — AC2. Use a spacing, sizing or typography token, or reference a custom property: w-[var(--pane-inspector)].',
    },
  },
  create(context) {
    return stringVisitor((node, raw) => {
      const hex = HEX.exec(raw);
      if (hex) {
        context.report({ node, messageId: 'rawHex', data: { value: hex[0] } });
      }

      for (const match of raw.matchAll(ARBITRARY)) {
        const inner = match[1];
        // An arbitrary value pointing at a custom property is how a token
        // gets used where no utility exists. That is the intended path.
        if (inner.includes('var(--') || inner.startsWith('--')) continue;
        if (RAW_LENGTH.test(inner)) {
          context.report({ node, messageId: 'rawLength', data: { value: match[0] } });
        }
      }
    });
  },
};

const logicalProperties = {
  meta: {
    type: 'problem',
    docs: { description: 'Require logical-direction Tailwind utilities (Foundations §15.10).' },
    schema: [],
    messages: {
      physical:
        'Physical-direction utility "{{token}}" — Foundations §15.10 requires logical properties so RTL stays a document attribute rather than a stylesheet fork: {{fix}}.',
    },
  },
  create(context) {
    return stringVisitor((node, raw) => {
      if (!inClassPosition(node)) return;

      for (const token of raw.split(/\s+/)) {
        if (!token) continue;
        const utility = bareUtility(token);
        for (const [pattern, fix] of PHYSICAL) {
          if (pattern.test(utility)) {
            context.report({ node, messageId: 'physical', data: { token: utility, fix } });
            break;
          }
        }
      }
    });
  },
};

const plugin = {
  meta: { name: '@sayva/eslint-config/design-rules' },
  rules: {
    'no-raw-design-values': noRawDesignValues,
    'logical-properties': logicalProperties,
  },
};

export default [
  {
    plugins: { sayva: plugin },
    rules: {
      'sayva/no-raw-design-values': 'error',
      'sayva/logical-properties': 'error',
    },
  },
  {
    // Scoped by path, so this is a no-op in packages that have no component
    // directories — the same config can be spread everywhere without care.
    files: ['src/primitives/**/*.{ts,tsx}', 'src/patterns/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/design-tokens.json', '**/design-manifest.json'],
              message:
                'DR-15: token values are for the generator and the contrast tests only. A component applies a token as a utility class, never by reading its value — a value reachable from JavaScript is a second way to apply a colour, which is how AC2 gets violated.',
            },
          ],
        },
      ],
    },
  },
];
