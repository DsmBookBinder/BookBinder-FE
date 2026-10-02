type Cell = string | number | null;

function escapeCell(value: Cell): string {
  const text = value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** 엑셀에서 한글이 깨지지 않도록 BOM을 붙인 CSV로 내려받는다. */
export function downloadCsv(filename: string, rows: Cell[][]): void {
  const csv = rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
