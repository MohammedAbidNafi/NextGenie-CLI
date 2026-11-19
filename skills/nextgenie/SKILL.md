---
name: nextgenie
description: Scaffold Next.js App Router files (page, layout, loading, error, not-found, route handlers) with the nextgenie CLI instead of writing the boilerplate by hand. Use when adding pages, layouts, dynamic routes ([id], [...slug]), route groups or API route handlers to a Next.js app directory.
---

# NextGenie

Create App Router files with one `nextgenie` command instead of writing them yourself. Then edit only what the task needs. The CLI prints every file it wrote, so you don't need to read them back to find out.

## Running it

Run it from the project root (the folder with `package.json`). If `nextgenie` isn't installed, use `npx nextgenie-cli` with the same arguments. Either way, Bun must be installed.

Put several paths in one command instead of running it once per route.

## Commands

```bash
nextgenie create about contact                  # app/about/page.tsx, app/contact/page.tsx
nextgenie create profile settings in dashboard  # pages in dashboard/, plus dashboard/layout.tsx if new
nextgenie create profile --root dashboard       # same as "in", but "in" is never a keyword
nextgenie create settings --layout              # page + layout
nextgenie create dashboard --loading --error --not-found  # extra files; works on existing pages
nextgenie create "blog/[slug]" "docs/[...path]" "shop/[[...filters]]"  # typed async params
nextgenie create "(marketing)"                  # route group: layout only
nextgenie create about pricing in "(marketing)" # pages inside a group
nextgenie route api/users "api/users/[id]"      # route.ts with GET,POST
nextgenie route api/upload -m post,put          # pick methods: GET POST PUT PATCH DELETE
```

Options for both commands: `--app-dir <path>` (default `src/app`, then `app`), `--ts` / `--no-ts` (default: TypeScript if `tsconfig.json` exists).
Options for `create` only: `--no-layout` (no layout even for a new root folder), `--no-metadata`.

## Rules

- Quote any path with `[ ]` or `( )`, or the shell may expand it.
- Existing files are never overwritten. A line with `⚠️` or ending in `Skipping...` means nothing was written there: the file already exists, or a page and a route would share a folder (not allowed). Edit the existing file instead.
- Exit code 1 means a bad argument (a missing app dir, `..` in a path, an unknown method). Fix it and run again.
- If the project has a `nextgenie.config.json` or `.nextgenie/*.tpl` templates, they set its defaults and boilerplate. Don't pass flags that override them unless the user asks.

## What you get

These are placeholders, so replace their bodies with the real UI or logic:

- **page**: `export const metadata = { title: "<Title from path>" }` (unless `--no-metadata`) and `export default function <Name>Page()`, which returns `<div><route> page</div>`. A dynamic route gets an `async` page with `params: Promise<{ ... }>` already awaited and destructured.
- **layout**: `<Name>Layout({ children })` returns `<>{children}</>`.
- **loading** / **not-found**: a simple message. **error**: a `"use client"` component with `error` and `reset`, as Next.js requires.
- **route**: one `export async function GET/POST/...` per method, with `params` awaited. POST, PUT and PATCH read `await request.json()`, and each handler returns `Response.json(...)`.

Component names come from the last path segment: `my-page` → `MyPagePage`, `[slug]` → `SlugPage`, `404` → `Route404Page`.

Don't use NextGenie for components, hooks or other files outside the routing conventions above. Write those yourself.
