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
 * Renders text content supporting both standard auto-linked text and markdown tables on mobile.
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
            className="my-2 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs bg-white/70 dark:bg-slate-900/50"
          >
            <table className="w-full text-left text-xs border-collapse min-w-[220px]">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 font-bold">
                  {parsed.headers.map((h, idx) => (
                    <th key={idx} className="px-2.5 py-1.5 text-[10px] uppercase tracking-wider font-extrabold">
                      <AutoLinkText text={h} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white/40 dark:bg-slate-900/40">
                {parsed.rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-2.5 py-1.5 text-slate-800 dark:text-slate-200 text-xs">
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

export function tsvToMarkdownTable(tsv: string): string | null {
  const lines = tsv.trim().split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;

  const hasTabs = lines.some((l) => l.includes('\t'));
  if (!hasTabs) return null;

  const rows = lines.map((l) => l.split('\t').map((c) => c.trim()));
  const maxCols = Math.max(...rows.map((r) => r.length));
  if (maxCols < 2) return null;

  const paddedRows = rows.map((r) => {
    while (r.length < maxCols) r.push('');
    return r;
  });

  const header = `| ${paddedRows[0].join(' | ')} |`;
  const divider = `| ${paddedRows[0].map(() => '---').join(' | ')} |`;
  const body = paddedRows
    .slice(1)
    .map((r) => `| ${r.join(' | ')} |`)
    .join('\n');

  return `${header}\n${divider}\n${body}`;
}
