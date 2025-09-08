# Changelog

## [2.1.1](https://github.com/unibeck/solstatus/compare/solstatus@v2.1.0...solstatus@v2.1.1) (2025-09-08)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @solstatus/infra bumped to 2.1.1

## [2.1.0](https://github.com/unibeck/solstatus/compare/solstatus@v2.0.0...solstatus@v2.1.0) (2025-07-09)


### Features

* Added additional time ranges to endpoint monitor details page
* Added auto refresh progress bar
* Added auto refresh to endpoint monitor details page
* Added auto refresh to dashboard
* Added liquid metal animation to solstatus logo
* Refined endpoint monitor details drawer
* Improved loading states and error handling in endpoint monitor charts
* Improved endpoint monitor uptime chart performance
* Fixed scroll bar layout shift during drawers, dropdown, dialogs, etc
* Fixed eager endpoint monitor metadata fetching for details drawer
* alert threshold per endpoint monitor ([f16284a](https://github.com/unibeck/solstatus/commit/f16284a7bbd3e803f21fbf6e0ea4d9e01e9422fc))
* display app version ([#35](https://github.com/unibeck/solstatus/issues/35)) ([774efa9](https://github.com/unibeck/solstatus/commit/774efa9bab2eac9bec64a51a2e42e3737c7d9456))
* **front:** call zustand store fetch functions on endpoint creation ([27109d1](https://github.com/unibeck/solstatus/commit/27109d17ea55a24bbfcad72c3e3456406023cb42))
* implement release-please ([494d492](https://github.com/unibeck/solstatus/commit/494d4923eced1f18e9923ceebfa4ee33d2c4dd7e))
* make bootstrap script executable ([3409734](https://github.com/unibeck/solstatus/commit/3409734b78c0bea060497b239055722c0fd4ed2b))
* make fqdn optional, and use worker.dev url if not present ([579e224](https://github.com/unibeck/solstatus/commit/579e224926fa6b77d9f01d82e196d37803d47e7f))
* Polish UI and add auto-refresh to dashboards ([a9d4f1d](https://github.com/unibeck/solstatus/commit/a9d4f1db20f7415aba948593201c55b838cdac62))
* rebrand to SolStatus (from uptime-monitor) ([eda1211](https://github.com/unibeck/solstatus/commit/eda121135a43fe8fffa5cd08e01083dfed1d7a6a))
* refresh endpoint monitor data after state change ([544fe02](https://github.com/unibeck/solstatus/commit/544fe02ea2fb3349ca16c7e9f37335a31a582054))
* release v2 ([8d09d77](https://github.com/unibeck/solstatus/commit/8d09d77f92ceec9bd7cba2e9fb4a514a406b588d))


### Bug Fixes

* add @ tag separator to release names ([04d3d17](https://github.com/unibeck/solstatus/commit/04d3d17d5f961d21c67b754bc5a6e1404456c4c3))
* automate confirmation for database setup in bootstrap script ([af96378](https://github.com/unibeck/solstatus/commit/af963782dc3b8675a770f46b95e1dab1a4443b91))
* Fix logo font and make it theme aware ([917ed78](https://github.com/unibeck/solstatus/commit/917ed789ba69c253503c2030f5b0b211aa7dc7aa))
* improved layout and updated dependencies ([55ad0fe](https://github.com/unibeck/solstatus/commit/55ad0fe3842620bd45116aa91225224ceeb8d34c))
* refine release-please ([2cb8694](https://github.com/unibeck/solstatus/commit/2cb869470c2211ac5c7a6fc511d4ce5965fad129))
* Revert drizzle-zod dependency update ([7221c18](https://github.com/unibeck/solstatus/commit/7221c183dcb427d1799f8dc63175aef2baa4a8cb)), closes [#74](https://github.com/unibeck/solstatus/issues/74)
* Support Cloudflare Free tier with reduced bundle size (below 3 MBs) ([1b08b81](https://github.com/unibeck/solstatus/commit/1b08b8191f84e0c6491204b544af8c610c13c325))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @solstatus/infra bumped to 2.1.1

## 2.0.0-beta.1 (2025-06-23)

### Features

* make fqdn optional, and use worker.dev url if not present ([579e224](https://github.com/unibeck/solstatus/commit/579e224926fa6b77d9f01d82e196d37803d47e7f))

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @solstatus/infra bumped to 2.0.0-beta.1

## 2.0.0-beta.0 (2025-06-22)

### Updates

* IaC via Alchemy
* Monorepo via pnpm
  * App and Api services now have separate dependency trees and bundles
* UI improvements, especially to the endpoint monitor page
* Performance improvements (which also means reduced costs!)
* Biome v2
* Incremental cache
* Many small bug fixes

### Upgrade from v1.7.x to v2.0.x

It is advisable to read the updated README.md first to get familiar with the new repo structure. That said, updating is an easy two step process

1) Rename the following Cloudflare resources:
        - Worker: `monitor-exec-production` -> `solstatus-prod-monitor-exec`
        - Worker: `monitor-trigger-production` -> `solstatus-prod-monitor-trigger`
        - Worker: `solstatus-production` -> `solstatus-prod-app`
2) Run `pnpm cli --fqdn uptime.example.com --stage prod` (with your actual FQDN)

## [1.7.1](https://github.com/unibeck/solstatus/compare/solstatus@v1.7.0...solstatus@v1.7.1) (2025-05-25)


### Bug Fixes

* Revert drizzle-zod dependency update ([7221c18](https://github.com/unibeck/solstatus/commit/7221c183dcb427d1799f8dc63175aef2baa4a8cb)), closes [#74](https://github.com/unibeck/solstatus/issues/74)

## [1.7.0](https://github.com/unibeck/solstatus/compare/solstatus@v1.6.2...solstatus@v1.7.0) (2025-05-22)


### Features

* alert threshold per endpoint monitor ([f16284a](https://github.com/unibeck/solstatus/commit/f16284a7bbd3e803f21fbf6e0ea4d9e01e9422fc))

## [1.6.2](https://github.com/unibeck/solstatus/compare/solstatus@v1.6.1...solstatus@v1.6.2) (2025-05-20)


### Bug Fixes

* Fix logo font and make it theme aware ([917ed78](https://github.com/unibeck/solstatus/commit/917ed789ba69c253503c2030f5b0b211aa7dc7aa))

## [1.6.1](https://github.com/unibeck/solstatus/compare/solstatus@v1.6.0...solstatus@v1.6.1) (2025-05-20)


### Bug Fixes

* Support Cloudflare Free tier with reduced bundle size (below 3 MBs) ([1b08b81](https://github.com/unibeck/solstatus/commit/1b08b8191f84e0c6491204b544af8c610c13c325))

## [1.6.0](https://github.com/unibeck/uptime-monitor/compare/solstatus@v1.5.1...solstatus@v1.6.0) (2025-05-15)


### Features

* display app version ([#35](https://github.com/unibeck/uptime-monitor/issues/35)) ([774efa9](https://github.com/unibeck/uptime-monitor/commit/774efa9bab2eac9bec64a51a2e42e3737c7d9456))
* **front:** call zustand store fetch functions on endpoint creation ([27109d1](https://github.com/unibeck/uptime-monitor/commit/27109d17ea55a24bbfcad72c3e3456406023cb42))
* implement release-please ([494d492](https://github.com/unibeck/uptime-monitor/commit/494d4923eced1f18e9923ceebfa4ee33d2c4dd7e))
* make bootstrap script executable ([3409734](https://github.com/unibeck/uptime-monitor/commit/3409734b78c0bea060497b239055722c0fd4ed2b))
* rebrand to SolStatus (from uptime-monitor) ([eda1211](https://github.com/unibeck/uptime-monitor/commit/eda121135a43fe8fffa5cd08e01083dfed1d7a6a))
* refresh endpoint monitor data after state change ([544fe02](https://github.com/unibeck/uptime-monitor/commit/544fe02ea2fb3349ca16c7e9f37335a31a582054))


### Bug Fixes

* add @ tag separator to release names ([04d3d17](https://github.com/unibeck/uptime-monitor/commit/04d3d17d5f961d21c67b754bc5a6e1404456c4c3))
* automate confirmation for database setup in bootstrap script ([af96378](https://github.com/unibeck/uptime-monitor/commit/af963782dc3b8675a770f46b95e1dab1a4443b91))
* improved layout and updated dependencies ([55ad0fe](https://github.com/unibeck/uptime-monitor/commit/55ad0fe3842620bd45116aa91225224ceeb8d34c))
* refine release-please ([2cb8694](https://github.com/unibeck/uptime-monitor/commit/2cb869470c2211ac5c7a6fc511d4ce5965fad129))

## [1.5.1](https://github.com/unibeck/solstatus/compare/solstatus@v1.5.0...solstatus@v1.5.1) (2025-05-14)


### Bug Fixes

* improved layout and updated dependencies ([55ad0fe](https://github.com/unibeck/solstatus/commit/55ad0fe3842620bd45116aa91225224ceeb8d34c))

## [1.5.0](https://github.com/unibeck/solstatus/compare/solstatus@v1.4.1...solstatus@v1.5.0) (2025-04-29)


### Features

* **front:** call zustand store fetch functions on endpoint creation ([27109d1](https://github.com/unibeck/solstatus/commit/27109d17ea55a24bbfcad72c3e3456406023cb42))
* refresh endpoint monitor data after state change ([544fe02](https://github.com/unibeck/solstatus/commit/544fe02ea2fb3349ca16c7e9f37335a31a582054))

## [1.4.1](https://github.com/unibeck/solstatus/compare/solstatus-v1.4.0...solstatus@v1.4.1) (2025-04-25)


### Bug Fixes

* add @ tag separator to release names ([04d3d17](https://github.com/unibeck/solstatus/commit/04d3d17d5f961d21c67b754bc5a6e1404456c4c3))

## [1.4.0](https://github.com/unibeck/solstatus/compare/solstatus-v1.3.0...solstatus-v1.4.0) (2025-04-25)


### Features

* display app version ([#35](https://github.com/unibeck/solstatus/issues/35)) ([774efa9](https://github.com/unibeck/solstatus/commit/774efa9bab2eac9bec64a51a2e42e3737c7d9456))

## [1.3.0](https://github.com/unibeck/solstatus/compare/solstatus-v1.2.0...solstatus-v1.3.0) (2025-04-25)


### Features

* implement release-please ([494d492](https://github.com/unibeck/solstatus/commit/494d4923eced1f18e9923ceebfa4ee33d2c4dd7e))
* make bootstrap script executable ([3409734](https://github.com/unibeck/solstatus/commit/3409734b78c0bea060497b239055722c0fd4ed2b))


### Bug Fixes

* automate confirmation for database setup in bootstrap script ([af96378](https://github.com/unibeck/solstatus/commit/af963782dc3b8675a770f46b95e1dab1a4443b91))
* refine release-please ([2cb8694](https://github.com/unibeck/solstatus/commit/2cb869470c2211ac5c7a6fc511d4ce5965fad129))

## [1.2.0](https://github.com/unibeck/solstatus/compare/v1.1.1...v1.2.0) (2025-04-25)


### Features

* implement release-please ([494d492](https://github.com/unibeck/solstatus/commit/494d4923eced1f18e9923ceebfa4ee33d2c4dd7e))
