import * as fs from "fs";
import * as path from "path";

const INPUT_PATH = "external-assets";
const OUTPUT_PATH = "assets/sprites";

// NOTE: Download and extract the icons from the download links below into the
//  correct path. I'm not including them in here because (a) they're very big,
//  (b) they change often, and (c) I don't own these assets.
const PACKS = {
  ti: {
    path: "tabler-icons",
    license:
      "Sprites compiled from tabler-icons.io under MIT license. " +
      "See license at [tabler/tabler-icons]" +
      "(https://github.com/tabler/tabler-icons/blob/master/LICENSE) " +
      "for full licensing and credits.",
    downloadLink:
      "https://github.com/tabler/tabler-icons/releases/download/v2.2.0/tabler-icons-2.2.0.zip",
  },
  gi: {
    path: "game-icons",
    license:
      "Sprites compiled from game-icons.net under CC-BY-3.0 or CC0 license. " +
      "See license at [game-icons/icons]" +
      "(https://github.com/game-icons/icons/blob/master/license.txt) " +
      "for full licensing and credits.",
    downloadLink:
      "https://game-icons.net/archives/svg/zip/000000/transparent/game-icons.net.svg.zip",
  },
};

function getAllFiles(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .sort()
    .flatMap((fn) => {
      const file = path.join(dir, fn);
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) {
        return getAllFiles(file);
      } else {
        return [file];
      }
    });
}

function genSVGSymbols(pack: keyof typeof PACKS) {
  if (!fs.existsSync(OUTPUT_PATH)) {
    fs.mkdirSync(OUTPUT_PATH);
  }

  const inputFiles = getAllFiles(path.join(INPUT_PATH, PACKS[pack].path));
  const outputFile = path.join(OUTPUT_PATH, pack + ".svg");
  const manifest: Record<string, string[]> = {};

  let contents = inputFiles
    .filter((file) => /\.svg$/i.test(file))
    .map((file) => {
      let contents = fs.readFileSync(file).toString();

      // Add to manifest
      let name = path
        .basename(file, ".svg")
        .toLowerCase()
        .trim()
        .replace(/[^\w]/g, "-");
      if (file.includes("badge") && !name.includes("badge")) {
        // Badges are special in game-icons!
        name = "badge-" + name;
      }
      manifest[name] = [...(manifest[name] || []), file];
      if (manifest[name].length > 1) {
        // Fix names of duplicate assets in the same manifest
        name = `${name}-${manifest[name].length}`;
        manifest[name] = [...(manifest[name] || []), file];
      }

      // Clean up the contents
      contents = contents
        // Remove all line breaks
        .replace(/(\r|\n)+/gim, "")
        // Remove svg args that we define in stylesheet instead
        .replace(/(xmlns|class|fill|stroke)(-\w+)?="[^">]*"/gi, "")
        // Remove all properties other than viewBox from svg tag
        .replace(/<svg\b[^>]*?(viewbox="[^">]*")[^>]*>/gi, "<svg $1>")
        // tabler-icons likes to emit a box around the icons
        .replace(/d="M0 0h24v24H0z"/gi, "")
        // game-icons likes to emit a circle around the badges
        .replace(/cx="128" cy="128" r="(128|101)"/gi, "")
        // Remove empty tags
        .replace(/<\s*\w+\s*\/>/g, "")
        // Remove extra spaces
        .replace(/(\s)\s+/g, " ")
        // Remove anything between tags
        .replace(/>[^<]+</g, "><")
        // Remove extra padding spaces at beginning of tag
        .replace(/<\s+/g, "<")
        // Remove extra padding spaces at end of tag
        .replace(/\s+(\/?>)/g, "$1");

      // Transform
      contents = contents
        // Turn normal svg into a symbol definition
        .replace(/\bsvg\b/gi, "symbol")
        // Inject the id of the sprite
        .replace(/<symbol\b/gi, `<symbol id="${name}"`);

      return contents;
    });

  // Add header and license information to output
  contents = [
    '<svg xmlns="http://www.w3.org/2000/svg">',
    `<!-- ${PACKS[pack].license} -->`,
    "<defs>",
    ...contents.sort(),
    "</defs>",
    "</svg>",
  ];

  // Write output
  fs.writeFileSync(outputFile, contents.join(""));
  console.log(
    "Generated",
    outputFile,
    "using",
    contents.length,
    "sprites from",
    PACKS[pack].path,
  );
}

let pack: keyof typeof PACKS;
for (pack in PACKS) {
  genSVGSymbols(pack);
}
