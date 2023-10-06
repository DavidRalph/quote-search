const fs = require("fs/promises");
const csv = require("async-csv");
const NLP = require("./public/nlp.js");

const WINDOW_SIZE = 5;

main().catch(console.error);

async function main() {
  // ATLA
  await makeDataset("atla", (t) => ({
    line: t.Character ? t.script : `[${t.script}]`,
    speaker: t.Character || "Narrator",
    season: t.Book,
    no_in_season: t.ep_number,
    no_in_show: t.total_number,
  }));
  await makeDataset(
    "atla",
    (t) => ({
      line: t.Character ? t.script : `[${t.script}]`,
      speaker: t.Character || "Narrator",
      season: t.Book,
      no_in_season: t.ep_number,
      no_in_show: t.total_number,
    }),
    true,
  );
  // ATLK
  await makeDataset("atlk", (t) => ({
    line: t.Character ? t.script : `[${t.script}]`,
    speaker: t.Character || "Narrator",
    season: t.Book,
    no_in_season: t.ep_number,
    no_in_show: t.total_number,
  }));
  await makeDataset(
    "atlk",
    (t) => ({
      line: t.Character ? t.script : `[${t.script}]`,
      speaker: t.Character || "Narrator",
      season: t.Book,
      no_in_season: t.ep_number,
      no_in_show: t.total_number,
    }),
    true,
  );
}

async function makeDataset(name, mapFunction, dialogueOnly = false) {
  const infoPath = "data_raw/" + name + "/info.json";
  const dataPath = "data_raw/" + name + "/dataset.csv";

  const ds = await readJSON(infoPath);

  let targets = (await readCSV(dataPath)).map(mapFunction);

  if (dialogueOnly) {
    name = name + "_dialogue";
    targets = targets.map((t) => {
      t.line = t.line.replace(/\[.*\]/, "").trim();
      return t;
    });
    targets = targets.filter((t) => t.line && t.speaker !== "Narrator");
  }

  // Accumulate preceding lines for context
  let episode = targets[0].no_in_show;
  for (let i = WINDOW_SIZE - 1; i < targets.length; i++) {
    const target = targets[i];
    // Skip forward by WINDOW_SIZE if we're in a new episode
    if (target.no_in_show !== episode) {
      episode = target.no_in_show;
      i += WINDOW_SIZE - 1;
      continue;
    }
    const start = i - (WINDOW_SIZE - 1);
    const context = targets.slice(start, i + 1);
    target.text = context.map((c) => `${c.speaker}: ${c.line}`).join("\n");
    target.line_numbers = [];
    for (let j = i - WINDOW_SIZE + 1; j <= i; j++) {
      target.line_numbers.push(j);
    }
  }

  targets = targets.filter((t) => t.text);

  await NLP.embedObjects(targets, "text");
  ds.targets = targets;

  await writeJS("public/data/" + name + ".js", name, ds);
}

async function readCSV(filePath) {
  try {
    console.log(`Reading CSV file ${filePath}...`);
    const csvString = await fs.readFile(filePath, "utf-8");
    const rows = await csv.parse(csvString, { columns: true });
    return rows;
  } catch (error) {
    console.error("Error reading CSV file:", error);
    throw error;
  }
}

async function readJSON(filePath) {
  try {
    console.log(`Reading JSON file ${filePath}...`);
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading the JSON file:", error);
  }
}

async function writeJS(filePath, variableName, data) {
  try {
    console.log(`Writing client-side JS readable JSON file ${filePath}...`);
    const text = `var ${variableName} = ` + JSON.stringify(data);
    await fs.writeFile(filePath, text);
  } catch (error) {
    console.error("Error writing file:", error);
  }
}
