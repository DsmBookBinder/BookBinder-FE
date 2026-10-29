import writeExcelFile from "write-excel-file/browser";

type Cell = string | number | null;

/** 첫 줄을 굵은 머리글로 한 .xlsx 파일을 내려받는다. widths는 열 너비(글자 수). */
export async function downloadXlsx(filename: string, header: string[], rows: Cell[][], widths: number[]): Promise<void> {
  const data = [
    header.map((value) => ({ value, fontWeight: "bold" as const })),
    ...rows.map((row) => row.map((value) => (typeof value === "number" ? { value, type: Number, format: "#,##0" } : value))),
  ];
  await writeExcelFile(data, { columns: widths.map((width) => ({ width })), stickyRowsCount: 1 }).toFile(filename);
}
