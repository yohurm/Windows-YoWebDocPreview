#!/usr/bin/env node
/**
 * UI 依赖纪律门禁（ADR-W12）：
 *
 * 1. 模块（packages/modules/*）禁止依赖 @yohu/workbench、其它模块、@tauri-apps/*；
 *    只允许 @yohu/api + @yohu/ui + solid-js + 渲染库。
 * 2. @yohu/ui 与 @yohu/workbench 之外的包禁止直接依赖 @tauri-apps/*
 *    （Tauri 直连只允许在 @yohu/api 与 apps/shell 内）。
 * 3. @yohu/workbench 禁止依赖 @tauri-apps/* 与 @yohu/module-*。
 *
 * 用法：node scripts/check-ui-deps.mjs [ui-dir]   （默认仓库 ui/）
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { isAbsolute, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";

/** 本脚本所在目录（scripts/）。 */
function scriptDir() {
  return fileURLToPath(new URL(".", import.meta.url));
}

/** ui 工作区根：绝对路径原样，相对路径相对脚本目录解析。 */
function resolveRoot(p) {
  return normalize(isAbsolute(p) ? p : join(scriptDir(), "..", p));
}

const root = process.argv[2] ? resolveRoot(process.argv[2]) : resolveRoot("ui");

function isDir(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** 模块禁止的依赖前缀（含子路径）。 */
const FORBIDDEN_MODULE = [/^@yohu\/workbench(\/|$)/, /^@yohu\/module-/, /^@tauri-apps\//];
/** Tauri 直连只允许这两个包。 */
const FORBIDDEN_TAOUI_OWNER = new Set(["@yohu/api", "@yohu/shell"]);

function packages() {
  const out = [];
  for (const dir of ["packages", "apps"]) {
    const base = join(root, dir);
    if (!isDir(base)) continue;
    walk(base, out);
  }
  return out;
}

function walk(base, out) {
  for (const name of readdirSync(base)) {
    if (name === "node_modules") continue;
    const dir = join(base, name);
    if (!isDir(dir)) continue;
    const pkgJson = join(dir, "package.json");
    try {
      const pkg = JSON.parse(readFileSync(pkgJson, "utf8"));
      out.push({ pkg, dir });
    } catch {
      walk(dir, out); // packages/modules 这类中间层
    }
  }
}

function sourceSpecifiers(pkg) {
  const specs = new Map(); // specifier -> first import location
  const src = join(pkg.dir, "src");
  if (!isDir(src)) return specs;
  const visit = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (isDir(p)) {
        visit(p);
        continue;
      }
      if (!/\.(ts|tsx|js|jsx|mjs|css)$/.test(name)) continue;
      const text = readFileSync(p, "utf8");
      const re = /(?:from\s+|import\s*\(\s*|import\s+|require\(\s*)(["'])([^"']+)\1/g;
      let m;
      while ((m = re.exec(text))) {
        const spec = m[2];
        if (!spec.startsWith(".") && !specs.has(spec)) {
          specs.set(spec, relative(root, p));
        }
      }
    }
  };
  visit(src);
  return specs;
}

const failures = [];

for (const { pkg, dir } of packages()) {
  const rel = relative(root, dir);
  const deps = new Map();
  for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
    for (const [name, v] of Object.entries(pkg[section] ?? {})) {
      if (!deps.has(name)) deps.set(name, section);
    }
  }
  for (const [spec, at] of sourceSpecifiers({ pkg, dir })) {
    if (!deps.has(spec)) deps.set(spec, `import @ ${at}`);
  }

  for (const [name, origin] of deps) {
    const isModulePkg = /^packages\/modules\//.test(rel);

    if (isModulePkg && FORBIDDEN_MODULE.some((f) => f.test(name))) {
      failures.push(
        `模块 ${rel} 禁止依赖 ${name}（来源：${origin}）；模块只允许 @yohu/api + @yohu/ui`,
      );
      continue;
    }
    if (name.startsWith("@tauri-apps/") && !FORBIDDEN_TAOUI_OWNER.has(pkg.name)) {
      failures.push(
        `${pkg.name}（${rel}）禁止直接依赖 ${name}（来源：${origin}）；Tauri 直连只在 @yohu/api 与 @yohu/shell`,
      );
    }
    if (pkg.name === "@yohu/workbench" && /^@yohu\/module-/.test(name)) {
      failures.push(`${pkg.name}（${rel}）禁止依赖模块包 ${name}（来源：${origin}）`);
    }
    if (pkg.name === "@yohu/ui" && /^@yohu\//.test(name)) {
      failures.push(`${pkg.name}（${rel}）禁止依赖其它 yohu 包 ${name}（来源：${origin}）`);
    }
  }
}

if (failures.length > 0) {
  for (const f of failures) console.error(`× ${f}`);
  console.error(`\ncheck-ui-deps: ${failures.length} 处违规`);
  process.exit(1);
}

console.log("check-ui-deps: 依赖纪律通过");
