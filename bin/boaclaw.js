#!/usr/bin/env node

/**
 * boaclaw — BOA setup for Claude Code & Factory
 *
 * Usage:
 *   boaclaw <API_KEY>        — setup with key
 *   boaclaw                  — interactive prompt
 *   boaclaw --restore        — remove all vars & restore Factory config
 */

import { readFileSync, writeFileSync, copyFileSync, appendFileSync, existsSync, rmSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir, platform } from "os";
import { execSync } from "child_process";
import { createInterface } from "readline";

// ─── Helpers ─────────────────────────────────────────────────────────

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stderr, terminal: true });
  return new Promise((resolve) =>
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); })
  );
}

const out  = (msg = "") => process.stdout.write(msg + "\n");
const err  = (msg = "") => process.stderr.write(msg + "\n");
const log  = (msg) => err(`\x1b[36m>\x1b[0m ${msg}`);
const ok   = (msg) => err(`\x1b[32m✔\x1b[0m ${msg}`);
const warn = (msg) => err(`\x1b[33m!\x1b[0m ${msg}`);
const fail = (msg) => err(`\x1b[31m✖\x1b[0m ${msg}`);

const OS          = platform();
const HOME        = homedir();
const BACKUP_DIR  = join(HOME, ".boaclaw");
const MARKER_FILE = join(BACKUP_DIR, "pending");
const BACKUP_FILE = join(BACKUP_DIR, "backup.json");

const BASE_URL = "https://api.bayofassets.com/";

const VAR_KEYS = [
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL",
  "ANTHROPIC_DEFAULT_SONNET_MODEL",
  "ANTHROPIC_DEFAULT_OPUS_MODEL",
];

// ─── Banner ──────────────────────────────────────────────────────────

out("");
out("\x1b[1m  boaclaw\x1b[0m \u2014 BOA setup for Claude Code & Factory");
out("  \x1b[2m\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\x1b[0m");
out("");

// ─── Arg parsing ─────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const restore = args.includes("--restore");
const keyArg  = args.find(a => !a.startsWith("-") && a.length > 8);
const apiKey  = !restore ? (process.env.BOA_API_KEY || keyArg) : null;

// ─── First-run detection ──────────────────────────────────────────────

const isNpx      = (process.env.npm_execpath || "").includes("npx") || process.argv[1].includes("_npx");
const isFirstRun = !isNpx && existsSync(MARKER_FILE);

// ════════════════════════════════════════════════════════════════════
// RESTORE MODE
// ════════════════════════════════════════════════════════════════════

if (restore) {
  log("Removing boaclaw environment variables...");

  if (OS === "win32") {
    // Use PowerShell's [Environment]::SetEnvironmentVariable with $null to delete.
    // This broadcasts WM_SETTINGCHANGE so new processes from Explorer see the change
    // immediately (unlike `reg delete`, which silently updates the registry only).
    const psLines = [];
    for (const key of VAR_KEYS) {
      psLines.push(
        `try { [Environment]::SetEnvironmentVariable('${key}', $null, 'Machine') } catch {}`,
        `try { [Environment]::SetEnvironmentVariable('${key}', $null, 'User') } catch {}`
      );
    }
    // Verify what's left and emit per-key status as JSON we can parse.
    psLines.push(
      `$keys = @(${VAR_KEYS.map(k => `'${k}'`).join(",")})`,
      `$result = @{}`,
      `foreach ($k in $keys) {`,
      `  $m = [Environment]::GetEnvironmentVariable($k, 'Machine')`,
      `  $u = [Environment]::GetEnvironmentVariable($k, 'User')`,
      `  $result[$k] = if ($null -eq $m -and $null -eq $u) { 'removed' } else { 'present' }`,
      `}`,
      `$result | ConvertTo-Json -Compress`
    );
    let statuses = {};
    try {
      const output = execSync(
        `powershell -NoProfile -ExecutionPolicy Bypass -Command "${psLines.join("; ").replace(/"/g, '\\"')}"`,
        { stdio: ["ignore", "pipe", "ignore"] }
      ).toString().trim();
      statuses = JSON.parse(output);
    } catch (e) {
      fail("Failed to invoke PowerShell to remove env vars: " + e.message);
      process.exit(1);
    }
    for (const key of VAR_KEYS) {
      if (statuses[key] === "removed") ok(`Removed ${key}`);
      else warn(`Could not fully remove ${key} (still present in registry — may need admin rights)`);
    }
    // Also clear from the current Node process so chained commands see the update.
    for (const key of VAR_KEYS) delete process.env[key];
  } else {
    const marker    = "# --- BOA / Claude Code env ---";
    const endMarker = "# --- end BOA ---";
    const rcFiles   = ["/etc/environment", "/etc/zshenv", "/etc/bash.bashrc",
                       join(HOME, ".bashrc"), join(HOME, ".zshrc")];
    for (const rc of rcFiles) {
      if (!existsSync(rc)) continue;
      const content = readFileSync(rc, "utf-8");
      if (!content.includes(marker)) continue;
      const regex = new RegExp(
        `\\n?${marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${endMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n?`, "g"
      );
      writeFileSync(rc, content.replace(regex, ""), "utf-8");
      ok(`Cleaned ${rc}`);
    }
  }

  // Restore Factory settings from backup if available
  const factoryPath = join(HOME, ".factory", "settings.json");
  if (existsSync(BACKUP_FILE)) {
    const backup = JSON.parse(readFileSync(BACKUP_FILE, "utf-8"));
    if (backup.factory && existsSync(factoryPath)) {
      log("Restoring Factory settings...");
      writeFileSync(factoryPath, JSON.stringify(backup.factory, null, 2), "utf-8");
      ok("Factory settings restored.");
    }
  } else {
    warn("No backup found — env vars removed, Factory settings unchanged.");
  }

  try { rmSync(BACKUP_FILE); } catch {}

  out("");
  ok("Restore complete.");
  if (OS === "win32") {
    warn("Your CURRENT terminal still shows the old variables (Windows caches");
    warn("each process's environment at launch). Close it and open a new one,");
    warn("or run this in the current shell to clear them now:");
    out("");
    for (const k of VAR_KEYS) out(`    set ${k}=`);
    out("");
    try {
      execSync(`start "" cmd /k echo boaclaw: fresh terminal - env vars cleared.`, { stdio: "ignore" });
      ok("Opened a fresh cmd window for you.");
    } catch {}
  } else {
    warn("Open a new terminal (or `source ~/.bashrc` / `source ~/.zshrc`) to apply changes.");
  }
  out("");
  process.exit(0);
}

