// Rewrites the TOP-PROJECTS marker block in README.md with the owner's
// non-fork, non-archived public repos sorted by stars (top N).
// Runs in GitHub Actions on Node 20+ (built-in fetch). No dependencies.

import { readFile, writeFile } from "node:fs/promises";

const USER = process.env.GH_USER || "rizukirr";
const TOKEN = process.env.GITHUB_TOKEN;
const TOP_N = Number(process.env.TOP_N || 6);
const SELF = `${USER}/${USER}`.toLowerCase();

const res = await fetch(
  `https://api.github.com/users/${USER}/repos?per_page=100&type=owner`,
  {
    headers: {
      Accept: "application/vnd.github+json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
  },
);

if (!res.ok) {
  console.error(`GitHub API error: ${res.status}\n${await res.text()}`);
  process.exit(1);
}

const repos = await res.json();

const top = repos
  .filter((r) => !r.fork && !r.archived && !r.private)
  .filter((r) => r.full_name.toLowerCase() !== SELF)
  .sort((a, b) => b.stargazers_count - a.stargazers_count)
  .slice(0, TOP_N);

const rows = top.map((r) => {
  const desc = (r.description || "").replace(/\|/g, "\\|").trim();
  return `| [**${r.name}**](${r.html_url}) | ⭐ ${r.stargazers_count} | ${desc} |`;
});

const table = [
  "| Project | Stars | What it does |",
  "| --- | --- | --- |",
  ...rows,
].join("\n");

const START = "<!-- TOP-PROJECTS:START -->";
const END = "<!-- TOP-PROJECTS:END -->";

const readme = await readFile("README.md", "utf8");
const pattern = new RegExp(`${START}[\\s\\S]*?${END}`);

if (!pattern.test(readme)) {
  console.error("Could not find TOP-PROJECTS markers in README.md");
  process.exit(1);
}

const updated = readme.replace(pattern, `${START}\n${table}\n${END}`);
await writeFile("README.md", updated);
console.log("Updated Top Projects:\n" + table);
