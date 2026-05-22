#!/usr/bin/env node
/**
 * PathoLearn Bug Agent
 *
 * Reads CI check outputs, sends them to Claude for analysis,
 * creates/updates a GitHub issue with the report, and scans
 * open user-reported issues to suggest fixes.
 */

import { readFileSync, existsSync } from 'fs';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || '';
const RUN_URL = process.env.RUN_URL || '';
const [OWNER, REPO] = GITHUB_REPOSITORY.split('/');

const MONITOR_LABEL = 'bug-monitor';
const BOT_SIGNATURE = '<!-- patholearn-bug-agent -->';
const MAX_OUTPUT_CHARS = 6000;

// ── Helpers ──────────────────────────────────────────────────────────────────

function readOutput(file) {
  if (!existsSync(file)) return '';
  return readFileSync(file, 'utf-8').trim().slice(-MAX_OUTPUT_CHARS);
}

function hasError(output) {
  return /error|FAIL|failed/i.test(output);
}

function hasWarning(output) {
  return /warning|warn/i.test(output);
}

function statusBadge(output, warnCheck = false) {
  if (hasError(output)) return '❌ Errors';
  if (warnCheck && hasWarning(output)) return '⚠️ Warnings';
  if (!output) return '⚠️ Skipped';
  return '✅ Clean';
}

async function githubFetch(path, options = {}) {
  const url = `https://api.github.com${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'PathoLearn-Bug-Agent',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status} on ${path}: ${text}`);
  }
  return res.json();
}

