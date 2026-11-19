[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![GNU License][license-shield]][license-url]

# NextGenie 🧞‍♂️

A magical CLI tool to quickly generate Next.js app directory pages and layouts.

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

## Use with AI Assistants

NextGenie comes with an [agent skill](skills/nextgenie/SKILL.md) that tells AI coding assistants to run `nextgenie` instead of writing route boilerplate themselves. That way the assistant spends tokens on your actual code, and generated files follow your config and templates.

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

- Node.js 16 or higher
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
