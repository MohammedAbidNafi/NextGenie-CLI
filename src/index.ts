#!/usr/bin/env bun

import { program } from "commander";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const appDir = join(process.cwd(), "app");

program
  .command("create")
  .argument("<pages...>", "Pages to create, optionally followed by 'in <root>'")
  .option("-r, --root <folder>", "Root folder to create the pages in")
  .description("Create Next.js pages with optional root folder")
  .action((args: string[], options: { root?: string }) => {
    let rootFolder: string | null = options.root ?? null;
    let pages: string[] = args;

    // "page1 page2 in root": "in" only acts as the separator when it is the
    // second-to-last argument, so a page can still be named "in".
    // With --root, "in" is never treated as a keyword.
    if (
      !rootFolder &&
      args.length >= 3 &&
      args[args.length - 2]!.toLowerCase() === "in"
    ) {
      rootFolder = args[args.length - 1]!;
      pages = args.slice(0, -2);
    }

    if (pages.length === 0) {
      console.error("❌ No pages specified!");
      process.exit(1);
    }

    for (const name of rootFolder ? [rootFolder, ...pages] : pages) {
      if (!isSafePath(name)) {
        console.error(
          `❌ Invalid path '${name}'. Use relative names without '..'.`
        );
        process.exit(1);
      }
    }

    const baseDir = rootFolder ? join(appDir, rootFolder) : appDir;

    if (rootFolder && !existsSync(baseDir)) {
      // New root folder: create it with its own layout.tsx
      mkdirSync(baseDir, { recursive: true });
      createLayout(baseDir, rootFolder);
    }

    pages.forEach((pageName) => {
      const pagePath = join(baseDir, pageName);
      if (createPage(pagePath, pageName)) {
        createLayout(pagePath, pageName);
        console.log(
          rootFolder
            ? `✅ '${pageName}' created in ${rootFolder}!`
            : `✅ '${pageName}' created!`
        );
      }
    });
  });

program.parse(process.argv);

// Function to create a page.tsx. Returns false if the page already exists.
function createPage(pagePath: string, pageName: string): boolean {
  const filePath = join(pagePath, "page.tsx");
  if (existsSync(filePath)) {
    console.error(`❌ Page '${pageName}' already exists! Skipping...`);
    return false;
  }

  mkdirSync(pagePath, { recursive: true });

  const pageContent = `export default function ${componentName(pageName)}Page() {
  return <div>${pageName} page</div>;
}
`;
  writeFileSync(filePath, pageContent);
  return true;
}

// Function to create a layout.tsx. Never overwrites an existing layout.
// Returns true if a new layout was written.
function createLayout(folderPath: string, folderName: string): boolean {
  const layoutPath = join(folderPath, "layout.tsx");
  if (existsSync(layoutPath)) {
    return false;
  }

  const layoutContent = `export default function ${componentName(
    folderName
  )}Layout({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
`;
  writeFileSync(layoutPath, layoutContent);
  return true;
}

// Turn a route path into a valid PascalCase identifier, based on its last
// segment: "my-page" -> "MyPage", "blog/[slug]" -> "Slug",
// "(marketing)" -> "Marketing", "404" -> "Route404".
function componentName(routePath: string): string {
  const segments = routePath.split(/[\\/]/).filter(Boolean);
  const last = segments[segments.length - 1] ?? "";
  const name = last
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

  if (!name) return "Route";
  return /^[0-9]/.test(name) ? `Route${name}` : name;
}

// Reject absolute paths and ".." segments so files stay inside app/.
function isSafePath(name: string): boolean {
  if (!name || /^([a-zA-Z]:)?[\\/]/.test(name)) return false;
  return !name.split(/[\\/]/).includes("..");
}
