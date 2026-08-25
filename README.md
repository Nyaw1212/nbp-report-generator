# NBP Report Generator

Standalone Google Apps Script web app for generating NBP attendance report documents without changing or sharing a deployment with the existing Attendance Center.

## Milestone 1

This pilot:

- reads active offices from `OFFICE_DIRECTORY`
- reads office-specific `REGULAR`, `A`, `B`, and `C` labels from `SHIFT_DIRECTORY`
- copies the native Google Docs master template
- replaces the camp and report-date placeholders
- expands `{{ROWS}}` into one row per active office
- writes each office's configured shift labels into the generated Table 1
- saves both a Google Doc and PDF in a report-output folder
- performs no Neon reads or writes
- makes no changes to the existing Attendance Center project

Only camps with at least one active `SHIFT_DIRECTORY` row can be selected. Missing office schedules are reported as warnings.

## Template contract

The source Google Doc must contain:

- `{{CAMP_NAME}}`
- `{{REPORT_DATE}}`
- `{{REPORT_DATE_UPPER}}`
- a Table 1 whose first header cell is `{{OFFICE}}`
- a reusable body row whose first cell is `{{ROWS}}`

The generator replaces the Table 1 headers with `OFFICE / UNIT | REGULAR | A | B | C`, clones the anchor row, and preserves the template's row formatting.

## Configuration

The current NBPattendance spreadsheet and `TEMPLATE PER OFFICE` IDs are included as non-secret defaults. They can be overridden in **Apps Script → Project Settings → Script Properties**:

| Property | Required | Purpose |
| --- | --- | --- |
| `GOOGLE_SHEET_ID` | No | Override the reference spreadsheet |
| `TEMPLATE_DOCUMENT_ID` | No | Override the master Google Doc |
| `OUTPUT_FOLDER_ID` | No | Save reports in a specific Drive folder |
| `OUTPUT_FOLDER_NAME` | No | Name of the automatically created folder |
| `REPORT_TIME_ZONE` | No | Defaults to `Asia/Manila` |

The deploying Google account must be able to read the Sheet and template and create files in the output folder.

## Create the independent Apps Script project

Install and authenticate `clasp`, then run from this repository:

```powershell
npm install -g @google/clasp
clasp login
clasp create "NBP Report Generator" --type webapp
clasp push
clasp open-script
```

Keep the generated `.clasp.json` local. It is excluded from Git because it identifies the separate Apps Script project.

In the Apps Script editor:

1. Open **Deploy → New deployment**.
2. Select **Web app**.
3. Execute as yourself.
4. Choose the access scope appropriate for your organization.
5. Authorize the requested Docs, Drive, and Sheets permissions. The generator's code path only reads the directory spreadsheet; Apps Script requires the standard Sheets scope for `SpreadsheetApp.openById()`.
6. Open the deployment URL and generate a Minimum Security Camp test report.

## Validation

```bash
npm test
```

This validates the manifest, Apps Script JavaScript syntax, required files, and required template-token handling.

## Next milestones

1. Review the first generated Page 1 document and PDF.
2. Add read-only Neon report queries after the source of each employee's shift assignment is confirmed.
3. Populate attendance counts and totals.
4. Add a small link from Attendance Center to this independent deployment.

