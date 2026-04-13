const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.resolve(__dirname, '../apalah');
const TARGET_DIR = path.resolve(__dirname, '../data');
const TOPICS = ['unblock game', 'roblox', 'hooda math', 'math'];
const LIMIT = 10000;

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) return true;
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

function walkSync(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  files.forEach(function(file) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      filelist = walkSync(filePath, filelist);
    } else {
      const lowerFile = file.toLowerCase();
      if (TOPICS.some(topic => lowerFile.includes(topic))) {
        filelist.push(filePath);
      }
    }
  });
  return filelist;
}

async function runFilter() {
  console.log(`🔍 Scanning articles for topics: ${TOPICS.join(', ')}...`);
  const allMatches = walkSync(SOURCE_DIR);
  console.log(`📦 Found ${allMatches.length} matching articles.`);

  // Shuffle
  console.log(`🎲 Picking ${LIMIT} random articles...`);
  const selected = allMatches.sort(() => 0.5 - Math.random()).slice(0, LIMIT);

  if (fs.existsSync(TARGET_DIR)) {
    console.log(`🗑️  Cleaning old data folder...`);
    fs.rmSync(TARGET_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TARGET_DIR);

  let count = 0;
  for (const srcPath of selected) {
    const relativePath = path.relative(SOURCE_DIR, srcPath);
    const destPath = path.join(TARGET_DIR, relativePath);
    
    ensureDirectoryExistence(destPath);
    fs.copyFileSync(srcPath, destPath);
    
    count++;
    if (count % 1000 === 0) {
      process.stdout.write(`\r✅ Copied ${count} / ${selected.length} articles...`);
    }
  }

  console.log(`\n\n✨ Done! Filtered articles are in ./data/`);
}

runFilter().catch(err => {
  console.error('Error filtering articles:', err);
  process.exit(1);
});