// ════════════════════════════════════════════════════════════════════
// SETUP MODE
// ════════════════════════════════════════════════════════════════════

if (!apiKey && isFirstRun) {
  out("  \x1b[33m\u26a1 Setup required!\x1b[0m Run with your BOA API key:");
  out("");
  out("     \x1b[36mboaclaw\x1b[0m \x1b[33m<your-api-key>\x1b[0m");
  out("");
  out("  Get your key at \x1b[4mhttps://bayofassets.com\x1b[0m");
  out("");
  process.exit(0);
}

let key = apiKey;
if (!key) {
  try { key = await ask("  Enter your BOA API key: "); }
  catch (e) { fail(e.message); process.exit(1); }
}
if (!key) { fail("API key cannot be empty."); process.exit(1); }

err("");

// ─── Backup Factory config ────────────────────────────────────────────

mkdirSync(BACKUP_DIR, { recursive: true });

const backup = { factory: null };
const factoryPath = join(HOME, ".factory", "settings.json");

if (existsSync(factoryPath)) {
  let raw = readFileSync(factoryPath, "utf-8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  backup.factory = JSON.parse(raw.trim() || "{}");
}

writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2), "utf-8");
ok(`Backup saved to ${BACKUP_FILE}`);

// ─── Step 1: Add models to Factory ──────────────────────────────────

