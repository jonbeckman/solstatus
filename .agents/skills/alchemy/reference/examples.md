# Upstream Examples Map

Use the `alchemy-run/alchemy-effect/examples` tree as a pattern library. Prefer linking to upstream and adapting the smallest relevant pattern instead of copying whole examples into a project.

The inline examples below are small snapshots of the upstream `alchemy.run.ts` entrypoints that are most useful during agent work. Treat them as convenience references, then check the upstream links before making production changes.

Upstream root: `https://github.com/alchemy-run/alchemy-effect/tree/main/examples`

## First choices by deploy shape

| Scenario                                                                        | Start with                                                                                          | What to inspect                                                                           |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Basic Cloudflare Worker with R2, D1, Queue, Durable Object, assets, and secrets | `examples/cloudflare-worker`                                                                        | `alchemy.run.ts`, worker bindings, queue consumer registration, `Cloudflare.InferEnv`     |
| Async Cloudflare Worker and Durable Object wiring                               | `examples/cloudflare-worker-async`                                                                  | Worker + DO namespace declaration and binding shape                                       |
| Local Cloudflare development with multiple workers and `alchemy dev`            | `examples/cloudflare-dev`                                                                           | Multiple worker outputs, DO binding, dev ports, and feedback loops                        |
| Next.js / OpenNext app on Cloudflare Workers                                    | Inline `Next.js / OpenNext Worker` example below                                                    | `.open-next/worker.js`, `.open-next/assets`, Worker asset handling, `nodejs_compat` flags |
| TanStack app on Cloudflare                                                      | `examples/cloudflare-tanstack`, `examples/cloudflare-tanstack-start-solid`                          | `Cloudflare.Vite`, backend worker binding, `nodejs_compat`                                |
| Solid/Vue frontend deploys                                                      | `examples/cloudflare-solidstart`, `examples/cloudflare-solidjs-ssr`, `examples/cloudflare-vue`      | Framework-specific Vite/SSR wiring                                                        |
| Cloudflare + Neon + Drizzle                                                     | `examples/cloudflare-neon-drizzle`                                                                  | Database binding and migration shape                                                      |
| Cloudflare + PlanetScale + Drizzle                                              | `examples/cloudflare-planetscale-mysql-drizzle`, `examples/cloudflare-planetscale-postgres-drizzle` | Database provider, branch/password resources, Drizzle migration shape                     |
| Cloudflare secrets                                                              | `examples/cloudflare-secrets-store`                                                                 | Secret storage and Worker access pattern                                                  |
| Cloudflare email routing                                                        | `examples/cloudflare-email`                                                                         | Email routing resources and worker integration                                            |
| Git-backed artifacts on Cloudflare                                              | `examples/cloudflare-git-artifacts`                                                                 | Build/artifact resource flow                                                              |
| AWS Lambda function                                                             | `examples/aws-lambda`                                                                               | `AWS.providers()`, `Alchemy.localState()`, Lambda outputs, CloudWatch dashboard/alarm     |
| AWS Lambda with HTTP API                                                        | `examples/aws-lambda-httpapi`                                                                       | API Gateway / function URL style HTTP deploy                                              |
| AWS Lambda RPC                                                                  | `examples/aws-lambda-rpc`                                                                           | Effect RPC-style runtime wiring                                                           |
| AWS REST API                                                                    | `examples/aws-rest-api`                                                                             | API Gateway v1 resources                                                                  |
| AWS static site or Vite                                                         | `examples/aws-static-site`, `examples/aws-vite`                                                     | Static assets, CDN/site deploy shape                                                      |
| AWS EC2/ECS/EKS/RDS                                                             | `examples/aws-ec2`, `examples/aws-ecs`, `examples/aws-eks`, `examples/aws-rds`                      | Long-lived infrastructure resources and provider/region assumptions                       |
| Monorepo, one stack                                                             | `examples/monorepo-single-stack`                                                                    | Package layout with one deploy unit                                                       |
| Monorepo, multiple stacks                                                       | `examples/monorepo-multi-stack`                                                                     | Stack boundaries and deploy ordering                                                      |

