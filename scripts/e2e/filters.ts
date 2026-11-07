import type { TestFilter, TestFilterCandidate } from "e2e"

/**
 * Changed paths that no e2e test observes: agent instructions and skills, and the release files
 * that the Tegami version pull request writes. Master pushes skip e2e for the same release files.
 */
const UNOBSERVED_PATHS: readonly RegExp[] = [
  /^\.agents\//,
  /^\.claude\//,
  /^skills-lock\.json$/,
  /(^|\/)(AGENTS|CLAUDE)\.md$/,
  /^\.tegami\//,
  /(^|\/)(VERSION|CHANGELOG\.md)$/,
]

interface IgnoreUnobservedOptions {
  /** Paths that match `UNOBSERVED_PATHS` but that a test can observe, such as a product skill. */
  readonly observed?: readonly RegExp[]
}

function excludeAll(tests: readonly TestFilterCandidate[], reason: string) {
  return Object.fromEntries(tests.map((test) => [test.id, reason]))
}

/**
 * Removes unobserved paths from the change before `filter` judges it. A skills refresh or a
 * version pull request then runs no tests, and a mixed change keeps its diff under the decision
 * filter's 60 kB limit. Keep this file identical in every SolZero repository.
 */
export function ignoreUnobservedChanges(
  filter: TestFilter,
  options: IgnoreUnobservedOptions = {},
): TestFilter {
  const observed = options.observed ?? []

  const unobserved = (file: string) =>
    UNOBSERVED_PATHS.some((pattern) => pattern.test(file)) &&
    !observed.some((pattern) => pattern.test(file))

  return {
    name: filter.name,
    filter: (tests, context) => {
      const files = context.changes.files.filter((file) => !unobserved(file))
      const ignored = context.changes.files.length - files.length

      if (files.length === 0)
        return {
          exclude: excludeAll(tests, "only agent tooling or release files changed"),
          note: `all ${ignored} changed files are agent tooling or release files`,
        }

      if (ignored > 0) context.log(`ignoring ${ignored} agent tooling or release files`)

      return filter.filter(tests, { ...context, changes: { ...context.changes, files } })
    },
  }
}
