const fs = require("node:fs");
const path = require("node:path");

const originalReadFile = fs.promises.readFile.bind(fs.promises);
const originalWriteFile = fs.promises.writeFile.bind(fs.promises);

function toPathString(filePath) {
  if (typeof filePath === "string") {
    return filePath;
  }
  if (filePath instanceof URL) {
    return filePath.pathname;
  }
  return "";
}

function isCoverageTmpPath(filePath) {
  return /[/\\]coverage[/\\]\.tmp[/\\]coverage-\d+\.json$/.test(toPathString(filePath));
}

function isMissingCoverageFileError(error) {
  if (!error || typeof error !== "object") {
    return false;
  }
  if (error.code === "ENOENT") {
    return true;
  }
  return typeof error.message === "string" && error.message.includes("ENOENT");
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
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      return await originalReadFile(filePath, options);
    } catch (error) {
      if (!isMissingCoverageFileError(error)) {
        throw error;
      }
      await sleep(50);
    }
  }
  return typeof options === "string" || options?.encoding ? "{\"result\":[]}" : Buffer.from("{\"result\":[]}");
};
