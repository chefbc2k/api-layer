import fs from "node:fs";

export type DomainClassification =
  | "proven working"
  | "blocked by setup/state"
  | "semantically clarified but not fully proven"
  | "deeper issue remains";

export type DomainReportShape = {
  routes: string[];
  actors: string[];
  executionResult: string;
  evidence: unknown[];
  finalClassification: DomainClassification;
};

export type StructuredDomainReport<T extends DomainReportShape> = T & {
  classification: T["finalClassification"];
  result: T["finalClassification"];
};

export type VerifyReportOutput<T extends DomainReportShape> = {
  summary: string;
  totals: {
    domainCount: number;
    routeCount: number;
    evidenceCount: number;
  };
  statusCounts: Record<DomainClassification, number>;
  reports: Record<string, StructuredDomainReport<T>>;
};

export function getOutputPath(argv: string[] = process.argv): string | null {
  const index = argv.indexOf("--output");
  if (index >= 0) {
    return argv[index + 1] ?? null;
  }
  return null;
}

export function buildVerifyReportOutput<T extends DomainReportShape>(reports: Record<string, T>): VerifyReportOutput<T> {
  const structuredReports = Object.fromEntries(
    Object.entries(reports).map(([domain, report]) => [
      domain,
      {
        ...report,
        classification: report.finalClassification,
        result: report.finalClassification,
      },
    ]),
  ) as Record<string, StructuredDomainReport<T>>;

  const statusCounts: Record<DomainClassification, number> = {
    "proven working": 0,
    "blocked by setup/state": 0,
    "semantically clarified but not fully proven": 0,
    "deeper issue remains": 0,
  };

  let routeCount = 0;
  let evidenceCount = 0;
  for (const report of Object.values(structuredReports)) {
    statusCounts[report.classification] += 1;
    routeCount += report.routes.length;
    evidenceCount += report.evidence.length;
  }

  const domainCount = Object.keys(structuredReports).length;
  const summary =
    statusCounts["deeper issue remains"] > 0
      ? "deeper issues remain"
      : statusCounts["blocked by setup/state"] > 0
        ? "blocked by setup/state"
        : statusCounts["semantically clarified but not fully proven"] > 0
          ? "semantically clarified but not fully proven"
          : "proven working";

  return {
    summary,
    totals: {
      domainCount,
      routeCount,
      evidenceCount,
    },
    statusCounts,
    reports: structuredReports,
  };
}

export function writeVerifyReportOutput(outputPath: string | null, output: unknown): void {
  if (!outputPath) {
    return;
  }
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
}