## Current example directories

These directories existed upstream when this reference was refreshed:

- `aws-ec2`
- `aws-ecs`
- `aws-eks`
- `aws-lambda`
- `aws-lambda-httpapi`
- `aws-lambda-rpc`
- `aws-rds`
- `aws-rest-api`
- `aws-static-site`
- `aws-vite`
- `cloudflare-dev`
- `cloudflare-email`
- `cloudflare-git-artifacts`
- `cloudflare-neon-drizzle`
- `cloudflare-planetscale-mysql-drizzle`
- `cloudflare-planetscale-postgres-drizzle`
- `cloudflare-secrets-store`
- `cloudflare-solidjs-ssr`
- `cloudflare-solidstart`
- `cloudflare-static-site`
- `cloudflare-tanstack`
- `cloudflare-tanstack-start-solid`
- `cloudflare-vue`
- `cloudflare-worker`
- `cloudflare-worker-async`
- `monorepo-multi-stack`
- `monorepo-single-stack`

Refresh the list before relying on it:

```bash
curl -s 'https://api.github.com/repos/alchemy-run/alchemy-effect/contents/examples?ref=main' \
  | jq -r '.[] | select(.type == "dir") | .name' \
  | sort
```

## Inline examples worth copying

### Cloudflare Worker

Source: `https://github.com/alchemy-run/alchemy-effect/blob/main/examples/cloudflare-worker/alchemy.run.ts`

Use it when you need to wire multiple Cloudflare resources into one Worker and verify binding inference. The detailed bindings live in imported files such as `src/Api.ts`, `src/Bucket.ts`, and `src/AiGateway.ts`.

```ts
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";

import { Gateway } from "./src/AiGateway.ts";
import Api from "./src/Api.ts";
import { Bucket } from "./src/Bucket.ts";
import SecondaryApiLive, { SecondaryApi } from "./src/SecondaryApi.ts";
import WorkerTagLive, { WorkerTag } from "./src/WorkerTag.ts";

// Demo Action — runs at deploy time when its input (the resolved deployed
// URL) changes. Logs the new URL and returns a tiny manifest used as the
// stack output. Re-deploys with no changes skip the body.
const AnnounceDeploy = Alchemy.Action("AnnounceDeploy", (input: { url: string; bucket: string }) =>
  Effect.gen(function* () {
    yield* Effect.log(`Deployed ${input.url} (bucket: ${input.bucket})`);
    return { deployedAt: new Date().toISOString(), url: input.url };
  }),
);

export default Alchemy.Stack(
  "CloudflareWorkerExample",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const api = yield* Api;
    const bucket = yield* Bucket;
    const gateway = yield* Gateway;
    const workerTag = yield* WorkerTag;
    // Two Workers binding the same Agent DO triggers the regression where
    // a single Container DO namespace appears in multiple bindings on the
    // Sandbox ContainerApplication. See SecondaryApi.ts for details.
    const secondaryApi = yield* SecondaryApi;
    // The Queue consumer is wired automatically by
    // `Cloudflare.messages(Queue).subscribe(...)` inside src/Api.ts —
    // no explicit `Cloudflare.QueueConsumer(...)` is needed here.

    const announcement = yield* AnnounceDeploy({
      url: api.url.as<string>(),
      bucket: bucket.bucketName,
    });

    return {
      url: api.url.as<string>(),
      bucket: bucket.bucketName,
      gatewayId: gateway.gatewayId,
      workerTagUrl: workerTag.url.as<string>(),
      secondaryApiUrl: secondaryApi.url.as<string>(),
      deployedAt: announcement.deployedAt,
    };
  }).pipe(Effect.provide(WorkerTagLive), Effect.provide(SecondaryApiLive)),
);
```

### Cloudflare Dev

Source: `https://github.com/alchemy-run/alchemy-effect/blob/main/examples/cloudflare-dev/alchemy.run.ts`

Use it when the local development path matters as much as deploy: public preview routes, webhook callbacks, hot reload, and debugger-friendly Workers.

