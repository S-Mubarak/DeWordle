#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const INPUT_DIR = path.resolve(__dirname, "../raw-dictionaries");
const OUTPUT_FILE = path.resolve(
  __dirname,
  "../backend/src/data/words.json",
);
const VALID_LENGTH = 5;

const PROFANITY_LIST_PATH = path.resolve(__dirname, "profanity-list.txt");

function loadProfanityList(filePath) {
  if (!fs.existsSync(filePath)) return new Set();
  const content = fs.readFileSync(filePath, "utf-8");
  return new Set(
    content
      .split("\n")
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isAlphabetic(word) {
  return /^[a-z]+$/i.test(word);
}

function processDictionary(inputDir, profanitySet) {
  const words = new Set();

  if (!fs.existsSync(inputDir)) {
    console.error(`Input directory not found: ${inputDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(inputDir).filter((f) => f.endsWith(".txt"));
  if (files.length === 0) {
    console.error(`No .txt files found in ${inputDir}`);
    process.exit(1);
  }

  for (const file of files) {
    const filePath = path.join(inputDir, file);
    const lines = fs.readFileSync(filePath, "utf-8").split("\n");

    for (const raw of lines) {
      const word = raw.trim().toLowerCase();

      if (word.length !== VALID_LENGTH) continue;
      if (!isAlphabetic(word)) continue;
      if (profanitySet.has(word)) continue;

      words.add(word);
    }
  }

  return Array.from(words).sort();
}

function main() {
  const profanitySet = loadProfanityList(PROFANITY_LIST_PATH);
  console.log(`Loaded ${profanitySet.size} profanity entries`);

  const words = processDictionary(INPUT_DIR, profanitySet);
  console.log(`Processed ${words.length} valid words`);

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(words, null, 2) + "\n");
  console.log(`Written to ${OUTPUT_FILE}`);
}

main();
