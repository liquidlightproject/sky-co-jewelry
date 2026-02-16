const SPREADSHEET_ID = "1cBxdqMPo_8W-I8NibF-fIp4oaIjEGnmZKjakvlgXbIc";
const SHEET_NAME = "Leads";

const WEBHOOK_SECRET = "YOUR_SECRET_VALUE_HERE";

function doGet() {
  return ContentService.createTextOutput("OK - webhook is live. Use POST to send leads.").setMimeType(
    ContentService.MimeType.TEXT,
  );
}

function doPost(e) {
  try {
    const suppliedSecret = e?.parameter?.key ? String(e.parameter.key) : "";
    if (WEBHOOK_SECRET && suppliedSecret !== WEBHOOK_SECRET) {
      return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(
        ContentService.MimeType.JSON,
      );
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      return ContentService.createTextOutput(
        JSON.stringify({ status: "error", message: `Sheet tab "${SHEET_NAME}" not found` }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    let data = {};
    if (e?.postData?.contents) {
      data = JSON.parse(e.postData.contents);
    }

    const name = (data.name || "").toString().trim();
    const email = (data.email || "").toString().trim();
    const phone = (data.phone || "").toString().trim();
    const message = (data.message || "").toString().trim();
    const source = (data.source || "Website Quote Form").toString().trim();
    const campaign = (data.campaign || "Quote Request").toString().trim();
    const location = (data.location || "").toString().trim();

    if (!name && !email && !phone && !message) {
      return ContentService.createTextOutput(
        JSON.stringify({ status: "error", message: "Missing lead fields" }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    sheet.appendRow([new Date(), name, email, phone, message, source, campaign, location]);

    return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(
      ContentService.MimeType.JSON,
    );
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: String(error) }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