```ts
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";
import type { Counter as CounterClass } from "./src/AsyncWorker.ts";
import EffectWorker from "./src/EffectWorker.ts";

export const Counter = Cloudflare.DurableObjectNamespace<CounterClass>("Counter", {
  className: "Counter",
});

export type AsyncWorkerEnv = Cloudflare.InferEnv<typeof AsyncWorker>;

export const AsyncWorker = Cloudflare.Worker("AsyncWorker", {
  main: "./src/AsyncWorker.ts",
  bindings: {
    Counter,
  },
});

export default Alchemy.Stack(
  "CloudflareDev",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const asyncWorker = yield* AsyncWorker;
    const effectWorker = yield* EffectWorker;

    return {
      asyncWorker: asyncWorker.url,
      effectWorker: effectWorker.url,
    };
  }),
);
```

### Cloudflare Vite / TanStack

Source: `https://github.com/alchemy-run/alchemy-effect/blob/main/examples/cloudflare-tanstack/alchemy.run.ts`

Use it when a frontend deploy needs to bind directly to backend infrastructure instead of shipping hard-coded env strings.

```ts
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";
import Backend, { Bucket } from "./src/backend.ts";

export const Website = Cloudflare.Vite("Website", {
  compatibility: {
    flags: ["nodejs_compat"],
  },
  bindings: {
    BUCKET: Bucket,
    BACKEND: Backend,
  },
});

export type WebsiteEnv = Cloudflare.InferEnv<typeof Website>;

export default Alchemy.Stack(
  "CloudflareTanstackExample",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const backend = yield* Backend;
    const website = yield* Website;
    return {
      backendUrl: backend.url.as<string>(),
      websiteUrl: website.url.as<string>(),
    };
  }),
);
```

### Next.js / OpenNext Worker

Use this for a Next.js app built by OpenNext for Cloudflare Workers. The important shape is a non-bundled Worker entrypoint at `.open-next/worker.js`, assets from `.open-next/assets`, and the compatibility flags Next/OpenNext expects.

```ts
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";

export default Alchemy.Stack(
  "cooperm-web",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const worker = yield* Cloudflare.Worker("cooperm-web", {
      main: ".open-next/worker.js",
      bundle: false,
      assets: {
        directory: ".open-next/assets",
        config: {
          notFoundHandling: "none",
          htmlHandling: "auto-trailing-slash",
          runWorkerFirst: false,
        },
      },
      compatibility: {
        date: "2026-03-17",
        flags: [
          "nodejs_compat",
          "nodejs_compat_populate_process_env",
          "global_fetch_strictly_public",
        ],
      },
      domain: "cm.xyz",
      subdomain: { enabled: true },
    });

    return {
      url: worker.url,
    };
  }),
);
```

### AWS Lambda

Source: `https://github.com/alchemy-run/alchemy-effect/blob/main/examples/aws-lambda/alchemy.run.ts`

Use it when an AWS deploy needs function outputs to feed observability resources.

