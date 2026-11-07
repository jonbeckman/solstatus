import { tegami } from "tegami"
import { runCli } from "tegami/cli"
import { github } from "tegami/plugins/github"
import { solStatusRelease } from "./releases/solstatus-release.ts"

// SolStatus ships one release: the alchemy.new registry package. The workspace packages
// are private, so Tegami versions the root VERSION file and tags v<version>.
const release = tegami({
  ignore: [/^npm:/],
  npm: {
    client: "nub",
    updateLockFile: false,
  },
  plugins: [
    github({
      repo: "SolZeroAI/solstatus",
      release: {
        eager: false,
        create({ pkg }) {
          return { title: `SolStatus v${pkg.version}` }
        },
      },
      versionPr: {
        base: "master",
        branch: "tegami/version-packages",
      },
    }),
    solStatusRelease(),
  ],
})

await runCli(release)
