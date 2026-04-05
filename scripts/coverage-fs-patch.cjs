const fs = require("node:fs");
const path = require("node:path");

const originalReadFile = fs.promises.readFile.bind(fs.promises);
const originalWriteFile = fs.promises.writeFile.bind(fs.promises);

function isCoverageTmpPath(filePath) {
  return typeof filePath === "string" && /[/\\]coverage[/\\]\.tmp[/\\]coverage-\d+\.json$/.test(filePath);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

fs.promises.writeFile = async function patchedWriteFile(filePath, data, options) {
  if (isCoverageTmpPath(filePath)) {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  }
  return originalWriteFile(filePath, data, options);
};

fs.promises.readFile = async function patchedReadFile(filePath, options) {
  if (!isCoverageTmpPath(filePath)) {
    return originalReadFile(filePath, options);
  }
  let lastError;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      return await originalReadFile(filePath, options);
    } catch (error) {
      lastError = error;
      if (!error || error.code !== "ENOENT") {
        throw error;
      }
      await sleep(50);
    }
  }
  throw lastError;
};