```ts
import * as Alchemy from "alchemy";
import * as AWS from "alchemy/AWS";
import * as Output from "alchemy/Output";
import * as Effect from "effect/Effect";
import JobFunction from "./src/JobFunction.ts";

// AWS.providers() already provides AWSEnvironment from the SSO profile
// named by $AWS_PROFILE (defaults to "default"). To pin a different
// profile per stage, wrap with `Layer.provide(AWS.makeEnvironment({...}))`.
const aws = AWS.providers();
const dashboardRegion = process.env.AWS_REGION ?? "us-west-2";

export default Alchemy.Stack(
  "JobLambda",
  {
    providers: aws,
    state: Alchemy.localState(),
  },
  Effect.gen(function* () {
    const func = yield* JobFunction;
    const dashboard = yield* AWS.CloudWatch.Dashboard("JobDashboard", {
      DashboardBody: func.functionName.pipe(
        Output.map((functionName) => ({
          widgets: [
            {
              type: "metric",
              x: 0,
              y: 0,
              width: 12,
              height: 6,
              properties: {
                title: "Lambda Invocations and Errors",
                region: dashboardRegion,
                stat: "Sum",
                period: 300,
                metrics: [
                  ["AWS/Lambda", "Invocations", "FunctionName", functionName],
                  ["AWS/Lambda", "Errors", "FunctionName", functionName],
                ],
              },
            },
            {
              type: "metric",
              x: 12,
              y: 0,
              width: 12,
              height: 6,
              properties: {
                title: "Lambda Duration",
                region: dashboardRegion,
                stat: "Average",
                period: 300,
                metrics: [["AWS/Lambda", "Duration", "FunctionName", functionName]],
              },
            },
          ],
        })),
      ),
    });
    const alarm = yield* AWS.CloudWatch.Alarm("JobFunctionErrorsAlarm", {
      AlarmDescription: "Alerts when the example Lambda function reports errors.",
      MetricName: "Errors",
      Namespace: "AWS/Lambda",
      Statistic: "Sum",
      Period: 300,
      EvaluationPeriods: 1,
      Threshold: 1,
      ComparisonOperator: "GreaterThanOrEqualToThreshold",
      TreatMissingData: "notBreaching",
      Dimensions: [
        {
          Name: "FunctionName",
          Value: func.functionName,
        },
      ],
    });
    return {
      url: Output.interpolate`${func.functionUrl}?jobId=foo`,
      dashboardName: dashboard.dashboardName,
      alarmName: alarm.alarmName,
    };
  }),
);
```

### Monorepo, one stack

Source: `https://github.com/alchemy-run/alchemy-effect/blob/main/examples/monorepo-single-stack/alchemy.run.ts`

Use this when backend and frontend should deploy together and frontend build-time env can consume backend outputs from the same stack.

```ts
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";
import { Path } from "effect/Path";
import Service from "./backend/src/Service.ts";

export default Alchemy.Stack(
  "Monorepo",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const backend = yield* Service;
    const path = yield* Path;

    const website = yield* Cloudflare.Vite("Website", {
      rootDir: path.resolve(import.meta.dirname, "frontend"),
      env: {
        VITE_API_URL: backend.url.as<string>(),
      },
    });
    return {
      backendUrl: backend.url.as<string>(),
      websiteUrl: website.url.as<string>(),
    };
  }),
);
```

### Monorepo, multiple stacks

Sources:

- `https://github.com/alchemy-run/alchemy-effect/blob/main/examples/monorepo-multi-stack/backend/alchemy.run.ts`
- `https://github.com/alchemy-run/alchemy-effect/blob/main/examples/monorepo-multi-stack/frontend/alchemy.run.ts`

Use this when packages deploy independently and the frontend should reference the backend stack output explicitly.

```ts
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";
import Service from "./src/Service.ts";
import { Backend } from "./src/Stack.ts";

export default Backend.make(
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const api = yield* Service;
    return {
      url: api.url.as<string>(),
    };
  }),
);
```

```ts
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { Backend } from "@monorepo-multi-stack/backend";
import * as Effect from "effect/Effect";

export default Alchemy.Stack(
  "Frontend",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    // reference the prod stage of the backend
    const backend = yield* Backend;

    const website = yield* Cloudflare.Vite("Website", {
      env: {
        VITE_API_URL: backend.url,
      },
    });

    return {
      url: website.url.as<string>(),
    };
  }),
);
```

## Adaptation checklist

- Preserve the upstream example's provider/state pairing unless the target repo has a stronger convention.
- Rename stack and logical IDs deliberately; do not preserve demo names in production.
- Replace demo secrets and fake values with repo-approved secret plumbing.
- Add stage/profile scripts for every shared environment.
- Add a `dev` script for projects where `alchemy dev` should be the standard local loop.
- Add a smoke check that consumes returned stack outputs.
- For webhook-driven apps, document which output URL should be registered with the external provider during dev or preview testing.
- Keep references as links to upstream examples so the local docs do not drift.
- For Next.js/OpenNext Workers, keep `bundle: false`, asset paths, and compatibility flags aligned with the build output generated by the target project.
