const fs = require("fs");
const path = require("path");
const fontkit = require("fontkit");
const { JSDOM } = require("jsdom");

// Paths
const htmlFilePath = path.join(__dirname, "index.html");
const fontFilePath = path.join(
  __dirname,
  "assets/fira-code/FiraCode-Light.otf"
); // Original font file
const outputFontPath = path.join(
  __dirname,
  "assets/fira-code/FiraCode-Light-Subset.otf"
);

// Step 1: Extract all characters used in the HTML file
function extractUsedCharacters(htmlFilePath) {
  const htmlContent = fs.readFileSync(htmlFilePath, "utf-8");
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;

  // Extract text content from all elements
  const textContent = document.body.textContent || "";

  // Extract characters from inline JavaScript
  const scriptContent = Array.from(document.querySelectorAll("script"))
    .map((script) => script.textContent)
    .join("");

  // Combine and deduplicate characters
  const allCharacters = new Set([...textContent, ...scriptContent]);
  return Array.from(allCharacters).join("");
}

// Step 2: Subset the font using fontkit
function subsetFont(fontFilePath, outputFontPath, characters) {
  const font = fontkit.openSync(fontFilePath);
  const subset = font.createSubset();

  // Include glyphs for each character
  for (const char of characters) {
    try {
      const glyph = font.glyphForCodePoint(char.codePointAt(0));
      if (glyph) {
        subset.includeGlyph(glyph);
      }
    } catch (err) {
      console.warn(
        `Warning: Could not include glyph for character "${char}"`,
        err.message
      );
    }
  }

  // Encode the subset and write to file synchronously
  try {
    const data = subset.encode();
    fs.writeFileSync(outputFontPath, data);
    console.log(`Subsetted font saved to: ${outputFontPath}`);
  } catch (err) {
    console.error("Error encoding or writing subsetted font:", err);
    throw err;
  }
}

// Step 3: Replace Base64 font string in HTML
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

// Main function
function main() {
  console.log("Extracting used characters...");
  const usedCharacters = extractUsedCharacters(htmlFilePath);
  console.log(`Characters found: ${usedCharacters}`);

  console.log("Subsetting font...");
  subsetFont(fontFilePath, outputFontPath, usedCharacters);

  console.log("Replacing Base64 font in HTML...");
  replaceBase64FontInHTML(htmlFilePath, outputFontPath);

  console.log("Font subsetting and HTML update completed.");
}

main();
