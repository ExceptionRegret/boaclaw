#!/usr/bin/env node

import { join } from "path";
import { homedir } from "os";
import { writeFileSync, mkdirSync } from "fs";

const markerDir = join(homedir(), ".boaclaw");
const markerFile = join(markerDir, "pending");

try {
  mkdirSync(markerDir, { recursive: true });
  writeFileSync(markerFile, "1", "utf-8");
} catch {}

const apiKey = process.env.BOA_API_KEY;
if (apiKey) {
  await import("./boaclaw.js");
  process.exit(0);
}

const w = (msg = "") => process.stdout.write(msg + "\n");

w();
w("  \x1b[1mboaclaw\x1b[0m \u2014 BOA setup for Claude Code & Factory");
w("  \x1b[2m\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\x1b[0m");
w();
w("  \x1b[32m\u2714 Installed!\x1b[0m Now run:");
w();
w("     \x1b[36mboaclaw\x1b[0m \x1b[33m<your-boa-api-key>\x1b[0m");
w();
