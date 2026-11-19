#!/usr/bin/env bun

import { Command } from "commander";
import {
  writeFileSync,
  mkdirSync,
  existsSync,
  statSync,
  readFileSync,
} from "fs";
import { dirname, join, relative, resolve } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Kind = "page" | "layout" | "loading" | "error" | "not-found" | "route";

interface Config {
  appDir?: string;
  templatesDir?: string;
  typescript?: boolean;
  layout?: boolean;
  metadata?: boolean;
}

interface Context {
  appDir: string;
  typescript: boolean;
  metadata: boolean;
  templatesDir: string | null;
}

interface DynamicParam {
  name: string; // segment name, e.g. "slug" or "product-id"
  catchAll: boolean; // [...slug] or [[...slug]]
  optional: boolean; // [[...slug]]
}

interface TemplateVars {
  name: string; // PascalCase component name, e.g. "MyPage"
  route: string; // route path inside the app dir, e.g. "blog/[slug]"
  title: string; // human title, e.g. "My Page"
  params: DynamicParam[];
  methods: string[]; // route handlers only
}

interface SharedOptions {
  root?: string;
  appDir?: string;
  ts?: boolean;
}

interface CreateOptions extends SharedOptions {
  layout?: boolean;
  loading?: boolean;
  error?: boolean;
  notFound?: boolean;
  metadata?: boolean;
}

interface RouteOptions extends SharedOptions {
  methods: string;
}

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const BODY_METHODS = ["POST", "PUT", "PATCH"];
const CONFIG_FILE = "nextgenie.config.json";
const DEFAULT_TEMPLATES_DIR = ".nextgenie";

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

// The package root, one level up from src/.
const PACKAGE_ROOT = fileURLToPath(new URL("..", import.meta.url));
const SKILL_FILE = join(PACKAGE_ROOT, "skills", "nextgenie", "SKILL.md");

const program = new Command();
program
  .name("nextgenie")
  .description("Generate Next.js app router pages, layouts and route handlers")
  .version(packageVersion());

function withSharedOptions(command: Command): Command {
  return command
    .option("-r, --root <folder>", "Root folder to create everything in")
    .option(
      "--app-dir <path>",
      "Path to the app directory (default: src/app or app)"
    )
    .option("--ts", "Generate TypeScript files (default: if tsconfig.json exists)")
    .option("--no-ts", "Generate JavaScript files");
}

withSharedOptions(
  program
    .command("create")
    .argument("<pages...>", "Pages to create, optionally followed by 'in <root>'")
    .description("Create Next.js pages with optional root folder")
)
  .option("-l, --layout", "Also create a layout for each page")
  .option("--no-layout", "Don't create layouts, not even for a new root folder")
  .option("--loading", "Also create loading.tsx")
  .option("--error", "Also create error.tsx")
  .option("--not-found", "Also create not-found.tsx")
  .option("--metadata", "Export page metadata (default)")
  .option("--no-metadata", "Don't export page metadata")
  .action((args: string[], options: CreateOptions) => {
    const config = loadConfig();
    const ctx = createContext(config, options, options.metadata);
    const { rootFolder, paths } = parseTargets(args, options.root);
    const baseDir = rootFolder ? join(ctx.appDir, rootFolder) : ctx.appDir;
    const pageLayouts = options.layout ?? config.layout ?? false;

    if (rootFolder && !existsSync(baseDir)) {
      // New root folder: give it a layout unless layouts are turned off.
      mkdirSync(baseDir, { recursive: true });
      if (options.layout !== false && config.layout !== false) {
        report(joinRoute(null, rootFolder), generate(ctx, baseDir, rootFolder, ["layout"]));
      }
    }

    for (const path of paths) {
      const dir = join(baseDir, path);
      const route = joinRoute(rootFolder, path);
      const kinds: Kind[] = [];

      // A route group's page would resolve to its parent's URL and clash
      // with the parent's page, so groups only get a layout.
      if (isRouteGroup(path)) {
        kinds.push("layout");
      } else {
        if (findExisting(dir, "route")) {
          console.error(
            `⚠️  '${route}' has a route handler, which can't share a folder with a page. Skipping page.`
          );
        } else {
          kinds.push("page");
        }
        if (pageLayouts) kinds.push("layout");
      }
      if (options.loading) kinds.push("loading");
      if (options.error) kinds.push("error");
      if (options.notFound) kinds.push("not-found");

      report(route, generate(ctx, dir, route, kinds));
    }
  });

