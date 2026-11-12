/** Protect spreadsheet exports from formulas embedded in editable customer data. */
export function adminCsv(rows: unknown[][]) {
  const cell = (value: unknown) => {
    const text = String(value ?? '');
    const safe = /^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return '\uFEFF' + rows.map(row => row.map(cell).join(';')).join('\r\n');
}
export function downloadAdminCsv(filename: string, rows: unknown[][]) {
  const url = URL.createObjectURL(new Blob([adminCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
