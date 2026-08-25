function loadDirectoryModel_() {
  var config = getReportConfig_();
  var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  var officeRows = readSheetObjects_(spreadsheet, REPORT_SHEETS_.officeDirectory);
  var shiftRows = readSheetObjects_(spreadsheet, REPORT_SHEETS_.shiftDirectory);

  var offices = officeRows
    .filter(function(row) {
      return row.CAMP && row.OFFICE && isActiveValue_(row.ACTIVE);
    })
    .map(function(row) {
      return {
        camp: normalizeKey_(row.CAMP),
        office: String(row.OFFICE).trim(),
        sortOrder: Number(row['SORT ORDER'] || 0)
      };
    });

  var shifts = shiftRows
    .filter(function(row) {
      return row.CAMP && row.OFFICE && row['SCHEDULE CODE'] && isActiveValue_(row.ACTIVE);
    })
    .map(function(row) {
      return {
        camp: normalizeKey_(row.CAMP),
        office: String(row.OFFICE).trim(),
        officeKey: normalizeKey_(row.OFFICE),
        unitKey: String(row['UNIT KEY'] || '').trim(),
        scheduleCode: normalizeKey_(row['SCHEDULE CODE']),
        scheduleType: normalizeKey_(row['SCHEDULE TYPE']),
        displayLabel: String(row['DISPLAY LABEL'] || '').trim(),
        startTime: String(row['START TIME'] || '').trim(),
        endTime: String(row['END TIME'] || '').trim(),
        sortOrder: Number(row['SORT ORDER'] || 0)
      };
    });

  return { offices: offices, shifts: shifts };
}

function getAvailableCamps_() {
  var model = loadDirectoryModel_();
  var byCamp = {};

  model.offices.forEach(function(office) {
    if (!byCamp[office.camp]) {
      byCamp[office.camp] = {
        code: office.camp,
        name: getCampDisplayName_(office.camp),
        officeCount: 0,
        configuredShiftCount: 0
      };
    }
    byCamp[office.camp].officeCount += 1;
  });

  model.shifts.forEach(function(shift) {
    if (byCamp[shift.camp]) byCamp[shift.camp].configuredShiftCount += 1;
  });

  return Object.keys(byCamp)
    .sort()
    .map(function(code) {
      var item = byCamp[code];
      item.configured = item.configuredShiftCount > 0;
      return item;
    });
}

function getCampTable1Rows_(camp) {
  var normalizedCamp = normalizeKey_(camp);
  var model = loadDirectoryModel_();
  var offices = model.offices
    .filter(function(office) { return office.camp === normalizedCamp; })
    .sort(function(a, b) {
      return a.sortOrder - b.sortOrder || a.office.localeCompare(b.office);
    });

  if (!offices.length) throw new Error('No active offices were found for ' + normalizedCamp + '.');

  var shiftsByOffice = {};
  model.shifts
    .filter(function(shift) { return shift.camp === normalizedCamp; })
    .sort(function(a, b) { return a.sortOrder - b.sortOrder; })
    .forEach(function(shift) {
      if (!shiftsByOffice[shift.officeKey]) shiftsByOffice[shift.officeKey] = {};
      shiftsByOffice[shift.officeKey][shift.scheduleCode] = shift;
    });

  var warnings = [];
  var rows = offices.map(function(office) {
    var officeShifts = shiftsByOffice[normalizeKey_(office.office)] || {};
    var labels = {};
    REPORT_SHIFT_CODES_.forEach(function(code) {
      labels[code] = officeShifts[code] ? officeShifts[code].displayLabel : '';
      if (!labels[code]) warnings.push(office.office + ' is missing active schedule ' + code + '.');
    });
    return {
      office: office.office,
      regular: labels.REGULAR,
      a: labels.A,
      b: labels.B,
      c: labels.C
    };
  });

  if (!model.shifts.some(function(shift) { return shift.camp === normalizedCamp; })) {
    throw new Error(normalizedCamp + ' has no active rows in SHIFT_DIRECTORY. Configure its schedules before generating a report.');
  }

  return { camp: normalizedCamp, rows: rows, warnings: warnings };
}

function readSheetObjects_(spreadsheet, sheetName) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error('Required sheet not found: ' + sheetName);

  var values = sheet.getDataRange().getDisplayValues();
  if (!values.length) return [];

  var headers = values[0].map(function(header) { return normalizeKey_(header); });
  return values.slice(1).map(function(row) {
    var object = {};
    headers.forEach(function(header, index) {
      if (header) object[header] = row[index] == null ? '' : row[index];
    });
    return object;
  });
}

