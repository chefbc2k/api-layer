const ts = require("typescript");
const path = require("node:path");

const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
const entrypoint = path.resolve("app.ts");
const program = ts.createProgram([entrypoint], {
  ...parsed.options, declaration: true, declarationMap: false, noEmit: true,
});
const diagnostics = [
  ...parsed.errors,
  ...program.getOptionsDiagnostics(),
  ...program.getSyntacticDiagnostics(),
  ...program.getSemanticDiagnostics(),
  ...program.getDeclarationDiagnostics(program.getSourceFile(entrypoint)),
];
// Vercel/ts-node strips declaration/composite settings before resolving extends.
// Validate its effective runtime options and actual emit, not only tsc --noEmit.
const nativeConfig = structuredClone(config.config);
nativeConfig.files = ["app.ts"];
nativeConfig.include = [];
nativeConfig.references = [];
nativeConfig.compilerOptions = {
  ...nativeConfig.compilerOptions, sourceMap: true, inlineSourceMap: false,
  inlineSources: true, declaration: false, noEmit: false, outDir: "$$ts-node$$",
};
for (const key of ["out", "outFile", "composite", "declarationDir", "declarationMap",
  "emitDeclarationOnly", "tsBuildInfoFile", "incremental"]) {
  delete nativeConfig.compilerOptions[key];
}
const nativeParsed = ts.parseJsonConfigFileContent(nativeConfig, ts.sys, process.cwd());
const nativeProgram = ts.createProgram([entrypoint], nativeParsed.options);
const emitted = nativeProgram.emit(nativeProgram.getSourceFile(entrypoint), () => {});
diagnostics.push(...nativeParsed.errors, ...ts.getPreEmitDiagnostics(nativeProgram), ...emitted.diagnostics);
if (emitted.emitSkipped && !diagnostics.length) throw new Error("Vercel entrypoint emit skipped");
if (diagnostics.length) {
  process.stderr.write(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: () => process.cwd(), getCanonicalFileName: value => value, getNewLine: () => "\n",
  }));
  process.exit(1);
}
console.log("Vercel entrypoint semantic/declaration diagnostics and native runtime emit passed");
