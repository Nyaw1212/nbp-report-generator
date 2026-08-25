import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const requiredFiles = [
  'appsscript.json',
  'Code.gs',
  'Config.gs',
  'Directory.gs',
  'ReportTemplate.gs',
  'Index.html',
  'Styles.html',
  'AppJs.html'
];

for (const file of requiredFiles) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) throw new Error(`Missing required file: ${file}`);
}

JSON.parse(fs.readFileSync(path.join(root, 'appsscript.json'), 'utf8'));

for (const file of requiredFiles.filter(file => file.endsWith('.gs'))) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  new Function(source);
}

const templateSource = fs.readFileSync(path.join(root, 'ReportTemplate.gs'), 'utf8');
for (const token of ['{{CAMP_NAME}}', '{{REPORT_DATE}}', '{{REPORT_DATE_UPPER}}', '{{OFFICE}}', '{{ROWS}}']) {
  if (!templateSource.includes(token)) throw new Error(`Generator does not handle required token: ${token}`);
}

console.log('Validation passed: manifest, Apps Script syntax, required files, and template tokens.');

