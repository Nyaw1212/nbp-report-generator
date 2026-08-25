function doGet(event) {
  var template = HtmlService.createTemplateFromFile('Index');
  template.initialCamp = event && event.parameter ? String(event.parameter.camp || '') : '';
  template.initialDate = event && event.parameter ? String(event.parameter.date || '') : '';
  return template.evaluate()
    .setTitle('NBP Report Generator')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function include_(fileName) {
  return HtmlService.createHtmlOutputFromFile(fileName).getContent();
}

function getBootstrapData() {
  return {
    camps: getAvailableCamps_(),
    defaultDate: getTodayIso_()
  };
}

function generateReport(request) {
  var payload = request || {};
  var camp = normalizeKey_(payload.camp);
  var reportDate = validateIsoDate_(payload.reportDate);
  if (!camp) throw new Error('Select a camp.');

  var lock = LockService.getUserLock();
  lock.waitLock(30000);
  try {
    return createPage1Report_({ camp: camp, reportDate: reportDate });
  } finally {
    lock.releaseLock();
  }
}

