// The backend owns the content contract for the aesthetics panel.
const fs = require("node:fs");
const path = require("node:path");
const domain = path.resolve(__dirname, "../src/domain");
for (const destination of ["../../panel/lib/website"]) {
  const target = path.resolve(__dirname, destination);
  fs.mkdirSync(target, { recursive: true });
  for (const file of ["website-defaults.json", "website-content.ts"])
    fs.copyFileSync(path.join(domain, file), path.join(target, file));
}
