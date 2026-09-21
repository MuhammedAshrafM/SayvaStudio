/**
 * The consumer's CSS pipeline — ADR-002 DR-16.
 *
 * `@sayva/design-system` publishes its stylesheet as source, not as a
 * compiled artifact: "`tailwindcss` is a peerDependency, not a dependency:
 * the consumer's build is what processes this file, so the consumer owns
 * the version." This is that build.
 *
 * Tailwind v4 needs no config file — the theme arrives as the generated
 * `@theme` block inside the design system's own `tokens.css`, and which
 * files get scanned for utility usage is declared in `globals.css` with
 * `@source`, next to the import it applies to.
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
