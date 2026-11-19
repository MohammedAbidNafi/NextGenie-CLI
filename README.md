[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![GNU License][license-shield]][license-url]

# NextGenie 🧞‍♂️

**Scaffold Next.js App Router routes with one command, and let your AI assistant do the same for a fraction of the tokens.**

NextGenie creates pages, layouts, loading/error/not-found files and route handlers with correct, typed boilerplate. It ships with an [agent skill](#-use-with-ai-assistants), so Claude Code and other assistants run one short command instead of writing every file by hand.

## Why NextGenie?

- 💸 **Cheaper AI sessions.** Your assistant writes a one-line command instead of hundreds of characters of boilerplate per route, so you pay for the code that matters.
- ⚡ **Faster.** One command creates a whole route section, with no wait while a model types out each file.
- ✅ **Correct every time.** Async typed `params`, `"use client"` error boundaries, and route groups that don't clash with parent pages. Boilerplate that a model can get subtly wrong comes out right.
- 🧩 **Your conventions.** Custom templates and a config file mean people and AI generate the same code.

### Measured, not guessed

What the AI types compared with what it would otherwise write (characters, measured with the built-in TypeScript templates):

| Command the AI runs | Files | AI types | Generated code | Smaller by |
| --- | --- | --- | --- | --- |
| `nextgenie create about contact pricing` | 3 | 38 | 519 | **14×** |
| `nextgenie create "blog/[slug]" --loading --error --not-found` | 4 | 58 | 876 | **15×** |
| `nextgenie route "api/posts/[id]" -m get,put,patch,delete` | 1 | 54 | 751 | **14×** |
| `nextgenie create profile settings billing in dashboard --loading --error` | 10 | 72 | 2,063 | **29×** |

The real saving is bigger than this table shows. It leaves out the overhead of a separate file-write call per file, and the assistant doesn't need to read the files back, because NextGenie prints what it created.

## Installation

NPM
```bash
npm install -g nextgenie-cli
```
Yarn
```bash
yarn global add nextgenie-cli
```
PNPM
```bash
pnpm add -g nextgenie-cli
```
Bun
```bash
bun install -g nextgenie-cli
```

<details>
<summary>Install from GitHub Packages instead</summary>

NextGenie is also published to GitHub Packages as `@mohammedabidnafi/nextgenie-cli`. GitHub requires you to sign in, even for public packages. Add this to your `~/.npmrc`, using a [personal access token](https://github.com/settings/tokens) with the `read:packages` scope:

```
@mohammedabidnafi:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_TOKEN
```

Then install it:

```bash
npm install -g @mohammedabidnafi/nextgenie-cli
```

</details>

Then let your AI assistant use it too (run this in your Next.js project):

```bash
nextgenie skill
```

## Features

- 🚀 Quickly generate Next.js pages, layouts and route handlers
- 📁 Create nested page structures with a single command
- 🎯 Typed params for dynamic routes, route groups, loading/error/not-found files
- 🧩 Custom templates and a config file to match your project
- 🤖 Agent skill so AI assistants use NextGenie instead of writing boilerplate
- ⚡️ Simple and intuitive syntax

## Usage

### Creating Simple Pages

Create single or multiple pages directly in your app directory:

```bash
nextgenie create about contact
```

This will generate:

```
app/
  ├─ about/
  │   └─ page.tsx
  └─ contact/
      └─ page.tsx
```

NextGenie uses `src/app` if it exists, otherwise `app`. Run it from your project root, or point it somewhere else with `--app-dir <path>`.

### Adding Layouts

Pages don't get a layout by default. Pass `--layout` (or `-l`) to add one to each page:

```bash
nextgenie create settings --layout
```

### Creating Nested Pages

Create pages inside a specific folder using the `in` keyword:

```bash
nextgenie create profile settings in dashboard
```

This will generate:

```
app/
  └─ dashboard/
      ├─ layout.tsx
      ├─ profile/
      │   └─ page.tsx
      └─ settings/
          └─ page.tsx
```

The root folder gets a `layout.tsx` when NextGenie creates it. An existing folder is left as it is.

You can also pass the root folder with `--root` (or `-r`):

```bash
nextgenie create profile settings --root dashboard
```

`in` only acts as the keyword when it is the second-to-last argument, so you can still create a page called `in` (e.g. `nextgenie create in about`). With `--root`, `in` is always treated as a page name.

### Dynamic Routes

Dynamic segments anywhere in the path, including the root folder, become typed `params`:

```bash
nextgenie create "blog/[slug]" "docs/[...path]" "shop/[[...filters]]"
nextgenie create edit in "posts/[id]"
```

| Segment | Param type |
| --- | --- |
| `[slug]` | `string` |
| `[...path]` | `string[]` |
| `[[...filters]]` | `string[]` (optional) |

Quote paths with brackets or parentheses so your shell doesn't expand them.

### Route Groups

A route group's `page.tsx` would map to its parent's URL and clash with the parent page, so a group like `(marketing)` only gets a `layout.tsx`. Add pages inside it with `nextgenie create about pricing in "(marketing)"`.

### Component Names

Component names are generated from the last segment of the path and are always valid identifiers:

| Path | Component |
| --- | --- |
| `my-page` | `MyPagePage` |
| `blog/[slug]` | `SlugPage` |
| `(marketing)` | `MarketingLayout` |
| `404` | `Route404Page` |

### Loading, Error and Not Found Files

Add the other app router files with flags. They also work on pages that already exist, and existing files are never overwritten:

```bash
nextgenie create dashboard --loading --error --not-found
```

`error.tsx` is generated as a client component (`"use client"`), as Next.js requires.

### Route Handlers

Create API route handlers with the `route` command. It takes the same `in <root>`, `--root` and `--app-dir` options as `create`:

```bash
nextgenie route api/users "api/users/[id]"
nextgenie route api/upload --methods post,put
```

`--methods` (or `-m`) accepts `GET`, `POST`, `PUT`, `PATCH` and `DELETE` and defaults to `GET,POST`. A folder can't have both a `page` and a `route`, so NextGenie skips either one when the other is already there.

### JavaScript Projects

NextGenie writes `.tsx`/`.ts` files when your project has a `tsconfig.json`, and `.jsx`/`.js` files without types otherwise. Override this with `--ts` or `--no-ts`.

### Metadata

Pages export a `metadata` object with a title built from the path (`my-page` → `My Page`). Turn it off with `--no-metadata`.

## 🤖 Use with AI Assistants

Without NextGenie, an assistant asked to "add a blog with post pages and an API" writes every `page.tsx`, `layout.tsx` and `route.ts` itself, token by token. With the NextGenie [agent skill](skills/nextgenie/SKILL.md) installed, it runs one command and then spends its tokens on the parts that are specific to your app.

The skill teaches the assistant to:

- run `nextgenie` for any App Router route file, putting several routes in one command
- read NextGenie's one-line output instead of opening the generated files
- handle skipped files and errors without retrying blindly
- respect your `nextgenie.config.json` and custom templates

The skill costs very little to keep around. Assistants that support skills, such as Claude Code, keep only its one-line description in context and load the full instructions (about 900 tokens) when they create routes.

Install it into your project:

```bash
nextgenie skill
```

This writes `.claude/skills/nextgenie/SKILL.md`, which Claude Code picks up automatically. Other options:

| Command | What it does |
| --- | --- |
| `nextgenie skill --global` | Install for all your projects (`~/.claude/skills`) |
| `nextgenie skill --dir .agents/skills` | Install into another tool's skills folder |
| `nextgenie skill --print` | Print the skill, e.g. to paste into `AGENTS.md` or your editor's rules file |
| `nextgenie skill --force` | Overwrite an older copy after upgrading NextGenie |

Commit the installed skill so everyone on your team (and their assistants) gets it.

## Configuration

Put a `nextgenie.config.json` in your project root to change the defaults. Every key is optional, and CLI flags win over the file:

```json
{
  "appDir": "src/app",
  "templatesDir": ".nextgenie",
  "typescript": true,
  "layout": false,
  "metadata": true
}
```

| Key | Default | Meaning |
| --- | --- | --- |
| `appDir` | `src/app`, then `app` | Where your app directory is |
| `templatesDir` | `.nextgenie` | Folder with your custom templates |
| `typescript` | `true` if `tsconfig.json` exists | Write TypeScript or JavaScript |
| `layout` | `false` | Add a layout to every page (`--layout`) |
| `metadata` | `true` | Export `metadata` from pages |

### Custom Templates

To use your own boilerplate, add any of these files to `.nextgenie/` (or your `templatesDir`): `page.tpl`, `layout.tpl`, `loading.tpl`, `error.tpl`, `not-found.tpl`, `route.tpl`. Files you don't add fall back to the built-in templates. The `.tpl` extension keeps your type-checker and linter from reading them.

Templates can use these placeholders:

| Placeholder | Example for `blog/[slug]` |
| --- | --- |
| `{{name}}` | `Slug` |
| `{{route}}` | `blog/[slug]` |
| `{{title}}` | `Blog` |
| `{{params}}` | `slug` |
| `{{paramsType}}` | `{ slug: string }` (empty in JavaScript or without params) |
| `{{methods}}` | `GET, POST` (route handlers only) |

For example, `.nextgenie/page.tpl`:

```tsx
export const metadata = { title: "{{title}} | My Site" };

export default function {{name}}Page() {
  return <main className="container">{{title}}</main>;
}
```

## Generated Files

### page.tsx

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return <div>about page</div>;
}
```

For a dynamic route such as `blog/[slug]`:

```tsx
export default async function SlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <div>blog/[slug] page: {slug}</div>;
}
```

### layout.tsx

```tsx
import type { ReactNode } from "react";

