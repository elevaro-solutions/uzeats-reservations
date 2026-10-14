import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "docs/store/assets");
const chrome =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

mkdirSync(outDir, { recursive: true });

const dinerMark = readFileSync(
  join(root, "apps/mobile/assets/brand/tablevera_icon_v2.svg"),
  "utf8",
);
const inner = dinerMark
  .replace(/<\?xml[^>]*>/, "")
  .replace(/<svg[^>]*>/, "")
  .replace(/<\/svg>/, "");

function iconSvg(background, recolorForest) {
  const mark = recolorForest
    ? inner.replaceAll("#0B3D2E", "#FAF6EE").replaceAll("#0b3d2e", "#FAF6EE")
    : inner;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${background}"/>
  <svg x="192" y="148" width="640" height="728" viewBox="0 0 1198 1366">
    ${mark}
  </svg>
</svg>`;
}

function writeHtml(name, width, height, body) {
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700&display=swap" rel="stylesheet" />
  <style>
    html, body { margin: 0; padding: 0; width: ${width}px; height: ${height}px; overflow: hidden; }
    body { font-family: "DM Sans", -apple-system, sans-serif; }
  </style>
</head>
<body>${body}</body>
</html>`;
  const path = join(outDir, name);
  writeFileSync(path, html);
  return path;
}

writeFileSync(join(outDir, "diner-icon.svg"), iconSvg("#0B3D2E", true));
writeFileSync(join(outDir, "merchant-icon.svg"), iconSvg("#FAF6EE", false));

const dinerIconHtml = writeHtml(
  "diner-icon.html",
  1024,
  1024,
  `<img src="diner-icon.svg" width="1024" height="1024" alt="" />`,
);
const merchantIconHtml = writeHtml(
  "merchant-icon.html",
  1024,
  1024,
  `<img src="merchant-icon.svg" width="1024" height="1024" alt="" />`,
);

const dinerFeature = writeHtml(
  "diner-feature.html",
  1024,
  500,
  `<div style="width:1024px;height:500px;background:#0B3D2E;color:#FAF6EE;display:flex;align-items:center;justify-content:center;">
    <div style="text-align:center;padding:0 120px;">
      <div style="font-size:64px;font-weight:700;letter-spacing:-1.2px;line-height:1;">Tablevera</div>
      <div style="margin:18px auto 0;width:72px;height:3px;background:#C5A059;"></div>
      <div style="margin-top:18px;font-size:24px;font-weight:400;color:#E8D5A8;">Discover. Reserve. Dine.</div>
    </div>
  </div>`,
);

const merchantFeature = writeHtml(
  "merchant-feature.html",
  1024,
  500,
  `<div style="width:1024px;height:500px;background:#FAF6EE;color:#0B3D2E;display:flex;align-items:center;justify-content:center;">
    <div style="text-align:center;padding:0 120px;">
      <div style="font-size:18px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#8F6B2A;">For restaurants</div>
      <div style="margin-top:10px;font-size:52px;font-weight:700;letter-spacing:-1px;line-height:1;">Tablevera Partner</div>
      <div style="margin:18px auto 0;width:72px;height:3px;background:#C5A059;"></div>
      <div style="margin-top:18px;font-size:22px;font-weight:400;color:#4A463F;">Host stand in your pocket</div>
    </div>
  </div>`,
);

function shot(htmlPath, pngName, width, height) {
  const pngPath = join(outDir, pngName);
  execFileSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      `--window-size=${width},${height}`,
      `--screenshot=${pngPath}`,
      "--default-background-color=00000000",
      `file://${htmlPath}`,
    ],
    { stdio: "inherit" },
  );
}

shot(dinerIconHtml, "diner-icon-1024.png", 1024, 1024);
shot(merchantIconHtml, "merchant-icon-1024.png", 1024, 1024);
shot(dinerFeature, "diner-feature-1024x500.png", 1024, 500);
shot(merchantFeature, "merchant-feature-1024x500.png", 1024, 500);

execFileSync("sips", [
  "-z",
  "512",
  "512",
  join(outDir, "diner-icon-1024.png"),
  "--out",
  join(outDir, "diner-icon-512.png"),
]);
execFileSync("sips", [
  "-z",
  "512",
  "512",
  join(outDir, "merchant-icon-1024.png"),
  "--out",
  join(outDir, "merchant-icon-512.png"),
]);

console.log("Wrote store assets to", outDir);
