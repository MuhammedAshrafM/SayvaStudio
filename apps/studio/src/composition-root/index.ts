import 'server-only';

/**
 * Composition Root (Architecture Blueprint §6, AD-05).
 *
 * The only module allowed to import concrete Infrastructure classes and
 * wire them into Application use cases. Every Server Action and Server
 * Component that needs a Use Case resolves it through here — never by
 * importing an Infrastructure class directly (Architecture Blueprint §2,
 * "Forbidden: a Server/Client Component imports a concrete Infrastructure
 * class directly").
 *
 * Not wired to anything real yet. @sayva/application and
 * @sayva/infrastructure are both still empty placeholders (Roadmap
 * Phase 0). Real wiring starts in Roadmap Phase 2 (Project Management),
 * the first phase with an actual Use Case and a matching Repository
 * implementation to connect — at that point this file grows into
 * something like:
 *
 *   const projectRepository = new FileSystemProjectRepository();
 *   export function createProjectUseCase() {
 *     return new CreateProjectUseCase(projectRepository);
 *   }
 *
 * `import 'server-only'` (top of file) makes it a build error for this
 * module to ever end up in a Client Component's bundle — the same
 * "framework constraint enforces the architecture" pattern the
 * Architecture Blueprint uses for Server Actions (§6).
 *
 * Proves both allowed edges resolve and compile — not just declared in
 * package.json (ADR-002 DR-02: app depends on application, infrastructure,
 * design-system). Remove these imports once real wiring needs them for
 * real reasons.
 */
import '@sayva/application';
import '@sayva/infrastructure';

export {};
