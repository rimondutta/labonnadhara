/**
 * Google Sheets Integration — Auto-save customer order details
 *
 * SETUP (one-time):
 * ─────────────────
 * 1. Go to https://console.cloud.google.com → Create project (or use existing)
 * 2. Enable "Google Sheets API" in APIs & Services → Library
 * 3. Go to APIs & Services → Credentials → Create Service Account
 * 4. On the Service Account, go to Keys tab → Add Key → JSON → Download
 * 5. Open your Google Sheet → Share it with the service account email
 *    (looks like: something@project.iam.gserviceaccount.com) → Editor
 * 6. Add these two env vars to your .env.local / Vercel Environment Variables:
 *
 *    GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
 *    GOOGLE_SHEETS_SPREADSHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
 *    (The Spreadsheet ID is the long string in the Sheet URL between /d/ and /edit)
 *
 * SHEET COLUMNS (auto-created header on first run):
 * A: Order ID  B: Date  C: Customer Name  D: Email  E: Phone
 * F: Address   G: City  H: Payment Method I: Items  J: Shipping Cost
 * K: Total (BDT)  L: Status
 */

import { google } from 'googleapis';

export interface OrderSheetPayload {
  orderId: string;
  customerName: string;
  customerEmail?: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  paymentMethod?: string;
  items: Array<{ title: string; quantity: number; price: number }>;
  shippingCost?: number;
  totalAmount: number;
  fulfillmentStatus?: string;
}

const SHEET_NAME = 'Sheet1'; // The tab name inside the spreadsheet (rename in Google Sheets if desired)
const HEADER_ROW = [
  'Order ID',
  'Date',
  'Customer Name',
  'Email',
  'Phone',
  'Address',
  'City',
  'Payment Method',
  'Items',
  'Shipping Cost (BDT)',
  'Total (BDT)',
  'Status',
];

function getAuthClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON env var is not set');

  const credentials = JSON.parse(raw);

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

/**
 * Appends a single row to the Orders sheet for every new order.
 * Call this as a fire-and-forget task — it never blocks the checkout response.
 */
export async function appendOrderToSheet(payload: OrderSheetPayload): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    console.warn('[GoogleSheets] GOOGLE_SHEETS_SPREADSHEET_ID not set — skipping');
    return;
  }

  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  // Check if header row exists; if the sheet is empty, prepend it
  const metaRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A1:L1`,
  });

  const existingFirstRow = metaRes.data.values?.[0];
  const needsHeader =
    !existingFirstRow ||
    existingFirstRow.length === 0 ||
    existingFirstRow[0] !== 'Order ID';

  if (needsHeader) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADER_ROW] },
    });
  }

  // Format the items summary: "Toy Car x2, Doll x1"
  const itemsSummary = payload.items
    .map((i) => `${i.title} x${i.quantity}`)
    .join(', ');

  const row = [
    payload.orderId,
    new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' }),
    payload.customerName,
    payload.customerEmail || '',
    payload.phone || '',
    payload.addressLine1 || '',
    payload.city || '',
    payload.paymentMethod || 'cod',
    itemsSummary,
    payload.shippingCost ?? 0,
    payload.totalAmount,
    payload.fulfillmentStatus || 'unfulfilled',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });

  console.log(`[GoogleSheets] Appended order ${payload.orderId} to sheet`);
}
