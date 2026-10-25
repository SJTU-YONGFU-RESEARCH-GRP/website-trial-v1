import type {
  ReportBlock,
  ReportEntry,
  ReportLine,
  ReportLineKind,
  ReportPlot,
  ReportSection,
  ReportStatus,
  ReportStructure,
  ReportSubSection,
  ReportTable,
} from "../../compat/spiceWorkflow/contracts";

const SUMMARY_KEYS = {
  dc: "dc",
  transient: "transient",
  ac: "ac",
  noise: "noise",
} as const;

type SummaryKey = keyof typeof SUMMARY_KEYS;

function stripHeadingNumber(value: string): string {
  return value.replace(/^\d+\.\s*/, "").trim();
}

function stripMarkdownLink(value: string): string {
  return value.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
}

function stripInlineMarkup(value: string): string {
  return stripMarkdownLink(value)
    .replace(/<\/?span\b[^>]*>/gi, "")
    .replace(/^\[|\]$/g, "")
    .replace(/^`|`$/g, "")
    .trim();
}

export function parseReportStatus(value: string): ReportStatus {
  if (/>\s*✓\s*</.test(value) || /(?:^|\s)✓(?:\s|$)/.test(value)) return "pass";
  if (/>\s*✗\s*</.test(value) || /(?:^|\s)✗(?:\s|$)/.test(value)) {
    return /color\s*:\s*(?:gray|grey)/i.test(value) || /in progress/i.test(value)
      ? "in-progress"
      : "fail";
  }
  if (/(?:^|\s)○(?:\s|$)/.test(value) || /in progress/i.test(value)) return "in-progress";
  return "unavailable";
}

function parseCheck(raw: string, lineNumber: number): ReportEntry {
  const status = parseReportStatus(raw);
  const withoutBullet = raw.replace(/^\s*-\s*/, "");
  const withoutStatus = withoutBullet
    .replace(/^\[\s*<span\b[^>]*>\s*[✓✗○]\s*<\/span>\s*\]\s*/i, "")
    .replace(/^<span\b[^>]*>\s*[✓✗○]\s*<\/span>\s*/i, "")
    .trim();
  const findingMatch = withoutStatus.match(/:\s*\*([^*]+)\*\s*$/);
  const testType = findingMatch
    ? withoutStatus.slice(0, findingMatch.index).trim()
    : withoutStatus;

  return {
    testType: stripInlineMarkup(testType),
    status,
    keyFindings: findingMatch?.[1]?.trim() ?? null,
    details: [],
    raw,
    lineNumber,
  };
}

function parseTableRow(raw: string): string[] {
  const trimmed = raw.trim();
  return trimmed
    .slice(trimmed.startsWith("|") ? 1 : 0, trimmed.endsWith("|") ? -1 : undefined)
    .split("|")
    .map((cell) => cell.trim());
}

