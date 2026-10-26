import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tegami } from "tegami"
import { runCli } from "tegami/cli"
import { github } from "tegami/plugins/github"

const publishedPackageId = "npm:solstatus"

const release = tegami({
  npm: {
    client: "nub",
  },
  plugins: [
    github({
      repo: "jonbeckman/solstatus",
      release: {
        eager: false,
      },
      versionPr: {
        base: "master",
        branch: "tegami/version-packages",
      },
    }),
    {
      name: "root-version-file",
      async applyDraft(draft) {
        const pkg = this.graph.get(publishedPackageId)

        if (!pkg) return
        const nextVersion = draft.getPackageDraft(pkg.id)?.bumpVersion(pkg)

        if (!nextVersion) return
        await writeFile(join(this.cwd, "VERSION"), `${nextVersion}\n`)
      },
    },
  ],
})

await runCli(release)
