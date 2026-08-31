/**
 * A small RFC 4180 CSV reader.
 *
 * Written rather than pulled in because the requirement is narrow — read a
 * pasted table, correctly — and the failure mode of getting it slightly wrong
 * is silent: a quoted venue name containing a comma splits into two columns
 * and every field after it shifts by one. That does not throw. It imports.
 */

export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Strip a UTF-8 BOM — Excel writes one, and it would otherwise become part
  // of the first header name, so "slug" silently stops matching.
  const text = input.replace(/^﻿/, "");

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          // "" inside quotes is a literal quote.
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      // Treat CRLF as one break rather than an empty row between them.
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  // Whatever is buffered when the input ends is the last field of the last row.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop rows that are entirely empty — a trailing newline is normal and
  // should not become a record with every field blank.
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/**
 * Turn a parsed table into records keyed by header.
 *
 * Headers are normalised so `Team Slug`, `team_slug` and `teamSlug` all mean
 * the same column — a spreadsheet exported by a third party will not match
 * our casing, and rejecting it for that would be pedantry rather than safety.
 */
export function toRecords(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return [];

  const headers = rows[0].map(normaliseHeader);
  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) record[header] = (row[index] ?? "").trim();
    });
    return record;
  });
}

export function normaliseHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Parse straight from pasted text to records. */
export function readCsv(input: string): Record<string, string>[] {
  return toRecords(parseCsv(input));
}
