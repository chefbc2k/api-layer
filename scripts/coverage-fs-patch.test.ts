import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const patchModulePath = path.resolve(__dirname, "coverage-fs-patch.cjs");
const cleanChildEnv = {
  HOME: process.env.HOME,
  PATH: process.env.PATH,
};

describe("coverage fs patch", () => {
  it("returns an empty coverage map for missing coverage tmp shards", async () => {
    const missingShard = path.join(
      path.resolve(__dirname, ".."),
      "coverage/.tmp",
      `coverage-${Date.now()}999.json`,
    );
    const { stdout } = await execFileAsync(process.execPath, [
      "--require",
      patchModulePath,
      "-e",
      `require('node:fs').promises.readFile(${JSON.stringify(missingShard)},'utf8').then((value)=>process.stdout.write(value));`,
    ], {
      cwd: path.resolve(__dirname, ".."),
      env: cleanChildEnv,
      maxBuffer: 1024 * 1024 * 4,
    });

    expect(stdout).toBe("{}");
  });

  it("passes through non-coverage reads unchanged", async () => {
    const script = `
      const fs = require('node:fs');
      const path = require('node:path');
      const filePath = path.join(process.cwd(), 'coverage-fs-patch-fixture.txt');
      fs.writeFileSync(filePath, 'plain-text');
      require(${JSON.stringify(patchModulePath)});
      fs.promises.readFile(filePath, 'utf8')
        .then((value) => process.stdout.write(value))
        .finally(() => fs.unlinkSync(filePath));
    `;
    const { stdout } = await execFileAsync(process.execPath, ["-e", script], {
      cwd: path.resolve(__dirname, ".."),
      env: cleanChildEnv,
      maxBuffer: 1024 * 1024 * 4,
    });

    expect(stdout).toBe("plain-text");
  });
});
