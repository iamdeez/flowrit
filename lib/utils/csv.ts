export const CSV_BOM = '\uFEFF'

function escapeCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

export function toCSV(headers: string[], rows: string[][]): string {
  return [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\r\n')
}
