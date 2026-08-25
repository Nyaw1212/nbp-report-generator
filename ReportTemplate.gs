function createPage1Report_(request) {
  var config = getReportConfig_();
  var reportDate = validateIsoDate_(request.reportDate);
  var tableData = getCampTable1Rows_(request.camp);
  var reportName = buildReportName_(tableData.camp, reportDate);
  var outputFolder = getOutputFolder_(config);
  var sourceFile = DriveApp.getFileById(config.templateDocumentId);
  var copyFile = null;
  var pdfFile = null;

  try {
    copyFile = sourceFile.makeCopy(reportName, outputFolder);
    var document = DocumentApp.openById(copyFile.getId());
    var body = document.getBody();

    replaceToken_(body, '{{CAMP_NAME}}', getCampDisplayName_(tableData.camp));
    replaceToken_(body, '{{REPORT_DATE}}', formatReportDate_(reportDate, false));
    replaceToken_(body, '{{REPORT_DATE_UPPER}}', formatReportDate_(reportDate, true));

    populateTable1_(body, tableData.rows);
    document.saveAndClose();

    var pdfName = reportName + '.pdf';
    var pdfBlob = DriveApp.getFileById(copyFile.getId()).getAs(MimeType.PDF).setName(pdfName);
    pdfFile = outputFolder.createFile(pdfBlob);

    return {
      ok: true,
      camp: tableData.camp,
      reportDate: reportDate,
      officeCount: tableData.rows.length,
      warnings: tableData.warnings,
      documentId: copyFile.getId(),
      documentUrl: copyFile.getUrl(),
      pdfId: pdfFile.getId(),
      pdfUrl: pdfFile.getUrl(),
      outputFolderUrl: outputFolder.getUrl()
    };
  } catch (error) {
    if (pdfFile) safelyTrashFile_(pdfFile);
    if (copyFile) safelyTrashFile_(copyFile);
    throw error;
  }
}

function populateTable1_(body, rows) {
  var table = findTable1_(body);
  var headerRow = table.getRow(0);
  REPORT_TABLE1_HEADERS_.forEach(function(label, index) {
    setCellTextPreservingStyle_(headerRow.getCell(index), label);
  });

  var anchorIndex = findRowIndexByFirstCell_(table, '{{ROWS}}');
  if (anchorIndex < 0) throw new Error('The Table 1 row anchor {{ROWS}} was not found.');
  if (!rows.length) throw new Error('There are no office rows to insert.');

  var anchorRow = table.getRow(anchorIndex);
  var rowPrototype = anchorRow.copy();

  rows.forEach(function(rowData, index) {
    var row = index === 0
      ? anchorRow
      : table.insertTableRow(anchorIndex + index, rowPrototype.copy());
    setOfficeCountRow_(row, rowData);
  });

  var totalIndex = findRowIndexByFirstCell_(table, 'TOTAL');
  if (totalIndex >= 0) clearCellsAfterFirst_(table.getRow(totalIndex));

  var grandTotalIndex = findRowIndexByFirstCell_(table, 'GRAND TOTAL');
  if (grandTotalIndex >= 0) clearCellsAfterFirst_(table.getRow(grandTotalIndex));
}

function findTable1_(body) {
  var tables = body.getTables();
  for (var i = 0; i < tables.length; i += 1) {
    var table = tables[i];
    if (!table.getNumRows() || !table.getRow(0).getNumCells()) continue;
    if (table.getCell(0, 0).getText().trim() === '{{OFFICE}}') return table;
  }
  throw new Error('Table 1 was not found. Expected {{OFFICE}} in its first header cell.');
}

function findRowIndexByFirstCell_(table, expectedText) {
  for (var index = 0; index < table.getNumRows(); index += 1) {
    var row = table.getRow(index);
    if (row.getNumCells() && row.getCell(0).getText().trim() === expectedText) return index;
  }
  return -1;
}

function setOfficeCountRow_(row, rowData) {
  if (row.getNumCells() < 5) throw new Error('The Table 1 office row does not have five cells.');

  setTableBodyCellText_(row.getCell(0), rowData.office);
  for (var index = 1; index < 5; index += 1) {
    setTableBodyCellText_(row.getCell(index), '');
  }
}

function setTableBodyCellText_(cell, value) {
  setCellTextPreservingStyle_(cell, value);
  var text = cell.editAsText();
  if (text.getText().length) text.setBold(false);
}

function clearCellsAfterFirst_(row) {
  for (var index = 1; index < row.getNumCells(); index += 1) {
    setCellTextPreservingStyle_(row.getCell(index), '');
  }
}

function setCellTextPreservingStyle_(cell, value) {
  var text = cell.editAsText();
  var oldText = text.getText();
  var style = oldText.length ? readSafeTextStyle_(text) : null;
  var nextText = String(value == null ? '' : value);
  text.setText(nextText);
  if (style && nextText.length) applySafeTextStyle_(text, style);
}

function readSafeTextStyle_(text) {
  return {
    bold: text.isBold(0),
    italic: text.isItalic(0),
    underline: text.isUnderline(0),
    fontFamily: text.getFontFamily(0),
    fontSize: text.getFontSize(0),
    foregroundColor: text.getForegroundColor(0)
  };
}

function applySafeTextStyle_(text, style) {
  if (typeof style.bold === 'boolean') text.setBold(style.bold);
  if (typeof style.italic === 'boolean') text.setItalic(style.italic);
  if (typeof style.underline === 'boolean') text.setUnderline(style.underline);
  if (style.fontFamily) text.setFontFamily(style.fontFamily);
  if (typeof style.fontSize === 'number' && style.fontSize > 0) text.setFontSize(style.fontSize);

  // Google Docs can return null or theme-derived color values that cannot be
  // passed back to setAttributes(). Only restore a concrete RGB hex color.
  if (/^#[0-9a-f]{6}$/i.test(String(style.foregroundColor || ''))) {
    text.setForegroundColor(style.foregroundColor);
  }
}

function replaceToken_(body, token, replacement) {
  body.replaceText(escapeRegex_(token), String(replacement == null ? '' : replacement));
}

function escapeRegex_(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildReportName_(camp, reportDate) {
  return ['Attendance Counting Report', normalizeKey_(camp), reportDate].join(' - ');
}

function getOutputFolder_(config) {
  if (config.outputFolderId) return DriveApp.getFolderById(config.outputFolderId);

  var folders = DriveApp.getFoldersByName(config.outputFolderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(config.outputFolderName);
}

function safelyTrashFile_(file) {
  try {
    file.setTrashed(true);
  } catch (ignored) {
    console.warn('Unable to trash incomplete output file ' + file.getId());
  }
}

