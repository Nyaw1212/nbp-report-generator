var REPORT_DEFAULTS_ = Object.freeze({
  spreadsheetId: '1SMbMfK-2T5LroHcycjUbf__pwAYQ6wtUHQocl2EoxmU',
  templateDocumentId: '1qY8qup8sSK4Mgr4xFsVySbzg3plHLSFfPd7CUkxlkMk',
  outputFolderName: 'NBP Generated Reports',
  timeZone: 'Asia/Manila'
});

var REPORT_SHEETS_ = Object.freeze({
  officeDirectory: 'OFFICE_DIRECTORY',
  shiftDirectory: 'SHIFT_DIRECTORY'
});

var REPORT_SHIFT_CODES_ = Object.freeze(['REGULAR', 'A', 'B', 'C']);

var CAMP_DISPLAY_NAMES_ = Object.freeze({
  MAXIMUM: 'MAXIMUM SECURITY CAMP',
  MEDIUM: 'MEDIUM SECURITY CAMP',
  MINIMUM: 'MINIMUM SECURITY CAMP',
  NBP: 'NEW BILIBID PRISON',
  RDC: 'RECEPTION AND DIAGNOSTIC CENTER'
});

function getReportConfig_() {
  var props = PropertiesService.getScriptProperties();
  return {
    spreadsheetId: String(props.getProperty('GOOGLE_SHEET_ID') || REPORT_DEFAULTS_.spreadsheetId).trim(),
    templateDocumentId: String(props.getProperty('TEMPLATE_DOCUMENT_ID') || REPORT_DEFAULTS_.templateDocumentId).trim(),
    outputFolderId: String(props.getProperty('OUTPUT_FOLDER_ID') || '').trim(),
    outputFolderName: String(props.getProperty('OUTPUT_FOLDER_NAME') || REPORT_DEFAULTS_.outputFolderName).trim(),
    timeZone: String(props.getProperty('REPORT_TIME_ZONE') || REPORT_DEFAULTS_.timeZone).trim()
  };
}

function getCampDisplayName_(camp) {
  var normalized = normalizeKey_(camp);
  return CAMP_DISPLAY_NAMES_[normalized] || normalized;
}

function normalizeKey_(value) {
  return String(value == null ? '' : value).trim().toUpperCase();
}

function isActiveValue_(value) {
  var normalized = normalizeKey_(value);
  return normalized === 'TRUE' || normalized === 'YES' || normalized === '1' || normalized === 'ACTIVE';
}

function validateIsoDate_(value) {
  var text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error('Report date must use YYYY-MM-DD format.');

  var parts = text.split('-').map(Number);
  var date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
  if (date.getUTCFullYear() !== parts[0] || date.getUTCMonth() !== parts[1] - 1 || date.getUTCDate() !== parts[2]) {
    throw new Error('Report date is invalid.');
  }
  return text;
}

function formatReportDate_(isoDate, upperCase) {
  var valid = validateIsoDate_(isoDate);
  var parts = valid.split('-').map(Number);
  var date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
  var formatted = Utilities.formatDate(date, getReportConfig_().timeZone, 'd MMMM yyyy');
  return upperCase ? formatted.toUpperCase() : formatted;
}

function getTodayIso_() {
  return Utilities.formatDate(new Date(), getReportConfig_().timeZone, 'yyyy-MM-dd');
}

