import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { type TegamiPlugin, WorkspacePackage } from "tegami"
import { GitTagPublishTask } from "tegami/plugins/git"

export const SOLSTATUS_PACKAGE_ID = "release:solstatus"
export const VERSION_FILE = "VERSION"

// One SemVer release version, such as 4.1.0 or 4.1.0-beta.1.
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

class SolStatusReleasePackage extends WorkspacePackage {
  readonly manager = "release"
  readonly name = "solstatus"
  readonly path: string
  #version: string

  constructor(root: string, version: string) {
    super()
    this.path = root
    this.#version = version
  }

  get version(): string {
    return this.#version
  }

  setVersion(version: string): void {
    this.#version = version
  }
}

class SolStatusGitTagPublishTask extends GitTagPublishTask<SolStatusReleasePackage> {}

async function readVersion(root: string): Promise<string> {
  const version = (await readFile(join(root, VERSION_FILE), "utf8")).trim()

  if (!SEMVER.test(version)) {
    throw new Error(`${VERSION_FILE} must contain one valid SemVer version.`)
  }

  return version
}

export function solStatusRelease(): TegamiPlugin {
  let pkg: SolStatusReleasePackage | undefined

  return {
    name: "solstatus-release",
    enforce: "post",
    async resolve() {
      pkg = new SolStatusReleasePackage(this.cwd, await readVersion(this.cwd))
      this.graph.add(pkg)
    },
    async applyDraft(draft) {
      if (!pkg) return
      const nextVersion = draft.getPackageDraft(pkg.id)?.bumpVersion(pkg)

      if (!nextVersion || nextVersion === pkg.version) return
      pkg.setVersion(nextVersion)
      await writeFile(join(this.cwd, VERSION_FILE), `${nextVersion}\n`)
    },
    initPublishPlan({ plan }) {
      if (!pkg) return
      const packagePlan = plan.packages.get(pkg.id)

      if (!packagePlan) return
      packagePlan.git ??= {}
      packagePlan.git.tag = `v${pkg.version}`
    },
    publishPreflight({ pkg: candidate }) {
      if (candidate instanceof SolStatusReleasePackage) return { shouldPublish: true }
    },
    publishTasks({ plan }) {
      return plan
        .getPackagesToPublish()
        .flatMap((candidate) =>
          candidate instanceof SolStatusReleasePackage
            ? [new SolStatusGitTagPublishTask(candidate)]
            : [],
        )
    },
  }
}
