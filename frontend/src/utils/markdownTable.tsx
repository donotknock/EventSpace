import React from 'react';
import { AutoLinkText } from './linkify';

interface MarkdownTableProps {
  content: string;
}

/**
 * Checks if a block of lines looks like a markdown table.
 */
function isTableBlock(lines: string[]): boolean {
  if (lines.length < 2) return false;
  const first = lines[0].trim();
  const second = lines[1].trim();
  return first.startsWith('|') && first.endsWith('|') && second.includes('---');
}

/**
 * Parses markdown table lines into headers and rows.
 */
function parseTable(tableLines: string[]): { headers: string[]; rows: string[][] } | null {
  if (tableLines.length < 2) return null;
  const parseRow = (line: string) =>
    line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim());

  const headers = parseRow(tableLines[0]);
  const rows: string[][] = [];

  for (let i = 2; i < tableLines.length; i++) {
    const line = tableLines[i].trim();
    if (line.startsWith('|')) {
      rows.push(parseRow(line));
    }
  }

  return { headers, rows };
}

/**
 * Renders text content supporting both standard auto-linked text and markdown tables.
 */
export const ContentWithTables: React.FC<MarkdownTableProps> = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentTableLines: string[] = [];
  let currentTextLines: string[] = [];

  const flushText = () => {
    if (currentTextLines.length > 0) {
      const textBlock = currentTextLines.join('\n');
      elements.push(
        <div key={`text-${elements.length}`} className="whitespace-pre-wrap leading-relaxed">
          <AutoLinkText text={textBlock} />
        </div>
      );
      currentTextLines = [];
    }
  };

  const flushTable = () => {
    if (currentTableLines.length > 0) {
      const parsed = parseTable(currentTableLines);
      if (parsed) {
        elements.push(
          <div
            key={`table-${elements.length}`}
            className="my-2 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs"
          >
            <table className="w-full text-left text-xs border-collapse min-w-[240px]">
              <thead>
                <tr className="bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 font-bold">
                  {parsed.headers.map((h, idx) => (
                    <th key={idx} className="px-3 py-2 text-[11px] uppercase tracking-wider font-extrabold">
                      <AutoLinkText text={h} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white/50 dark:bg-slate-900/50">
                {parsed.rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-slate-800 dark:text-slate-200 text-xs">
                        <AutoLinkText text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      } else {
        currentTextLines.push(...currentTableLines);
      }
      currentTableLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isPipeLine = line.trim().startsWith('|') && line.trim().endsWith('|');

    if (isPipeLine) {
      if (currentTableLines.length === 0) {
        // Potential table start, peek next line for divider
        if (i + 1 < lines.length && lines[i + 1].includes('---')) {
          flushText();
          currentTableLines.push(line);
        } else {
          currentTextLines.push(line);
        }
      } else {
        currentTableLines.push(line);
      }
    } else {
      if (currentTableLines.length > 0) {
        flushTable();
      }
      currentTextLines.push(line);
    }
  }

  flushTable();
  flushText();

  return <div className="space-y-1.5">{elements}</div>;
};

/**
 * Utility to convert pasted tab-separated text (TSV) or HTML table from Excel / Google Sheets
 * into standard markdown table syntax.
 */
export function tsvToMarkdownTable(tsv: string): string | null {
  return parseSpreadsheetToMarkdown(tsv);
}

export function parseSpreadsheetToMarkdown(text: string, html?: string): string | null {
  // 1. Try plain text / TSV first (standard for Excel/Sheets cell ranges)
  if (text) {
    const rawLines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
    const filteredLines = rawLines.filter((l) => l.trim().length > 0);

    // If rows have tabs, it's clipboard TSV from Excel / Google Sheets
    if (filteredLines.length >= 1 && filteredLines.some((l) => l.includes('\t'))) {
      const rows = filteredLines.map((l) =>
        l.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, '').replace(/\|/g, '\\|'))
      );
      const maxCols = Math.max(...rows.map((r) => r.length));
      if (maxCols >= 1) {
        const paddedRows = rows.map((r) => {
          const row = [...r];
          while (row.length < maxCols) row.push('');
          return row;
        });

        const header = `| ${paddedRows[0].join(' | ')} |`;
        const divider = `| ${paddedRows[0].map(() => '---').join(' | ')} |`;
        const bodyRows =
          paddedRows.length > 1
            ? paddedRows.slice(1).map((r) => `| ${r.join(' | ')} |`).join('\n')
            : `| ${paddedRows[0].map(() => '').join(' | ')} |`;

        return `${header}\n${divider}\n${bodyRows}`;
      }
    }
  }

  // 2. Try HTML table fallback (rich copy from Excel or web Google Sheets)
  if (html && (html.includes('<table') || html.includes('<tr'))) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const trs = Array.from(doc.querySelectorAll('tr'));
      if (trs.length > 0) {
        const rows: string[][] = trs
          .map((tr) => {
            const cells = Array.from(tr.querySelectorAll('th, td'));
            return cells.map((cell) =>
              (cell.textContent || '').trim().replace(/[\r\n]+/g, ' ').replace(/\|/g, '\\|')
            );
          })
          .filter((r) => r.some((c) => c.length > 0));

        if (rows.length > 0) {
          const maxCols = Math.max(...rows.map((r) => r.length));
          if (maxCols >= 1) {
            const paddedRows = rows.map((r) => {
              const row = [...r];
              while (row.length < maxCols) row.push('');
              return row;
            });

            const header = `| ${paddedRows[0].join(' | ')} |`;
            const divider = `| ${paddedRows[0].map(() => '---').join(' | ')} |`;
            const bodyRows =
              paddedRows.length > 1
                ? paddedRows.slice(1).map((r) => `| ${r.join(' | ')} |`).join('\n')
                : `| ${paddedRows[0].map(() => '').join(' | ')} |`;

            return `${header}\n${divider}\n${bodyRows}`;
          }
        }
      }
    } catch (err) {
      console.warn('Failed to parse clipboard HTML table:', err);
    }
  }

  return null;
}
