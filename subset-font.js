/**
 * Font Subsetting Script
 * ---------------------
 * Usage:
 *   node subset-font.js <inputFont> <outputFont> [...htmlFiles]
 */

const fs = require("fs");
const path = require("path");
const subsetFont = require("subset-font");
const { JSDOM } = require("jsdom");

/**
 * Extracts all unique characters from an HTML file's text and script content
 * @param {string} htmlFilePath - Path to HTML file
 * @returns {string} String containing all unique characters
 */
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

/**
 * Creates a subset of a font file containing only specified characters
 * @param {string} fontFilePath - Path to source font file
 * @param {string} outputFontPath - Path where subset font will be saved
 * @param {string} characters - String of characters to include in subset
 */
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

/**
 * Updates HTML file by replacing existing base64 font with new subsetted font
 * @param {string} htmlFilePath - Path to HTML file to update
 * @param {string} fontFilePath - Path to subsetted font file
 */
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

/**
 * Collects HTML files from input path(s)
 * @param {string|string[]} input - Directory path or array of file paths
 * @returns {string[]} Array of HTML file paths
 */
function getHtmlFiles(input) {
  if (Array.isArray(input)) {
    return input.filter((file) => file.endsWith(".html"));
  }

  const files = [];
  const readDir = (dir) => {
    fs.readdirSync(dir).forEach((file) => {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        readDir(fullPath);
      } else if (file.endsWith(".html")) {
        files.push(fullPath);
      }
    });
  };

  readDir(input);
  return files;
}

/**
 * Main process: handles input parsing and processes all HTML files
 * Creates font subsets and updates HTML files with optimized fonts
 * @returns {Promise<void>}
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    if (args.length < 3) {
      console.error(
        "Usage: node subset-font.js <inputFont> <outputFont> [...htmlFiles]"
      );
      process.exit(1);
    }

    const [inputFont, outputFont, ...htmlPaths] = args;

    if (!fs.existsSync(inputFont)) {
      throw new Error(`Input font not found: ${inputFont}`);
    }

    // Ensure output directory exists
    fs.mkdirSync(path.dirname(outputFont), { recursive: true });

    const allHtmlFiles = htmlPaths.flatMap((input) => {
      if (fs.statSync(input).isDirectory()) {
        return getHtmlFiles(input);
      }
      return input.endsWith(".html") ? [input] : [];
    });

    console.log(`Processing ${allHtmlFiles.length} HTML files...`);

    // Collect all unique characters from all HTML files
    const allCharacters = new Set();
    for (const file of allHtmlFiles) {
      const chars = extractUsedCharacters(file);
      [...chars].forEach((char) => allCharacters.add(char));
    }

    // Create single font subset with all characters
    console.log("Creating font subset...");
    await createFontSubset(inputFont, outputFont, [...allCharacters].join(""));

    // Update all HTML files with the same subsetted font
    for (const file of allHtmlFiles) {
      console.log(`Updating ${file}...`);
      replaceBase64FontInHTML(file, outputFont);
    }

    console.log("\nAll files processed successfully.");
  } catch (err) {
    console.error("Error in main process:", err);
    process.exit(1);
  }
}

main();
