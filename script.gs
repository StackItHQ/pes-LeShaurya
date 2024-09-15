const SERVER_URL = 'https://1b8c-2406-7400-108-4cbf-7c9c-b6fd-87d3-4a6e.ngrok-free.app';

function onEdit(e) {
  // Trigger a full sync on every edit
  syncToDatabase();
}

function syncToDatabase() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  // Skip the header row and prepare the data
  const rows = data.slice(1).map((row, index) => [
    index + 1, // New id based on row position
    row[1],    // column1
    row[2]     // column2
  ]).filter(row => row[1] !== '' || row[2] !== ''); // Filter out completely empty rows

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify({ action: 'bulk_update', rows: rows })
  };
  
  UrlFetchApp.fetch(SERVER_URL + '/update-from-sheet', options);
}

function syncFromDatabase() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastSyncTime = PropertiesService.getScriptProperties().getProperty('lastSyncTime') || '1970-01-01T00:00:00Z';
  
  const response = UrlFetchApp.fetch(SERVER_URL + '/get-updates?lastSync=' + encodeURIComponent(lastSyncTime));
  const updates = JSON.parse(response.getContentText());
  
  // Clear existing data (except header)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clear();
  }

  // Update with new data
  updates.forEach((update, index) => {
    sheet.getRange(index + 2, 1).setValue(index + 1); // id
    sheet.getRange(index + 2, 2).setValue(update.column1);
    sheet.getRange(index + 2, 3).setValue(update.column2);
    // Add more columns as needed
  });
  
  PropertiesService.getScriptProperties().setProperty('lastSyncTime', new Date().toISOString());
}

// Set up a trigger to run syncFromDatabase every 5 minutes
function createTrigger() {
  ScriptApp.newTrigger('syncFromDatabase')
    .timeBased()
    .everyMinutes(5)
    .create();
}