if (existsSync(factoryPath)) {
  log("Adding models to Factory...");

  copyFileSync(factoryPath, `${factoryPath}.backup`);

  let raw = readFileSync(factoryPath, "utf-8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const settings = JSON.parse(raw.trim() || "{}");

  const newModels = [
    { model: "claude-sonnet-4-6-thinking", baseUrl: BASE_URL,        provider: "anthropic" },
    { model: "claude-opus-4-6-thinking",   baseUrl: BASE_URL,        provider: "anthropic" },
    { model: "claude-haiku-4-5",           baseUrl: BASE_URL,        provider: "anthropic" },
    { model: "gemini-3.1-pro",             baseUrl: BASE_URL + "v1", provider: "openai"    },
    { model: "gemini-3-flash",             baseUrl: BASE_URL + "v1", provider: "openai"    },
    { model: "gpt-5.4",                    baseUrl: BASE_URL + "v1", provider: "openai"    },
    { model: "gpt-5.3-codex",              baseUrl: BASE_URL + "v1", provider: "openai"    },
    { model: "gpt-5.2",                    baseUrl: BASE_URL + "v1", provider: "openai"    },
    { model: "gpt-5.2-codex",              baseUrl: BASE_URL + "v1", provider: "openai"    },
    { model: "gpt-5.1",                    baseUrl: BASE_URL + "v1", provider: "openai"    },
    { model: "gpt-5.1-codex",              baseUrl: BASE_URL + "v1", provider: "openai"    },
    { model: "gpt-5.1-codex-max",          baseUrl: BASE_URL + "v1", provider: "openai"    },
  ];

  const existing      = settings.customModels || [];
  const existingNames = new Set(existing.map((m) => m.model));
  let maxIndex        = existing.reduce((max, m) => Math.max(max, m.index ?? -1), -1);
  let nextIndex       = maxIndex + 1;
  let added = 0, updated = 0;

  for (const m of newModels) {
    if (existingNames.has(m.model)) {
      for (const e of existing) {
        if (e.model === m.model) { e.apiKey = key; e.baseUrl = m.baseUrl; e.provider = m.provider; }
      }
      updated++;
    } else {
      existing.push({ model: m.model, id: `custom:${m.model}-${nextIndex}`, index: nextIndex,
        baseUrl: m.baseUrl, apiKey: key, displayName: m.model, noImageSupport: false, provider: m.provider });
      nextIndex++; added++;
    }
  }

  settings.customModels = existing;
  writeFileSync(factoryPath, JSON.stringify(settings, null, 2), "utf-8");
  ok(`Factory: ${added} added, ${updated} updated (${existing.length} total)`);
} else {
  warn("Factory settings not found — skipped.");
}

// ─── Step 2: Set env vars (system-wide, fallback to user) ─────────────

log("Setting environment variables system-wide...");

const vars = {
  ANTHROPIC_BASE_URL:             BASE_URL,
  ANTHROPIC_AUTH_TOKEN:           key,
  ANTHROPIC_DEFAULT_HAIKU_MODEL:  "claude-haiku-4-5",
  ANTHROPIC_DEFAULT_SONNET_MODEL: "claude-sonnet-4-6-20250929",
  ANTHROPIC_DEFAULT_OPUS_MODEL:   "claude-opus-4-6-thinking",
};

if (OS === "win32") {
  // Use PowerShell's [Environment]::SetEnvironmentVariable so WM_SETTINGCHANGE
  // is broadcast — new terminals launched from Explorer pick up the vars
  // without requiring a logoff. `reg add` alone does not do this.
  const psEscape = (s) => String(s).replace(/'/g, "''");
  const buildPs = (scope) =>
    Object.entries(vars)
      .map(([k, v]) => `[Environment]::SetEnvironmentVariable('${k}', '${psEscape(v)}', '${scope}')`)
      .join("; ");

  const runPs = (script) => {
    execSync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "${script.replace(/"/g, '\\"')}"`,
      { stdio: ["ignore", "ignore", "pipe"] }
    );
  };

  try {
    runPs(buildPs("Machine"));
    ok("Env vars written system-wide (Machine scope \u2014 all users).");
  } catch {
    warn("No admin rights \u2014 setting for current user only (User scope).");
    try {
      runPs(buildPs("User"));
      ok("Env vars written to User scope.");
    } catch (e) {
      fail("Failed to write env vars via PowerShell: " + e.message);
      process.exit(1);
    }
  }
  // Propagate to current Node process as well.
  for (const [k, v] of Object.entries(vars)) process.env[k] = v;
} else {
  const marker    = "# --- BOA / Claude Code env ---";
  const endMarker = "# --- end BOA ---";
  const block     = ["", marker, ...Object.entries(vars).map(([k, v]) => `export ${k}="${v}"`), endMarker, ""].join("\n");

  const systemFiles = OS === "darwin"
    ? ["/etc/zshenv", "/etc/bashrc"]
    : ["/etc/environment", "/etc/bash.bashrc", "/etc/zshenv"];
  const userFiles = [join(HOME, ".bashrc"), join(HOME, ".zshrc")];

  const writeToRc = (rc) => {
    if (!existsSync(rc)) return false;
    const content = readFileSync(rc, "utf-8");
    if (content.includes(marker)) {
      const regex = new RegExp(
        `\\n?${marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${endMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n?`, "g"
      );
      writeFileSync(rc, content.replace(regex, block), "utf-8");
    } else {
      appendFileSync(rc, block, "utf-8");
    }
    return true;
  };

  let written = [];
  let systemOk = false;
  for (const rc of systemFiles) {
    try { if (writeToRc(rc)) { written.push(rc); systemOk = true; } } catch {}
  }

  if (systemOk) {
    ok(`Env vars written system-wide: ${written.join(", ")}`);
  } else {
    warn("No write access to system files \u2014 writing to user profile.");
    for (const rc of userFiles) { if (writeToRc(rc)) written.push(rc); }
    if (written.length === 0) { appendFileSync(join(HOME, ".bashrc"), block, "utf-8"); written.push(join(HOME, ".bashrc")); }
    ok(`Env vars written to: ${written.join(", ")}`);
  }
}

// ─── Done ────────────────────────────────────────────────────────────

try { rmSync(MARKER_FILE); } catch {}

out("");
out("  \x1b[1mEnvironment variables set:\x1b[0m");
for (const [k, v] of Object.entries(vars)) {
  const display = k === "ANTHROPIC_AUTH_TOKEN" ? v.slice(0, 8) + "..." : v;
  out(`    ${k} = ${display}`);
}
out("");
ok("All done!");
if (OS === "win32") {
  warn("Your CURRENT terminal will NOT see the new variables (Windows caches");
  warn("each process's environment at launch). Open a fresh terminal — any new");
  warn("cmd/PowerShell launched from Explorer will have the vars set.");
  try {
    execSync(`start "" cmd /k echo boaclaw: fresh terminal ready - launch Claude Code here.`, { stdio: "ignore" });
    ok("Opened a fresh cmd window for you.");
  } catch {}
} else {
  out("  Open a new terminal (or source your rc file), then launch Claude Code.");
}
out("");
out("  \x1b[2mTo undo: boaclaw --restore\x1b[0m");
out("");
