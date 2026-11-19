#!/usr/bin/env bun

import { program } from "commander";
import { writeFileSync, mkdirSync, existsSync, statSync } from "fs";
import { join, resolve } from "path";

interface CreateOptions {
  root?: string;
  layout?: boolean;
  appDir?: string;
}

interface DynamicParam {
  name: string; // segment name, e.g. "slug" or "product-id"
  catchAll: boolean; // [...slug] or [[...slug]]
  optional: boolean; // [[...slug]]
}

program
  .command("create")
  .argument("<pages...>", "Pages to create, optionally followed by 'in <root>'")
  .option("-r, --root <folder>", "Root folder to create the pages in")
  .option("-l, --layout", "Also create a layout.tsx for each page")
  .option(
    "--app-dir <path>",
    "Path to the app directory (default: src/app or app)"
  )
  .description("Create Next.js pages with optional root folder")
  .action((args: string[], options: CreateOptions) => {
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

    const appDir = findAppDir(options.appDir);
    const baseDir = rootFolder ? join(appDir, rootFolder) : appDir;

    if (rootFolder && !existsSync(baseDir)) {
      // New root folder: create it with its own layout.tsx
      mkdirSync(baseDir, { recursive: true });
      createLayout(baseDir, rootFolder);
    }

    pages.forEach((pageName) => {
      const pagePath = join(baseDir, pageName);
      const routePath = rootFolder ? `${rootFolder}/${pageName}` : pageName;
      const where = rootFolder ? ` in ${rootFolder}` : "";

      // A route group's page.tsx would resolve to its parent's URL and clash
      // with the parent's page, so groups only get a layout.
      if (isRouteGroup(pageName)) {
        mkdirSync(pagePath, { recursive: true });
        if (createLayout(pagePath, pageName)) {
          console.log(`✅ Route group '${pageName}' created${where} (layout only)!`);
        } else {
          console.error(
            `❌ Route group '${pageName}' already has a layout! Skipping...`
          );
        }
        return;
      }

      if (createPage(pagePath, pageName, routePath)) {
        if (options.layout) createLayout(pagePath, pageName);
        console.log(`✅ '${pageName}' created${where}!`);
      }
    });
  });

program.parse(process.argv);

// Use --app-dir if given, otherwise src/app, then app.
function findAppDir(override?: string): string {
  const cwd = process.cwd();
  const candidates = override
    ? [resolve(cwd, override)]
    : [join(cwd, "src", "app"), join(cwd, "app")];

  const found = candidates.find(
    (dir) => existsSync(dir) && statSync(dir).isDirectory()
  );
  if (!found) {
    console.error(
      override
        ? `❌ App directory '${override}' not found.`
        : "❌ No app directory found (looked for src/app and app). " +
            "Run this from your Next.js project root or pass --app-dir."
    );
    process.exit(1);
  }
  return found;
}

// Function to create a page.tsx. Returns false if the page already exists.
// routePath is the full path inside the app directory, used to find
// dynamic segments (including ones in the root folder).
function createPage(
  pagePath: string,
  pageName: string,
  routePath: string
): boolean {
  const filePath = join(pagePath, "page.tsx");
  if (existsSync(filePath)) {
    console.error(`❌ Page '${pageName}' already exists! Skipping...`);
    return false;
  }

  mkdirSync(pagePath, { recursive: true });

  const name = componentName(pageName);
  const params = dynamicParams(routePath);

  let pageContent: string;
  if (params.length === 0) {
    pageContent = `export default function ${name}Page() {
  return <div>${pageName} page</div>;
}
`;
  } else {
    const typeFields = params
      .map(
        (p) =>
          `${propertyKey(p.name)}${p.optional ? "?" : ""}: ${
            p.catchAll ? "string[]" : "string"
          }`
      )
      .join("; ");
    const destructured = params
      .map((p) => {
        const variable = variableName(p.name);
        return variable === p.name
          ? variable
          : `${propertyKey(p.name)}: ${variable}`;
      })
      .join(", ");
    const shown = params
      .map((p) => {
        const variable = variableName(p.name);
        if (!p.catchAll) return `{${variable}}`;
        return `{${variable}${p.optional ? "?" : ""}.join("/")}`;
      })
      .join(", ");

    pageContent = `export default async function ${name}Page({
  params,
}: {
  params: Promise<{ ${typeFields} }>;
}) {
  const { ${destructured} } = await params;

  return <div>${pageName} page: ${shown}</div>;
}
`;
  }

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

  const layoutContent = `import type { ReactNode } from "react";

export default function ${componentName(folderName)}Layout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
`;
  writeFileSync(layoutPath, layoutContent);
  return true;
}

function segmentsOf(routePath: string): string[] {
  return routePath.split(/[\\/]/).filter(Boolean);
}

// "(marketing)" -> true
function isRouteGroup(routePath: string): boolean {
  const segments = segmentsOf(routePath);
  return /^\(.+\)$/.test(segments[segments.length - 1] ?? "");
}

// Collect [id], [...slug] and [[...slug]] segments from a route path.
function dynamicParams(routePath: string): DynamicParam[] {
  const params: DynamicParam[] = [];
  for (const segment of segmentsOf(routePath)) {
    const optional = segment.match(/^\[\[\.\.\.(.+)\]\]$/);
    const catchAll = segment.match(/^\[\.\.\.(.+)\]$/);
    const single = segment.match(/^\[(.+)\]$/);
    if (optional) {
      params.push({ name: optional[1]!, catchAll: true, optional: true });
    } else if (catchAll) {
      params.push({ name: catchAll[1]!, catchAll: true, optional: false });
    } else if (single) {
      params.push({ name: single[1]!, catchAll: false, optional: false });
    }
  }
  return params;
}

function isIdentifier(name: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name);
}

// Object key for a param, quoted when it isn't a valid identifier.
function propertyKey(name: string): string {
  return isIdentifier(name) ? name : JSON.stringify(name);
}

// Local variable for a param: "product-id" -> "productId".
function variableName(name: string): string {
  if (isIdentifier(name)) return name;
  const pascal = toPascalCase(name);
  if (!pascal) return "param";
  const camel = pascal.charAt(0).toLowerCase() + pascal.slice(1);
  return /^[0-9]/.test(camel) ? `_${camel}` : camel;
}

function toPascalCase(text: string): string {
  return text
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

// Turn a route path into a valid PascalCase identifier, based on its last
// segment: "my-page" -> "MyPage", "blog/[slug]" -> "Slug",
// "(marketing)" -> "Marketing", "404" -> "Route404".
function componentName(routePath: string): string {
  const segments = segmentsOf(routePath);
  const name = toPascalCase(segments[segments.length - 1] ?? "");

  if (!name) return "Route";
  return /^[0-9]/.test(name) ? `Route${name}` : name;
}

// Reject absolute paths and ".." segments so files stay inside the app dir.
function isSafePath(name: string): boolean {
  if (!name || /^([a-zA-Z]:)?[\\/]/.test(name)) return false;
  return !name.split(/[\\/]/).includes("..");
}