withSharedOptions(
  program
    .command("route")
    .argument("<paths...>", "Route handlers to create, optionally followed by 'in <root>'")
    .description("Create Next.js route handlers (route.ts)")
)
  .option(
    "-m, --methods <methods>",
    `Comma-separated HTTP methods (${HTTP_METHODS.join(", ")})`,
    "GET,POST"
  )
  .action((args: string[], options: RouteOptions) => {
    const config = loadConfig();
    const ctx = createContext(config, options);
    const methods = parseMethods(options.methods);
    const { rootFolder, paths } = parseTargets(args, options.root);
    const baseDir = rootFolder ? join(ctx.appDir, rootFolder) : ctx.appDir;

    for (const path of paths) {
      const dir = join(baseDir, path);
      const route = joinRoute(rootFolder, path);

      if (isRouteGroup(path)) {
        console.error(
          `❌ '${route}' is a route group and can't have a route handler. Skipping...`
        );
        continue;
      }
      if (findExisting(dir, "page")) {
        console.error(
          `❌ '${route}' already has a page, which can't share a folder with a route handler. Skipping...`
        );
        continue;
      }

      report(route, generate(ctx, dir, route, ["route"], methods));
    }
  });

interface SkillOptions {
  dir?: string;
  global?: boolean;
  print?: boolean;
  force?: boolean;
}

program
  .command("skill")
  .description(
    "Install the NextGenie agent skill so AI assistants use this CLI instead of writing boilerplate"
  )
  .option("-d, --dir <path>", "Skills folder to install into (default: .claude/skills)")
  .option("-g, --global", "Install into ~/.claude/skills for all projects")
  .option("-p, --print", "Print the skill to stdout instead of installing it")
  .option("-f, --force", "Overwrite an existing copy (e.g. to update it)")
  .action((options: SkillOptions) => {
    const skill = readFileSync(SKILL_FILE, "utf8");
    if (options.print) {
      process.stdout.write(skill);
      return;
    }
    if (options.dir && options.global) fail("Use either --dir or --global, not both.");

    const skillsDir = options.dir
      ? resolve(process.cwd(), options.dir)
      : options.global
        ? join(homedir(), ".claude", "skills")
        : join(process.cwd(), ".claude", "skills");
    const target = join(skillsDir, "nextgenie", "SKILL.md");
    const shown = options.global ? target : relative(process.cwd(), target) || target;

    if (existsSync(target) && !options.force) {
      if (readFileSync(target, "utf8") === skill) {
        console.log(`✅ Skill is already up to date at ${shown}`);
        return;
      }
      console.error(
        `⚠️  ${shown} already exists and differs from this version. Use --force to overwrite it.`
      );
      process.exit(1);
    }

    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, skill);
    console.log(`✅ Installed skill to ${shown}`);
  });

program.parse(process.argv);

// ---------------------------------------------------------------------------
// Setup: config, app dir, language
// ---------------------------------------------------------------------------

function packageVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, "package.json"), "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function loadConfig(): Config {
  const path = join(process.cwd(), CONFIG_FILE);
  if (!existsSync(path)) return {};

  let config: unknown;
  try {
    config = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    fail(`Could not parse ${CONFIG_FILE}: ${(e as Error).message}`);
  }
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    fail(`${CONFIG_FILE} must contain a JSON object.`);
  }

  const c = config as Record<string, unknown>;
  for (const key of ["appDir", "templatesDir"]) {
    if (c[key] !== undefined && typeof c[key] !== "string") {
      fail(`"${key}" in ${CONFIG_FILE} must be a string.`);
    }
  }
  for (const key of ["typescript", "layout", "metadata"]) {
    if (c[key] !== undefined && typeof c[key] !== "boolean") {
      fail(`"${key}" in ${CONFIG_FILE} must be true or false.`);
    }
  }
  return c as Config;
}

