/*
 * Deploys the guide page template into all six guide subpackages.
 * Run this after editing scripts/guide-pages-template/ - audio files are
 * never touched. Usage:
 *   node scripts/sync-guide-pages.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const template = path.join(root, "scripts", "guide-pages-template");
const guidesRoot = path.join(root, "guides");

const packages = fs
  .readdirSync(guidesRoot)
  .filter((name) => fs.statSync(path.join(guidesRoot, name)).isDirectory());

for (const id of packages) {
  const pageRoot = path.join(guidesRoot, id, "pages");
  fs.mkdirSync(pageRoot, { recursive: true });
  fs.cpSync(template, pageRoot, { recursive: true });
  for (const page of ["practice/practice.js", "result/result.js"]) {
    const file = path.join(pageRoot, page);
    fs.writeFileSync(
      file,
      fs.readFileSync(file, "utf8").replace(
        /"\.\.\/\.\.\/\.\.\/(data|utils)\//g,
        '"../../../../$1/'
      )
    );
  }
  console.log("synced: " + id);
}
console.log("done (" + packages.length + " packages)");