function isTableSeparator(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function tableToEntries(table: ReportTable): ReportEntry[] {
  const statusColumn = table.headers.findIndex((header) => header.toLowerCase() === "status");
  const findingsColumn = table.headers.findIndex((header) => /key findings?/i.test(header));
  return table.rows.map((row, index) => ({
    testType: stripMarkdownLink(row[0] ?? ""),
    status: statusColumn >= 0 ? parseReportStatus(row[statusColumn] ?? "") : "unavailable",
    keyFindings: findingsColumn >= 0 && row[findingsColumn] ? row[findingsColumn] : null,
    details: [],
    raw: table.rawLines[index + 2] ?? "",
    lineNumber: table.startLine + index + 2,
  }));
}

function summaryKey(title: string): SummaryKey | null {
  const lower = title.toLowerCase();
  if (lower.includes("transient")) return "transient";
  if (lower.includes("noise")) return "noise";
  if (lower.includes("dc")) return "dc";
  if (lower.includes("ac")) return "ac";
  return null;
}

function imageFromLine(raw: string, lineNumber: number): ReportPlot | null {
  const html = raw.match(
    /<img\b[^>]*\bsrc=(['"])(.*?)\1[^>]*?(?:\balt=(['"])(.*?)\3)?[^>]*?(?:\bwidth=(['"])(.*?)\5)?[^>]*\/?>/i,
  );
  if (html) {
    const altMatch = raw.match(/\balt=(['"])(.*?)\1/i);
    const widthMatch = raw.match(/\bwidth=(['"])(.*?)\1/i);
    return {
      src: html[2],
      alt: altMatch?.[2] ?? "",
      width: widthMatch?.[2] ?? null,
      caption: null,
      raw,
      lineNumber,
    };
  }
  const markdown = raw.match(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/);
  if (!markdown) return null;
  return {
    src: markdown[2],
    alt: markdown[1],
    width: null,
    caption: null,
    raw,
    lineNumber,
  };
}

function lineKind(raw: string): ReportLineKind {
  if (raw.trim() === "") return "blank";
  if (/^#{1,6}\s+/.test(raw)) return "heading";
  if (/^Generated on:\s*/i.test(raw)) return "generated-at";
  if (/^\s*<!--.*-->\s*$/.test(raw)) return "comment";
  if (imageFromLine(raw, 0)) return "image";
  if (/^\s*\|.*\|\s*$/.test(raw)) return "table";
  if (/^\s*-\s*(?:\[?\s*<span\b[^>]*>[✓✗○]<\/span>)/i.test(raw)) return "check";
  if (/^\s*-\s+/.test(raw)) return "bullet";
  if (/^\s*\d+\.\s+/.test(raw)) return "ordered-list";
  return "paragraph";
}

function makeBlock(
  kind: ReportBlock["kind"],
  raw: string,
  lineNumber: number,
  values: Partial<ReportBlock> = {},
): ReportBlock {
  return { kind, raw, lineNumber, ...values };
}

/**
 * Parse a benchmark REPORT.md without discarding source text.
 *
 * `rawMarkdown` and `lines` form a lossless representation, while the remaining
 * fields are a display-oriented index of checks, metrics, tables and plots.
 */
export function parseReportMD(md: string, modelId: string, simulator: string): ReportStructure {
  const rawMarkdown = md.replace(/\r\n?/g, "\n");
  const rawLines = rawMarkdown.split("\n");
  const lines: ReportLine[] = rawLines.map((raw, index) => {
    const kind = lineKind(raw);
    const indent = raw.match(/^(\s*)/)?.[1].length ?? 0;
    return {
      lineNumber: index + 1,
      raw,
      kind,
      text: raw.trim() || undefined,
      depth: kind === "bullet" || kind === "ordered-list" ? indent : undefined,
      status: kind === "check" ? parseReportStatus(raw) : undefined,
    };
  });

  const report: ReportStructure = {
    title: "",
    scenarioTitle: `${modelId} — ${simulator}`,
    generatedAt: "",
    rawMarkdown,
    lines,
    notes: [],
    tableOfContents: [],
    simulationSetup: [],
    summary: { dc: [], transient: [], ac: [], noise: [] },
    sections: [],
    runIntegrity: {},
    runIntegrityNotes: [],
  };

  let h2Title = "";
  let h3Title = "";
  let currentSection: ReportSection | null = null;
  let currentSubsection: ReportSubSection | null = null;
  let currentEntry: ReportEntry | null = null;
  let previousParagraph: string | null = null;

  const targetBlocks = (): ReportBlock[] | null => {
    if (currentSubsection) return currentSubsection.blocks ?? null;
    return currentSection?.blocks ?? null;
  };

  for (let index = 0; index < rawLines.length; index += 1) {
    const raw = rawLines[index];
    const lineNumber = index + 1;
    const kind = lines[index].kind;
    const heading = raw.match(/^(#{1,6})\s+(.+?)\s*$/);

    if (heading) {
      const level = heading[1].length;
      const title = heading[2].trim();
      currentEntry = null;
      previousParagraph = null;

      if (level === 1) {
        report.title = title;
      } else if (level === 2) {
        h2Title = stripHeadingNumber(title);
        h3Title = "";
        currentSubsection = null;
        const structural = ![
          "Table of Contents",
          "Notes",
          "Simulation Setup and Execution",
          "Summary",
        ].includes(h2Title);
        currentSection = structural
          ? { title: h2Title, entries: [], subsections: [], blocks: [] }
          : null;
        if (currentSection) report.sections.push(currentSection);
      } else if (level === 3) {
        h3Title = title;
        if (currentSection) {
          currentSubsection = {
            title,
            entries: [],
            plots: [],
            plotDetails: [],
            tables: [],
            blocks: [],
          };
          currentSection.subsections.push(currentSubsection);
        }
      }
      continue;
    }

    if (kind === "generated-at") {
      report.generatedAt = raw.replace(/^Generated on:\s*/i, "").trim();
      continue;
    }

    if (kind === "table") {
      const tableLines: string[] = [];
      const parsedRows: string[][] = [];
      const startLine = lineNumber;
      while (index < rawLines.length && lineKind(rawLines[index]) === "table") {
        tableLines.push(rawLines[index]);
        parsedRows.push(parseTableRow(rawLines[index]));
        index += 1;
      }
      index -= 1;
      const headers = parsedRows[0] ?? [];
      const rows = parsedRows.slice(isTableSeparator(parsedRows[1] ?? []) ? 2 : 1);
      const table: ReportTable = { headers, rows, rawLines: tableLines, startLine };
      const block = makeBlock("table", tableLines.join("\n"), startLine, { table });

      if (h2Title === "Summary") {
        const key = summaryKey(h3Title);
        if (key) report.summary[key].push(...tableToEntries(table));
      } else if (currentSubsection) {
        currentSubsection.tables?.push(table);
        currentSubsection.blocks?.push(block);
      } else {
        currentSection?.blocks?.push(block);
      }
      previousParagraph = null;
      continue;
    }

    if (kind === "check") {
      const entry = parseCheck(raw, lineNumber);
      currentEntry = entry;
      if (h2Title === "Simulation Setup and Execution") {
        report.simulationSetup.push(entry);
      } else if (currentSubsection) {
        currentSubsection.entries.push(entry);
        currentSubsection.blocks?.push(
          makeBlock("check", raw, lineNumber, { entry, status: entry.status, text: entry.testType }),
        );
      } else if (currentSection) {
        currentSection.entries?.push(entry);
        currentSection.blocks?.push(
          makeBlock("check", raw, lineNumber, { entry, status: entry.status, text: entry.testType }),
        );
      }
      previousParagraph = null;
      continue;
    }

    if (kind === "bullet") {
      const indent = raw.match(/^(\s*)/)?.[1].length ?? 0;
      const text = raw.replace(/^\s*-\s*/, "").trim();
      if (currentEntry && indent > 0) {
        const detail = { text, depth: indent, raw, lineNumber };
        currentEntry.details?.push(detail);
        currentEntry.keyFindings = currentEntry.details?.map((item) => item.text).join("; ") || null;
        targetBlocks()?.push(makeBlock("detail", raw, lineNumber, { text, depth: indent }));
      } else {
        if (h2Title === "Notes") report.notes.push(text);
        if (h2Title === "Table of Contents") report.tableOfContents.push(text);
        if (h2Title === "Run Integrity") {
          const field = text.match(/^([^:]+):\s*(.*)$/);
          if (field) report.runIntegrity[field[1].trim()] = stripInlineMarkup(field[2].trim());
          else report.runIntegrityNotes.push(text);
        }
        targetBlocks()?.push(makeBlock("bullet", raw, lineNumber, { text, depth: indent }));
      }
      previousParagraph = null;
      continue;
    }

    if (kind === "ordered-list") {
      if (h2Title === "Table of Contents") report.tableOfContents.push(raw.trim());
      previousParagraph = null;
      continue;
    }

    if (kind === "image") {
      const plot = imageFromLine(raw, lineNumber);
      if (plot) {
        plot.caption = previousParagraph;
        if (currentSubsection) {
          currentSubsection.plots?.push(plot.src);
          currentSubsection.plotDetails?.push(plot);
        }
        targetBlocks()?.push(makeBlock("image", raw, lineNumber, { plot }));
      }
      previousParagraph = null;
      continue;
    }

    if (kind === "comment") {
      targetBlocks()?.push(makeBlock("comment", raw, lineNumber));
      continue;
    }

    if (kind === "blank") {
      targetBlocks()?.push(makeBlock("blank", raw, lineNumber));
      continue;
    }

    const text = raw.trim().replace(/^\*(.*)\*$/, "$1");
    previousParagraph = text;
    targetBlocks()?.push(makeBlock("paragraph", raw, lineNumber, { text }));
  }

  return report;
}