// CLI flags win over the config file, which wins over detection.
function createContext(
  config: Config,
  options: SharedOptions,
  metadata?: boolean
): Context {
  return {
    appDir: findAppDir(options.appDir ?? config.appDir),
    typescript:
      options.ts ??
      config.typescript ??
      existsSync(join(process.cwd(), "tsconfig.json")),
    metadata: metadata ?? config.metadata ?? true,
    templatesDir: findTemplatesDir(config.templatesDir),
  };
}

// Use the override if given, otherwise src/app, then app.
function findAppDir(override?: string): string {
  const cwd = process.cwd();
  const candidates = override
    ? [resolve(cwd, override)]
    : [join(cwd, "src", "app"), join(cwd, "app")];

  const found = candidates.find(isDirectory);
  if (!found) {
    fail(
      override
        ? `App directory '${override}' not found.`
        : "No app directory found (looked for src/app and app). " +
            "Run this from your Next.js project root or pass --app-dir."
    );
  }
  return found;
}

function findTemplatesDir(configured?: string): string | null {
  const dir = resolve(process.cwd(), configured ?? DEFAULT_TEMPLATES_DIR);
  if (isDirectory(dir)) return dir;
  if (configured) fail(`Templates directory '${configured}' not found.`);
  return null;
}

function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

function parseTargets(
  args: string[],
  root?: string
): { rootFolder: string | null; paths: string[] } {
  let rootFolder: string | null = root ?? null;
  let paths = args;

  // "a b in root": "in" only acts as the separator when it is the
  // second-to-last argument, so a page can still be named "in".
  // With --root, "in" is never treated as a keyword.
  if (
    !rootFolder &&
    args.length >= 3 &&
    args[args.length - 2]!.toLowerCase() === "in"
  ) {
    rootFolder = args[args.length - 1]!;
    paths = args.slice(0, -2);
  }

  if (paths.length === 0) fail("Nothing to create!");

  for (const name of rootFolder ? [rootFolder, ...paths] : paths) {
    if (!isSafePath(name)) {
      fail(`Invalid path '${name}'. Use relative names without '..'.`);
    }
  }
  return { rootFolder, paths };
}

function parseMethods(list: string): string[] {
  const methods = [
    ...new Set(
      list
        .split(",")
        .map((m) => m.trim().toUpperCase())
        .filter(Boolean)
    ),
  ];
  const invalid = methods.filter((m) => !HTTP_METHODS.includes(m));
  if (methods.length === 0 || invalid.length > 0) {
    fail(
      `Invalid methods '${list}'. Use a comma-separated list of ${HTTP_METHODS.join(", ")}.`
    );
  }
  return methods;
}

// ---------------------------------------------------------------------------
// File generation
// ---------------------------------------------------------------------------

function fileName(kind: Kind, typescript: boolean): string {
  if (kind === "route") return `route.${typescript ? "ts" : "js"}`;
  return `${kind}.${typescript ? "tsx" : "jsx"}`;
}

// Returns the existing file for a kind in any language, so a page.jsx in a
// TypeScript project still counts as "already there".
function findExisting(dir: string, kind: Kind): string | null {
  for (const ext of ["tsx", "ts", "jsx", "js"]) {
    const file = `${kind}.${ext}`;
    if (existsSync(join(dir, file))) return file;
  }
  return null;
}

// Writes each requested file that doesn't exist yet. Never overwrites.
function generate(
  ctx: Context,
  dir: string,
  route: string,
  kinds: Kind[],
  methods: string[] = []
): { created: string[]; skipped: string[] } {
  const created: string[] = [];
  const skipped: string[] = [];
  const vars: TemplateVars = {
    name: componentName(route),
    route,
    title: titleOf(route),
    params: dynamicParams(route),
    methods,
  };

  mkdirSync(dir, { recursive: true });
  for (const kind of kinds) {
    const existing = findExisting(dir, kind);
    if (existing) {
      skipped.push(existing);
      continue;
    }
    const file = fileName(kind, ctx.typescript);
    writeFileSync(join(dir, file), render(kind, vars, ctx));
    created.push(file);
  }
  return { created, skipped };
}

