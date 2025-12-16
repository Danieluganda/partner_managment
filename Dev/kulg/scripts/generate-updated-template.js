const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const outDir = path.join(__dirname, '..', 'data', 'excel');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const wb = XLSX.utils.book_new();

const sheets = [
  {
    name: 'Master Register',
    headers: [
      'Partner ID',
      'Partner Name',
      'Partner Type',
      'Contact Email',
      'Start Date',
      'End Date',
      'Status',
      'Notes'
    ],
    sample: ['P-001', 'Sample Partner A', 'Delivery', 'a@example.com', '2024-01-01', '', 'Active', 'Example row']
  },
  {
    name: 'Deliverables',
    headers: [
      'Partner ID',
      'Partner Name',
      'Deliverable #',
      'Description',
      'Milestone Date',
      'Status',
      'Actual Submission',
      'Verification Evidence',
      'Approval Date',
      '% Payment',
      'Payment Amount',
      'Payment Status',
      'Responsible Person',
      'Notes'
    ],
    sample: ['P-001', 'Sample Partner A', 'D-001', 'Initial report', '2024-03-01', 'Pending', '', '', '', '0', '', '', 'Alice', '']
  },
  {
    name: 'Financial Summary',
    headers: [
      'Partner ID',
      'Partner Name',
      'Total Task Order Price',
      'Q1 Advance',
      'Q1 Actual Paid',
      'Q1 Report Received',
      'Q1 Report Approved',
      'Q2 Advance',
      'Q2 Actual Paid',
      'Q2 Report Received',
      'Q2 Report Approved',
      'Q3 Advance',
      'Q3 Actual Paid',
      'Q4 Advance',
      'Q4 Actual Paid',
      'Total Disbursed',
      'Utilization Rate',
      'Comments'
    ],
    sample: ['P-001', 'Sample Partner A', '10000', '2500', '2500', 'Yes', 'Yes', '', '', '', '', '', '', '', '', '2500', '25%', '']
  },
  {
    name: 'Key Personnel',
    headers: [
      'Partner ID',
      'Partner Name',
      'Contact Type',
      'Name',
      'Email',
      'Phone',
      'Notes'
    ],
    sample: ['P-001', 'Sample Partner A', 'Primary Contact', 'Alice Example', 'alice@example.com', '+1000000000', '']
  },
  {
    name: 'Compliance & Reporting',
    headers: [
      'Partner ID',
      'Partner Name',
      'Requirement',
      'Due Date',
      'Reporting Period',
      'Submission Date',
      'Status',
      'FMCS Audit',
      'Notes'
    ],
    sample: ['P-001', 'Sample Partner A', 'Quarterly Report', '2024-03-05', 'Q1 2024', '', 'Pending', 'No', '']
  }
];

for (const s of sheets) {
  const rows = [s.headers, s.sample];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, s.name);
}

const outPath = path.join(outDir, 'updated-standard-import-template.xlsx');
XLSX.writeFile(wb, outPath);
console.log('Wrote template ->', outPath);