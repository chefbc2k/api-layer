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
if (diagnostics.length) {
  process.stderr.write(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: () => process.cwd(), getCanonicalFileName: value => value, getNewLine: () => "\n",
  }));
  process.exit(1);
}
console.log("Vercel entrypoint semantic and declaration diagnostics passed");
