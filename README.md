<div align="center">

# boaclaw

**BOA setup for Claude Code & Factory**

Connect [Claude Code](https://docs.anthropic.com/en/docs/claude-code) and [Factory AI Droid](https://app.factory.ai) to [Bay of Assets](https://bayofassets.com) — access Claude, Gemini, and GPT models with a single API key.

[![npm version](https://img.shields.io/npm/v/boaclaw?color=cb3837&label=npm&logo=npm&logoColor=white)](https://www.npmjs.com/package/boaclaw)
[![node](https://img.shields.io/node/v/boaclaw?color=339933&logo=node.js&logoColor=white)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/boaclaw?color=blue)](./LICENSE)
[![platform](https://img.shields.io/badge/platform-windows%20%7C%20macos%20%7C%20linux-lightgrey)](https://www.npmjs.com/package/boaclaw)

</div>

---

## What You Get

| Provider | Models |
|:---------|:-------|
| **Claude** | Sonnet 4.6, Opus 4.6 Thinking, Haiku 4.5 |
| **Gemini** | 3.1 Pro, 3 Flash |
| **GPT** | 5.1, 5.1 Codex, 5.1 Codex Max, 5.2, 5.2 Codex, 5.3 Codex |

> All 11 models through one BOA API key. No separate accounts needed.

---

## Quick Start

### Prerequisites

| # | What | How |
|:-:|:-----|:----|
| 1 | **Node.js 18+** | [nodejs.org](https://nodejs.org) |
| 2 | **BOA API key** | [bayofassets.com](https://bayofassets.com) |
| 3 | **Factory AI** *(optional)* | See [Install Factory AI](#install-factory-ai-optional) below |

### Install Node.js (first-time users)

If you don't have Node.js installed:

**Windows:**
```powershell
winget install OpenJS.NodeJS.LTS
```

**macOS:**
```bash
brew install node
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Or download directly from [nodejs.org](https://nodejs.org). Verify with:

```bash
node -v   # should show v18+
npm -v    # should show v9+
```

### Install & Configure

```bash
npx boaclaw@latest
```

That's it. It will prompt for your API key and configure everything in one shot:

```
  boaclaw — BOA setup for Claude Code & Factory
  ───────────────────────────────────────────────

  Enter your BOA API key: █
```

Or pass the key directly:

```bash
npx boaclaw@latest <your-boa-api-key>
```

Want the `boaclaw` command available globally for future use?

```bash
npm i -g boaclaw
boaclaw <your-boa-api-key>
```

### What it does

- ✔ Backs up your Factory config to `~/.boaclaw/backup.json`
- ✔ Adds all 11 models to Factory AI Droid
- ✔ Sets env vars **system-wide** (all users) — falls back to current user if no admin rights
- ✔ Works on Windows, macOS, and Linux

### Restore Original Settings

Want to undo everything?

```bash
boaclaw --restore
```

This removes all env vars boaclaw set and restores your original Factory config from the backup.

---

## Using Claude Code

### 1. Install Claude Code

```bash
npm i -g @anthropic-ai/claude-code
```

### 2. Restart Your Terminal

> **Important:** Environment variables are set persistently, but your current shell won't see them until you restart it.
>
> - **New terminal** — picks up automatically
> - **Current terminal** — run `source ~/.zshrc` or `source ~/.bashrc`
> - **VS Code / GUI apps** — restart the app or log out & back in

### 3. Launch

```bash
claude
```

Claude Code now routes all requests through Bay of Assets using your API key.

---

## Install Factory AI *(Optional)*

If you also want custom models inside Factory AI Droid:

**Windows (PowerShell):**
```powershell
irm https://app.factory.ai/cli/windows | iex
```

**macOS / Linux:**
```bash
curl -fsSL https://app.factory.ai/cli | sh
```

Then create an account at [app.factory.ai](https://app.factory.ai), run `droid` once to generate `~/.factory/settings.json`, then run `boaclaw` — it will detect the Factory config and inject all 11 models automatically.

---

## Environment Variables Set

| Variable | Value |
|:---------|:------|
| `ANTHROPIC_BASE_URL` | `https://api.bayofassets.com/` |
| `ANTHROPIC_AUTH_TOKEN` | *your BOA API key* |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | `claude-haiku-4-5-20251001` |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | `claude-sonnet-4-6-20250929` |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | `claude-opus-4-6-thinking` |

<details>
<summary><b>Where are they stored?</b></summary>

| OS | Location |
|:---|:---------|
| **Windows** | `HKLM\...\Environment` (system) or `HKCU\Environment` (user) |
| **macOS** | `~/.bashrc` and `~/.zshrc` (or `/etc/zshenv` with admin) |
| **Linux** | `~/.bashrc` and `~/.zshrc` (or `/etc/environment` with admin) |

</details>

---

## Models Reference

| Model | Provider | Endpoint |
|:------|:---------|:---------|
| `claude-sonnet-4-6-20250929` | Anthropic | `https://api.bayofassets.com/` |
| `claude-opus-4-6-thinking` | Anthropic | `https://api.bayofassets.com/` |
| `claude-haiku-4-5-20251001` | Anthropic | `https://api.bayofassets.com/` |
| `gemini-3.1-pro` | OpenAI-compat | `https://api.bayofassets.com/v1` |
| `gemini-3-flash` | OpenAI-compat | `https://api.bayofassets.com/v1` |
| `gpt-5.1` | OpenAI-compat | `https://api.bayofassets.com/v1` |
| `gpt-5.1-codex` | OpenAI-compat | `https://api.bayofassets.com/v1` |
| `gpt-5.1-codex-max` | OpenAI-compat | `https://api.bayofassets.com/v1` |
| `gpt-5.2` | OpenAI-compat | `https://api.bayofassets.com/v1` |
| `gpt-5.2-codex` | OpenAI-compat | `https://api.bayofassets.com/v1` |
| `gpt-5.3-codex` | OpenAI-compat | `https://api.bayofassets.com/v1` |

---

## FAQ

<details>
<summary><b>Can I run it again with a different API key?</b></summary>

Yes. Just run `npx boaclaw@latest <new-key>` or `boaclaw <new-key>` again — it updates existing models and env vars without creating duplicates. A fresh backup is saved before every run.

</details>

<details>
<summary><b>How do I restore my original settings?</b></summary>

```bash
boaclaw --restore
```

This removes all env vars and restores your original Factory config from `~/.boaclaw/backup.json`.

</details>

<details>
<summary><b>Do I need an Anthropic account?</b></summary>

No. Claude Code routes through Bay of Assets — you only need a BOA API key.

</details>

<details>
<summary><b>What if Factory AI isn't installed?</b></summary>

`boaclaw` detects whether `~/.factory/settings.json` exists. If not, it skips Factory setup and only configures Claude Code env vars.

</details>

<details>
<summary><b>How do I uninstall?</b></summary>

```bash
boaclaw --restore
npm uninstall -g boaclaw
```

</details>

---

## License

MIT
