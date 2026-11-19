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

- 🚀 Quickly generate Next.js pages and layouts
- 📁 Create nested page structures with a single command
- 🎯 Automatic layout.tsx generation
- ⚡️ Simple and intuitive syntax
- 🔥 Built with TypeScript for reliability

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

## Generated Files

### page.tsx

```tsx
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