function report(
  route: string,
  result: { created: string[]; skipped: string[] }
): void {
  if (result.created.length > 0) {
    console.log(`✅ '${route}': created ${result.created.join(", ")}`);
  }
  if (result.skipped.length > 0) {
    console.error(
      `⚠️  '${route}': ${result.skipped.join(", ")} already exist${
        result.skipped.length === 1 ? "s" : ""
      }, skipped`
    );
  }
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

function render(kind: Kind, vars: TemplateVars, ctx: Context): string {
  const custom = ctx.templatesDir && join(ctx.templatesDir, `${kind}.tpl`);
  if (custom && existsSync(custom)) {
    return fillTemplate(readFileSync(custom, "utf8"), vars, ctx);
  }

  switch (kind) {
    case "page":
      return pageTemplate(vars, ctx);
    case "layout":
      return layoutTemplate(vars, ctx);
    case "loading":
      return loadingTemplate(vars);
    case "error":
      return errorTemplate(vars, ctx);
    case "not-found":
      return notFoundTemplate(vars);
    case "route":
      return routeTemplate(vars, ctx);
  }
}

// Replaces {{name}}, {{route}}, {{title}}, {{params}}, {{paramsType}} and
// {{methods}} in a custom template. Unknown placeholders are left as they are.
function fillTemplate(
  template: string,
  vars: TemplateVars,
  ctx: Context
): string {
  const values: Record<string, string> = {
    name: vars.name,
    route: vars.route,
    title: vars.title,
    params: destructuredParams(vars.params),
    paramsType:
      ctx.typescript && vars.params.length ? paramsType(vars.params) : "",
    methods: vars.methods.join(", "),
  };
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    key in values ? values[key]! : match
  );
}

// Joins lines, dropping parts that are false/null/undefined.
function lines(...parts: (string | false | null | undefined)[]): string {
  return (
    parts.filter((p): p is string => typeof p === "string").join("\n") + "\n"
  );
}

function pageTemplate(v: TemplateVars, ctx: Context): string {
  const head = ctx.metadata
    ? lines(
        ctx.typescript && `import type { Metadata } from "next";\n`,
        `export const metadata${ctx.typescript ? ": Metadata" : ""} = {`,
        `  title: ${JSON.stringify(v.title)},`,
        `};`
      ) + "\n"
    : "";

  if (v.params.length === 0) {
    return (
      head +
      lines(
        `export default function ${v.name}Page() {`,
        `  return <div>${v.route} page</div>;`,
        `}`
      )
    );
  }

  const shown = v.params
    .map((p) => {
      const variable = variableName(p.name);
      if (!p.catchAll) return `{${variable}}`;
      return `{${variable}${p.optional ? "?" : ""}.join("/")}`;
    })
    .join(", ");

  return (
    head +
    lines(
      ctx.typescript
        ? `export default async function ${v.name}Page({\n  params,\n}: {\n  params: Promise<${paramsType(v.params)}>;\n}) {`
        : `export default async function ${v.name}Page({ params }) {`,
      `  const { ${destructuredParams(v.params)} } = await params;`,
      ``,
      `  return <div>${v.route} page: ${shown}</div>;`,
      `}`
    )
  );
}

function layoutTemplate(v: TemplateVars, ctx: Context): string {
  return lines(
    ctx.typescript && `import type { ReactNode } from "react";\n`,
    ctx.typescript
      ? `export default function ${v.name}Layout({\n  children,\n}: {\n  children: ReactNode;\n}) {`
      : `export default function ${v.name}Layout({ children }) {`,
    `  return <>{children}</>;`,
    `}`
  );
}

function loadingTemplate(v: TemplateVars): string {
  return lines(
    `export default function ${v.name}Loading() {`,
    `  return <div>Loading...</div>;`,
    `}`
  );
}

