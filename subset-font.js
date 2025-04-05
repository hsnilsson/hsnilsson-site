const fs = require("fs");
const path = require("path");
const subsetFont = require("subset-font");
const { JSDOM } = require("jsdom");

const htmlFilePath = path.join(__dirname, "index.html");
const fontFilePath = path.join(
  __dirname,
  "assets/fira-code/firacode-light-webfont.woff2"
);
const outputFontPath = path.join(
  __dirname,
  "assets/fira-code/firacode-light-webfont-subset.woff2"
);

function extractUsedCharacters(htmlFilePath) {
  const htmlContent = fs.readFileSync(htmlFilePath, "utf-8");
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;

  const textContent = document.body.textContent || "";
  const scriptContent = Array.from(document.querySelectorAll("script"))
    .map((script) => script.textContent)
    .join("");

  return Array.from(new Set([...textContent, ...scriptContent])).join("");
}

async function createFontSubset(fontFilePath, outputFontPath, characters) {
  try {
    const fontBuffer = fs.readFileSync(fontFilePath);
    const subset = await subsetFont(fontBuffer, characters, {
      targetFormat: "woff2",
    });

    fs.writeFileSync(outputFontPath, subset);
    console.log(`Subsetted font saved to: ${outputFontPath}`);
  } catch (err) {
    console.error("Error creating font subset:", err);
    throw err;
  }
}

function replaceBase64FontInHTML(htmlFilePath, fontFilePath) {
  const htmlContent = fs.readFileSync(htmlFilePath, "utf-8");
  const fontData = fs.readFileSync(fontFilePath);
  const base64Font = fontData.toString("base64");

  const updatedHTML = htmlContent.replace(
    /url\(data:application\/font-woff2;charset=utf-8;base64,[^)]*\)/,
    `url(data:application/font-woff2;charset=utf-8;base64,${base64Font})`
  );

  fs.writeFileSync(htmlFilePath, updatedHTML, "utf-8");
}

async function main() {
  try {
    console.log("Extracting used characters...");
    const usedCharacters = extractUsedCharacters(htmlFilePath);
    console.log(`Characters found: ${usedCharacters}`);

    console.log("Subsetting font...");
    await createFontSubset(fontFilePath, outputFontPath, usedCharacters);

    console.log("Replacing Base64 font in HTML...");
    replaceBase64FontInHTML(htmlFilePath, outputFontPath);

    console.log("Font subsetting and HTML update completed.");
  } catch (err) {
    console.error("Error in main process:", err);
  }
}

main();
