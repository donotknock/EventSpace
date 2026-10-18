import { FullEventDetails } from '../types';
import { formatEventDate } from './date';

/**
 * Exports full event data into a formatted CSV file compatible with Microsoft Excel, Google Sheets, and Apple Numbers.
 */
export function exportEventToExcel(event: FullEventDetails) {
  const rows: string[][] = [];

  // Helper to escape CSV cell content
  const escapeCell = (text: any) => {
    if (text === null || text === undefined) return '""';
    const str = String(text).replace(/"/g, '""');
    return `"${str}"`;
  };

  const addRow = (...cells: any[]) => {
    rows.push(cells.map(escapeCell));
  };

  const addEmptyRow = () => rows.push([]);

  // Title & Metadata
  addRow('EVENT SUMMARY REPORT');
  addRow('Title', event.title);
  addRow('Department', event.department || 'N/A');
  addRow('Term / Year', [event.term, event.year].filter(Boolean).join(' ') || 'N/A');
  addRow('Date Range', formatEventDate(event.startDate, event.endDate) || 'Unscheduled');
  addRow('Times', `${event.startTime || '--'} – ${event.endTime || '--'}`);
  addRow('Priority', (event.priority || 'Normal').toUpperCase());
  addRow('Status', (event.status || 'Active').toUpperCase());
  addRow('Generated At', new Date().toLocaleString());
  addEmptyRow();

  // Contacts
  if (event.contacts && event.contacts.length > 0) {
    addRow('LINKED CONTACTS');
    addRow('Name', 'Department', 'Role', 'Email', 'Phone');
    event.contacts.forEach((c) => {
      addRow(c.name, c.department || '', c.role || '', c.email || '', c.phone || '');
    });
    addEmptyRow();
  }

  // Overarching Checklists
  if (event.checklists && event.checklists.length > 0) {
    addRow('OVERARCHING CHECKLISTS');
    addRow('Category', 'Item Content', 'Status');
    event.checklists.forEach((chk) => {
      addRow(chk.category, chk.content, chk.isCompleted ? 'COMPLETED' : 'PENDING');
    });
    addEmptyRow();
  }

  // Canvas Blocks & Tasks
  if (event.nodes && event.nodes.length > 0) {
    addRow('CANVAS BLOCKS & TASKS');
    addRow('Block Title', 'Type', 'Status', 'Due Date', 'Notes / Content', 'Subtasks');
    event.nodes.forEach((n) => {
      let subtasksSummary = '';
      if (n.metadata) {
        try {
          const meta = JSON.parse(n.metadata);
          if (Array.isArray(meta.subtasks) && meta.subtasks.length > 0) {
            subtasksSummary = meta.subtasks
              .map((st: any) => `[${st.done ? 'x' : ' '}] ${st.label}${st.dueDate ? ` (Due: ${st.dueDate.slice(0, 10)})` : ''}`)
              .join('; ');
          }
        } catch {}
      }

      addRow(
        n.title,
        n.type.toUpperCase(),
        n.isCompleted ? 'COMPLETED' : 'PENDING',
        n.dueDate ? new Date(n.dueDate).toLocaleDateString() : '',
        n.content || '',
        subtasksSummary
      );
    });
    addEmptyRow();
  }

  // Friction Logs
  if (event.frictionLogs && event.frictionLogs.length > 0) {
    addRow('FRICTION LOGS & INCIDENTS');
    addRow('Title', 'Severity', 'Description', 'Resolved');
    event.frictionLogs.forEach((fl) => {
      addRow(fl.title, fl.severity.toUpperCase(), fl.description || '', fl.resolved ? 'YES' : 'NO');
    });
    addEmptyRow();
  }

  // Convert to CSV string with UTF-8 BOM for Excel
  const csvContent = '\uFEFF' + rows.map((r) => r.join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeTitle = event.title.replace(/[^a-zA-Z0-9_-]/g, '_');
  link.setAttribute('href', url);
  link.setAttribute('download', `${safeTitle}_Export.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Prepares and opens an executive printable view formatted for high-fidelity PDF export via browser Print dialog.
 */
export function exportEventToPdf(event: FullEventDetails) {
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    alert('Please allow popups to export PDF');
    return;
  }

  const dateStr = formatEventDate(event.startDate, event.endDate) || 'Unscheduled';
  const timeStr = `${event.startTime || '--'} – ${event.endTime || '--'}`;

  const contactsHtml = event.contacts && event.contacts.length > 0
    ? `
      <section class="section">
        <h2>Linked Contacts</h2>
        <table>
          <thead>
            <tr><th>Name</th><th>Role</th><th>Department</th><th>Email</th><th>Phone</th></tr>
          </thead>
          <tbody>
            ${event.contacts.map((c) => `
              <tr>
                <td><strong>${escapeHtml(c.name)}</strong></td>
                <td>${escapeHtml(c.role || '--')}</td>
                <td>${escapeHtml(c.department || '--')}</td>
                <td>${escapeHtml(c.email || '--')}</td>
                <td>${escapeHtml(c.phone || '--')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </section>
    `
    : '';

  const checklistsHtml = event.checklists && event.checklists.length > 0
    ? `
      <section class="section">
        <h2>Overarching Checklists</h2>
        <table>
          <thead>
            <tr><th style="width: 15%">Category</th><th style="width: 70%">Item</th><th style="width: 15%">Status</th></tr>
          </thead>
          <tbody>
            ${event.checklists.map((c) => `
              <tr>
                <td><span class="badge badge-cat">${escapeHtml(c.category)}</span></td>
                <td>${escapeHtml(c.content)}</td>
                <td><span class="badge ${c.isCompleted ? 'badge-done' : 'badge-pending'}">${c.isCompleted ? 'Completed' : 'Pending'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </section>
    `
    : '';

  const nodesHtml = event.nodes && event.nodes.length > 0
    ? `
      <section class="section">
        <h2>Canvas Blocks & Tasks</h2>
        ${event.nodes.map((n) => {
          let subtasksList = '';
          if (n.metadata) {
            try {
              const meta = JSON.parse(n.metadata);
              if (Array.isArray(meta.subtasks) && meta.subtasks.length > 0) {
                subtasksList = `
                  <ul class="subtasks-list">
                    ${meta.subtasks.map((st: any) => `
                      <li class="${st.done ? 'done' : ''}">
                        <input type="checkbox" ${st.done ? 'checked' : ''} disabled />
                        <span>${escapeHtml(st.label)}</span>
                        ${st.dueDate ? `<small class="date-tag">${escapeHtml(st.dueDate.slice(0, 10))}</small>` : ''}
                      </li>
                    `).join('')}
                  </ul>
                `;
              }
            } catch {}
          }

          return `
            <div class="block-card">
              <div class="block-header">
                <div>
                  <span class="badge badge-type">${escapeHtml(n.type.toUpperCase())}</span>
                  <strong>${escapeHtml(n.title)}</strong>
                </div>
                <div>
                  ${n.dueDate ? `<span class="badge badge-date">Due: ${new Date(n.dueDate).toLocaleDateString()}</span>` : ''}
                  <span class="badge ${n.isCompleted ? 'badge-done' : 'badge-pending'}">${n.isCompleted ? 'Completed' : 'Active'}</span>
                </div>
              </div>
              ${n.content ? `<div class="block-content">${escapeHtml(n.content)}</div>` : ''}
              ${subtasksList}
            </div>
          `;
        }).join('')}
      </section>
    `
    : '';

  const frictionLogsHtml = event.frictionLogs && event.frictionLogs.length > 0
    ? `
      <section class="section">
        <h2>Friction Logs & Incidents</h2>
        <table>
          <thead>
            <tr><th style="width: 25%">Title</th><th style="width: 15%">Severity</th><th style="width: 45%">Description</th><th style="width: 15%">Status</th></tr>
          </thead>
          <tbody>
            ${event.frictionLogs.map((fl) => `
              <tr>
                <td><strong>${escapeHtml(fl.title)}</strong></td>
                <td><span class="badge ${fl.severity === 'critical' ? 'badge-urgent' : 'badge-pending'}">${escapeHtml(fl.severity.toUpperCase())}</span></td>
                <td>${escapeHtml(fl.description || '--')}</td>
                <td><span class="badge ${fl.resolved ? 'badge-done' : 'badge-pending'}">${fl.resolved ? 'Resolved' : 'Open'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </section>
    `
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${escapeHtml(event.title)} - EventSpace Export</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 16mm 14mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.4; margin: 0; padding: 24px; font-size: 13px; }
          .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; }
          .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
          .meta-item label { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 2px; }
          .meta-item span { font-weight: 600; font-size: 13px; color: #1e293b; }
          .section { margin-bottom: 24px; page-break-inside: auto; }
          h2 { font-size: 15px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px; }
          th, td { padding: 7px 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          th { background: #f1f5f9; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 10px; }
          .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
          .badge-cat { background: #e0f2fe; color: #0369a1; }
          .badge-type { background: #f1f5f9; color: #475569; margin-right: 6px; }
          .badge-done { background: #dcfce7; color: #15803d; }
          .badge-pending { background: #fef3c7; color: #b45309; }
          .badge-date { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; margin-right: 4px; }
          .block-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 10px; background: #fff; page-break-inside: avoid; }
          .block-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
          .block-content { font-size: 12px; color: #334155; white-space: pre-wrap; background: #f8fafc; padding: 8px 10px; border-radius: 6px; margin-bottom: 6px; }
          .subtasks-list { list-style: none; padding-left: 0; margin: 6px 0 0 0; }
          .subtasks-list li { display: flex; align-items: center; gap: 6px; font-size: 12px; padding: 3px 0; }
          .subtasks-list li.done span { text-decoration: line-through; color: #94a3b8; }
          .date-tag { font-size: 10px; color: #b45309; background: #fffbeb; padding: 1px 4px; border-radius: 3px; }
          .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">${escapeHtml(event.title)}</h1>
            <div style="color: #64748b; font-size: 12px;">EventSpace Spatial Coordination Platform</div>
          </div>
          <button class="no-print" onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
            Print / Save to PDF
          </button>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <label>Department</label>
            <span>${escapeHtml(event.department || 'N/A')}</span>
          </div>
          <div class="meta-item">
            <label>Dates</label>
            <span>${escapeHtml(dateStr)}</span>
          </div>
          <div class="meta-item">
            <label>Time</label>
            <span>${escapeHtml(timeStr)}</span>
          </div>
          <div class="meta-item">
            <label>Status / Priority</label>
            <span>${escapeHtml((event.status || 'Active').toUpperCase())} / ${escapeHtml((event.priority || 'Normal').toUpperCase())}</span>
          </div>
        </div>

        ${contactsHtml}
        ${checklistsHtml}
        ${nodesHtml}
        ${frictionLogsHtml}

        <div class="footer">
          Generated with EventSpace v1.1.2 on ${new Date().toLocaleString()} • https://donotknock.app/apps/eventspace/
        </div>

        <script>
          setTimeout(() => { window.print(); }, 500);
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
