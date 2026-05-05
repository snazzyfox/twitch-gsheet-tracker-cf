import { google } from "googleapis";
import { DataRow } from "./types";
import { env } from "cloudflare:workers";

const auth = new google.auth.GoogleAuth({
	credentials: JSON.parse(env.GSHEET_CREDENTIALS),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({
  version: "v4",
  auth,
  retry: true,
  retryConfig: {
    httpMethodsToRetry: ["GET", "PUT", "OPTIONS", "HEAD", "DELETE", "POST"],
    retry: 5,
    noResponseRetries: 5,
  },
});

export async function writeRows(data: readonly Message<DataRow>[]) {
  try {
		const values = data.map(rec => [
			rec.timestamp.toISOString(),
			rec.body.action,
			rec.body.level,
			rec.body.amount,
			rec.body.user,
			rec.body.message,
		])
    await sheets.spreadsheets.values.append({
      spreadsheetId: env.GSHEET_SPREADSHEET_ID,
      range: env.GSHEET_SHEET_NAME,
      valueInputOption: "RAW",
      requestBody: { values },
    });
  } catch (err) {
    console.error(err);
  }
}
