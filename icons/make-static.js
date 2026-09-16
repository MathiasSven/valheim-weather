// Creates non-animated copies of the Meteocons icons in icons/static/ by removing their SMIL animation tags.
// Run from the repo root with: node icons/make-static.js
const fs = require("fs");
const path = require("path");

const root = __dirname;
const sources = ["weather", "day", "wind"];

for (const dir of sources) {
    const outDir = path.join(root, "static", dir);
    fs.mkdirSync(outDir, { recursive: true });
    for (const file of fs.readdirSync(path.join(root, dir))) {
        if (!file.endsWith(".svg") || file === "arrow.svg") continue;
        const svg = fs.readFileSync(path.join(root, dir, file), "utf8")
            // Lines drawn by an animated dash offset: drop the dash pattern so the whole line shows.
            .replace(/<(\w+)([^>]*?)\sstroke-dasharray="[^"]*"([^>]*)>(\s*<animate[^>]*attributeName="stroke-dashoffset")/g, "<$1$2$3>$4")
            .replace(/<(animate|animateTransform|animateMotion|set)\b[^>]*\/>/g, "")
            .replace(/<(animate|animateTransform|animateMotion|set)\b[^>]*>[\s\S]*?<\/\1>/g, "");
        fs.writeFileSync(path.join(outDir, file), svg);
    }
}
console.log("Static icons written to", path.join(root, "static"));