export default function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
```

### route.ts

For `nextgenie route "api/users/[id]" -m get,post`:

```ts
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return Response.json({ id });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  return Response.json({ id, body }, { status: 201 });
}
```

## Requirements

- [Bun](https://bun.sh) installed (NextGenie runs on Bun, even when you install it with npm, Yarn or pnpm)
- Next.js 15+ (App Directory). Dynamic route pages use the async `params` API.

## License
This project is licensed under GPL-3.0 [View License](LICENSE)

## Authors
<a href="https://github.com/MohammedAbidNafi/Next-Genie/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=MohammedAbidNafi/Next-Genie" alt="contrib.rocks image" />
</a>

## Contributing

[View CONTRIBUTING.md](CONTRIBUTING.md)


[contributors-shield]: https://img.shields.io/github/contributors/MohammedAbidNafi/Next-Genie.svg?style=for-the-badge
[contributors-url]: https://github.com/MohammedAbidNafi/Next-Genie/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/MohammedAbidNafi/Next-Genie.svg?style=for-the-badge
[forks-url]: https://github.com/MohammedAbidNafi/Next-Genie/network/members
[stars-shield]: https://img.shields.io/github/stars/MohammedAbidNafi/Next-Genie.svg?style=for-the-badge
[stars-url]: https://github.com/MohammedAbidNafi/Next-Genie/stargazers
[issues-shield]: https://img.shields.io/github/issues/MohammedAbidNafi/Next-Genie.svg?style=for-the-badge
[issues-url]: https://github.com/MohammedAbidNafi/Next-Genie/issues
[license-shield]: https://img.shields.io/github/license/MohammedAbidNafi/Next-Genie.svg?style=for-the-badge
[license-url]: https://github.com/MohammedAbidNafi/Next-Genie/blob/master/LICENSE.txt
