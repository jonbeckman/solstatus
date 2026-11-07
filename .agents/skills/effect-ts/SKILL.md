---
name: effect-ts
description: Use this skill when setting up a repository that uses the Effect Typescript library.
---

# Step 1: Install effect

Use the users preferred package manager:

```
pnpm add effect@latest
```

If in a monorepo, install it as a dev dependency at the root, so you can access
the source code from `node_modules/effect/src`.

```
pnpm add -D effect@latest
```

# Step 2: Update AGENTS.md / CLAUDE.md

Ensure that the agent instructions contain the following:

```md
# Learning more about Effect

This repository uses the Effect Typescript library.

Before writing any Effect code, first read `node_modules/effect/AGENTS.md`
**completely**, and follow the links in the file when required.

If you need to learn more about particular Effect apis and concepts that the
guide doesn't cover, search through the source code in `node_modules/effect/src`.
```
