function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Arkusz1");
  
  if (!sheet) {
    // If sheet doesn't exist, use the first one
    sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  }
  
  var name = e.parameter.name;
  var email = e.parameter.email;
  var message = e.parameter.message;
  var date = new Date();
  
  sheet.appendRow([name, email, message, date]);
  
  return ContentService.createTextOutput(JSON.stringify({"result": "success", "row": sheet.getLastRow()}))
    .setMimeType(ContentService.MimeType.JSON);
}

// Function to handle setup or testing
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Arkusz1");
  if (!sheet) {
    sheet = ss.insertSheet("Arkusz1");
  }
  
  // Set headers if sheet is empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Imię", "Email", "Wiadomość", "Data"]);
    sheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#f3f3f3");
  }
}