async function callClaude(userPrompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system:
        'You are a senior TypeScript/Next.js engineer helping maintain PathoLearn — ' +
        'an educational pathology app built with Next.js 14, TypeScript, Supabase, ' +
        'Tailwind CSS, Vitest, and Google Generative AI. Be concise and actionable.',
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

// ── Label setup ───────────────────────────────────────────────────────────────

async function ensureLabel() {
  try {
    await githubFetch(`/repos/${OWNER}/${REPO}/labels/${MONITOR_LABEL}`);
  } catch {
    await githubFetch(`/repos/${OWNER}/${REPO}/labels`, {
      method: 'POST',
      body: JSON.stringify({
        name: MONITOR_LABEL,
        color: 'd93f0b',
        description: 'Automated PathoLearn bug monitor report',
      }),
    });
  }
}

// ── Health report ─────────────────────────────────────────────────────────────

async function runHealthReport(tsc, tests, lint, build) {
  const allClean = ![tsc, tests, lint, build].some(hasError);

  const analysis = await callClaude(`
Here are the results from the PathoLearn automated health check:

## TypeScript (tsc --noEmit)
${tsc || '✓ No output (clean)'}

## Test Suite (vitest run)
${tests || '✓ No output (clean)'}

## Lint (next lint)
${lint || '✓ No output (clean)'}

## Build (next build)
${build || '✓ No output (clean)'}

Provide a structured markdown report with these sections:
1. **Summary** — one-line verdict per check (pass/fail/warning)
2. **Critical Issues** — list any errors needing immediate attention with exact file:line references
3. **Fix Suggestions** — concrete, copy-pasteable fixes for each issue (include code blocks)
4. **Priority Order** — rank fixes by impact

If everything is clean, say so briefly and suggest any proactive improvements you notice.
`);

  const now = new Date().toUTCString();
  const body = `${BOT_SIGNATURE}
# PathoLearn Automated Health Report

**Last run:** ${now}
**Workflow run:** ${RUN_URL || 'N/A'}
**Overall status:** ${allClean ? '✅ All checks passed' : '❌ Issues detected'}

---

## Check Summary

| Check | Status |
|-------|--------|
| TypeScript | ${statusBadge(tsc)} |
| Tests | ${statusBadge(tests)} |
| Lint | ${statusBadge(lint, true)} |
| Build | ${statusBadge(build)} |

---

## AI Analysis & Fix Suggestions

${analysis}

---

<details>
<summary>TypeScript output</summary>

\`\`\`
${tsc || 'Clean — no errors'}
\`\`\`
</details>

<details>
<summary>Test output</summary>

\`\`\`
${tests || 'All tests passing'}
\`\`\`
</details>

<details>
<summary>Lint output</summary>

\`\`\`
${lint || 'Clean — no issues'}
\`\`\`
</details>

<details>
<summary>Build output</summary>

\`\`\`
${build || 'Build successful'}
\`\`\`
</details>

---
*Generated by [PathoLearn Bug Agent](https://github.com/${OWNER}/${REPO}/blob/main/scripts/bug-agent.mjs)*
`;

  // Find existing monitor issue to update, or create one
  const issues = await githubFetch(
    `/repos/${OWNER}/${REPO}/issues?state=open&labels=${MONITOR_LABEL}&per_page=5`
  );
  const existing = issues.find((i) => i.body?.includes(BOT_SIGNATURE));

  const dateStr = new Date().toISOString().slice(0, 10);
  const title = `PathoLearn Health Report — ${dateStr} ${allClean ? '✅' : '❌'}`;

  if (existing) {
    await githubFetch(`/repos/${OWNER}/${REPO}/issues/${existing.number}`, {
      method: 'PATCH',
      body: JSON.stringify({ title, body }),
    });
    console.log(`Updated health report issue #${existing.number}`);
  } else {
    const created = await githubFetch(`/repos/${OWNER}/${REPO}/issues`, {
      method: 'POST',
      body: JSON.stringify({ title, body, labels: [MONITOR_LABEL] }),
    });
    console.log(`Created health report issue #${created.number}`);
  }
}

// ── User complaint analysis ───────────────────────────────────────────────────

async function analyzeUserComplaints() {
  const issues = await githubFetch(
    `/repos/${OWNER}/${REPO}/issues?state=open&per_page=20&sort=created&direction=desc`
  );

  // Skip monitor issues and PRs
  const userIssues = issues.filter(
    (i) => !i.pull_request && !i.labels.some((l) => l.name === MONITOR_LABEL)
  );

  console.log(`Found ${userIssues.length} user issue(s) to review`);

  for (const issue of userIssues.slice(0, 5)) {
    const comments = await githubFetch(
      `/repos/${OWNER}/${REPO}/issues/${issue.number}/comments`
    );
    const alreadyAnalyzed = comments.some((c) => c.body?.includes(BOT_SIGNATURE));

    if (alreadyAnalyzed) {
      console.log(`Skipping issue #${issue.number} — already analyzed`);
      continue;
    }

    console.log(`Analyzing issue #${issue.number}: ${issue.title}`);

    const suggestion = await callClaude(`
A user filed this issue against PathoLearn:

**Title:** ${issue.title}
**Body:**
${issue.body || '(no description provided)'}

Provide a helpful GitHub comment with:
1. **Root cause diagnosis** — most likely cause based on the description
2. **Fix steps** — numbered, concrete steps the developer should take
3. **Code snippet** — if a code fix applies, show it
4. **Workaround** — if available, a quick workaround for the user while the fix is deployed

Keep the tone friendly and actionable. Format as GitHub markdown.
`);

    const commentBody = `${BOT_SIGNATURE}
## PathoLearn Bug Agent Analysis

${suggestion}

---
*This analysis was generated automatically. A human will review and implement the fix.*
`;

    await githubFetch(`/repos/${OWNER}/${REPO}/issues/${issue.number}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: commentBody }),
    });

    console.log(`Commented on issue #${issue.number}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is not set');
  if (!OWNER || !REPO) throw new Error('GITHUB_REPOSITORY is not set or malformed');

  const tsc = readOutput('tsc-output.txt');
  const tests = readOutput('test-output.txt');
  const lint = readOutput('lint-output.txt');
  const build = readOutput('build-output.txt');

  await ensureLabel();
  await runHealthReport(tsc, tests, lint, build);
  await analyzeUserComplaints();

  console.log('Bug agent run complete.');
}

main().catch((err) => {
  console.error('Bug agent failed:', err.message);
  process.exit(1);
});
