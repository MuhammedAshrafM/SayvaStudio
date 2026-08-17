import { setProjectAnnotations } from '@storybook/react-vite';
import preview from './.storybook/preview';

/**
 * Makes a composed story behave in Vitest the way it behaves in the
 * Storybook UI: same parameters, same decorators, same args.
 *
 * Without this, `composeStories` renders each story in isolation and any
 * project-level annotation silently does not apply — so a story could pass
 * its test and still be wrong in the preview, which defeats the point of
 * testing the preview surface rather than a separate fixture.
 *
 * Package-local rather than part of @sayva/vitest-config: the shared config
 * has no business knowing this package's preview file.
 */
setProjectAnnotations([preview]);