// Error boundaries must be client components.
function errorTemplate(v: TemplateVars, ctx: Context): string {
  return lines(
    `"use client";`,
    ``,
    `import { useEffect } from "react";`,
    ``,
    ctx.typescript
      ? `export default function ${v.name}Error({\n  error,\n  reset,\n}: {\n  error: Error & { digest?: string };\n  reset: () => void;\n}) {`
      : `export default function ${v.name}Error({ error, reset }) {`,
    `  useEffect(() => {`,
    `    console.error(error);`,
    `  }, [error]);`,
    ``,
    `  return (`,
    `    <div>`,
    `      <h2>Something went wrong!</h2>`,
    `      <button onClick={() => reset()}>Try again</button>`,
    `    </div>`,
    `  );`,
    `}`
  );
}

function notFoundTemplate(v: TemplateVars): string {
  return lines(
    `export default function ${v.name}NotFound() {`,
    `  return (`,
    `    <div>`,
    `      <h2>Not Found</h2>`,
    `      <p>Could not find the requested resource.</p>`,
    `    </div>`,
    `  );`,
    `}`
  );
}

function routeTemplate(v: TemplateVars, ctx: Context): string {
  const hasParams = v.params.length > 0;
  const paramVars = v.params.map((p) => variableName(p.name));
  const contextArg = ctx.typescript
    ? `{ params }: { params: Promise<${paramsType(v.params)}> }`
    : `{ params }`;

  const handlers = v.methods.map((method) => {
    const readsBody = BODY_METHODS.includes(method);
    const args: string[] = [];
    if (readsBody || hasParams) {
      const request = readsBody ? "request" : "_request";
      args.push(ctx.typescript ? `${request}: Request` : request);
    }
    if (hasParams) args.push(contextArg);

    const fields = [
      ...(method === "DELETE" ? ["deleted: true"] : []),
      ...paramVars,
      ...(readsBody ? ["body"] : []),
    ];
    const payload = fields.length
      ? `{ ${fields.join(", ")} }`
      : `{ message: ${JSON.stringify(`Hello from /${v.route}`)} }`;
    const status = method === "POST" ? ", { status: 201 }" : "";

    return lines(
      `export async function ${method}(${args.join(", ")}) {`,
      hasParams &&
        `  const { ${destructuredParams(v.params)} } = await params;`,
      readsBody && `  const body = await request.json();`,
      `  return Response.json(${payload}${status});`,
      `}`
    );
  });

  return handlers.join("\n");
}

// ---------------------------------------------------------------------------
// Route path helpers
// ---------------------------------------------------------------------------

function joinRoute(rootFolder: string | null, path: string): string {
  return segmentsOf(rootFolder ? `${rootFolder}/${path}` : path).join("/");
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

// "{ slug: string; path?: string[] }"
function paramsType(params: DynamicParam[]): string {
  const fields = params.map(
    (p) =>
      `${propertyKey(p.name)}${p.optional ? "?" : ""}: ${
        p.catchAll ? "string[]" : "string"
      }`
  );
  return `{ ${fields.join("; ")} }`;
}

// 'slug, "product-id": productId'
function destructuredParams(params: DynamicParam[]): string {
  return params
    .map((p) => {
      const variable = variableName(p.name);
      return variable === p.name
        ? variable
        : `${propertyKey(p.name)}: ${variable}`;
    })
    .join(", ");
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

function words(text: string): string[] {
  return text
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
}

function toPascalCase(text: string): string {
  return words(text).join("");
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

// Page title from the last plain segment: "blog/[slug]" -> "Blog",
// "my-page" -> "My Page".
function titleOf(routePath: string): string {
  const plain = segmentsOf(routePath).filter(
    (s) => !/^\[.+\]$/.test(s) && !/^\(.+\)$/.test(s)
  );
  const last = plain[plain.length - 1];
  const title = last ? words(last).join(" ") : "";
  return title || componentName(routePath);
}

// Reject absolute paths and ".." segments so files stay inside the app dir.
function isSafePath(name: string): boolean {
  if (!name || /^([a-zA-Z]:)?[\\/]/.test(name)) return false;
  return !name.split(/[\\/]/).includes("..");
}
