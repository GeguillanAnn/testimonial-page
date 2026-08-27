/**
 * Lighthouse Voyages — testimonial intake
 * -----------------------------------------------------------------------
 * Runs as the team Google account. The public page never sees a Google
 * credential: this script mints a one-time upload link that is good for a
 * single file in a single folder, and hands that back instead.
 *
 * SETUP
 *   1. script.google.com > New project, paste this in as Code.gs
 *   2. Fill in FOLDER_ID and SHEET_ID below
 *   3. Deploy > New deployment > Web app
 *        Execute as:     Me  (the team account that owns the Drive folder)
 *        Who has access: Anyone
 *   4. Copy the /exec URL into CONFIG.SCRIPT_URL in index.html
 *
 * Re-deploy as a NEW VERSION after any edit, or the change will not go live.
 */

/* Drive folder that receives the videos — the long id in the folder URL */
var FOLDER_ID = 'PASTE_DRIVE_FOLDER_ID_HERE';

/* Google Sheet that logs every submission. Leave '' to skip logging. */
var SHEET_ID = '';

/* Page allowed to call this. '*' during testing; lock to your domain after. */
var ALLOWED_ORIGIN = '*';

var HEADERS = [
  'Submitted', 'Role', 'Format', 'Full Name', 'Email', 'Company',
  'Current Role', 'Written Testimonial', 'Video Link',
  'Marketing Permission', 'Social Tag OK', 'Social Handle'
];

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, error: 'Empty request.' });
    }
    var body = JSON.parse(e.postData.contents);

    if (body.action === 'start')  return json(startUpload(body));
    if (body.action === 'chunk')  return json(uploadChunk(body));
    if (body.action === 'finish') return json(finishUpload(body));
    if (body.action === 'log')    return json(logRow(body));

    return json({ ok: false, error: 'Unknown action: ' + body.action });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

function doGet() {
  return json({ ok: true, service: 'Lighthouse Voyages testimonial intake' });
}

/**
 * Opens a resumable upload session against the target folder and returns its
 * URI. That URI accepts bytes for exactly one file and nothing else, so it is
 * safe to hand to a browser — unlike an access token, which would grant the
 * holder the whole Drive.
 */
function startUpload(body) {
  if (FOLDER_ID.indexOf('PASTE_') === 0) {
    throw new Error('FOLDER_ID is not set in the Apps Script.');
  }

  var mime = body.mimeType || 'video/webm';
  var meta = {
    name: buildFileName(body, mime),
    parents: [FOLDER_ID],
    description: [
      body.role || '',
      body.fullName || '',
      body.email || ''
    ].filter(String).join(' · ')
  };

  var initHeaders = {
    Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
    'X-Upload-Content-Type': mime
  };
  /* A resumable session only accepts uploads from a browser if the origin was
     declared when the session was created. Without this the browser's PUT is
     refused with no readable reason. */
  if (body.origin) initHeaders['Origin'] = body.origin;
  if (body.size)   initHeaders['X-Upload-Content-Length'] = String(body.size);

  var res = UrlFetchApp.fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
    {
      method: 'post',
      contentType: 'application/json; charset=UTF-8',
      headers: initHeaders,
      payload: JSON.stringify(meta),
      muteHttpExceptions: true
    }
  );

  var headers = res.getAllHeaders();
  var uri = headers['Location'] || headers['location'];
  if (!uri) {
    var body = res.getContentText();
    if (body.indexOf('insufficient authentication scopes') > -1 || body.indexOf('Insufficient Permission') > -1) {
      throw new Error(
        'This script is not authorized for Drive yet. Open Project Settings, tick ' +
        '"Show appsscript.json manifest file", make sure the oauthScopes block is present, ' +
        'run testSetup once and accept the prompt, then Deploy a NEW VERSION.'
      );
    }
    throw new Error('Drive refused the upload session: ' + body.slice(0, 300));
  }
  /* Remember the session so the browser can also push chunks through this
     script if it cannot reach the upload endpoint directly. */
  var uploadId = Utilities.getUuid();
  CacheService.getScriptCache().put('u_' + uploadId, uri, 21600);

  return { ok: true, uploadUri: uri, uploadId: uploadId };
}

/**
 * Relays one slice of the video to the resumable session. Used when the browser
 * cannot PUT to Google's upload endpoint directly. Slower, because the bytes
 * travel base64-encoded, but it involves no cross-origin request at all.
 */
function uploadChunk(body) {
  var uri = CacheService.getScriptCache().get('u_' + body.uploadId);
  if (!uri) throw new Error('That upload session expired. Please submit again.');

  var bytes = Utilities.base64Decode(body.data);
  var start = Number(body.start);
  var total = Number(body.total);
  var end = start + bytes.length - 1;

  var res = UrlFetchApp.fetch(uri, {
    method: 'put',
    contentType: body.mimeType || 'video/webm',
    headers: { 'Content-Range': 'bytes ' + start + '-' + end + '/' + total },
    payload: bytes,
    muteHttpExceptions: true
  });

  var code = res.getResponseCode();
  if (code === 308) return { ok: true, done: false, received: end + 1 };
  if (code === 200 || code === 201) {
    return { ok: true, done: true, fileId: JSON.parse(res.getContentText()).id };
  }
  throw new Error('Drive rejected the upload (' + code + '): ' + res.getContentText().slice(0, 200));
}

/** Called once the browser has finished pushing bytes. */
function finishUpload(body) {
  if (!body.fileId) throw new Error('No fileId supplied.');

  var file = DriveApp.getFileById(body.fileId);
  /* No permission change: the file inherits whatever sharing the folder has,
     so the folder stays the single place you manage access. */
  var url = file.getUrl();

  logRow(Object.assign({}, body, { videoUrl: url }));
  return { ok: true, fileUrl: url, fileName: file.getName() };
}

/** Appends one row to the log sheet. Safe to call with no SHEET_ID set. */
function logRow(body) {
  if (!SHEET_ID) return { ok: true, logged: false };

  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length)
         .setFontWeight('bold')
         .setBackground('#FF8700')
         .setFontColor('#2A2A2A');
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    new Date(),
    body.role || '',
    body.format || '',
    body.fullName || '',
    body.email || '',
    body.company || '',
    body.currentRole || '',
    body.written || '',
    body.videoUrl || '',
    body.marketingPermission ? 'Yes' : 'No',
    body.socialTagOk ? 'Yes' : 'No',
    body.socialHandle || ''
  ]);

  return { ok: true, logged: true };
}

function buildFileName(body, mime) {
  var ext = mime.indexOf('mp4') > -1 ? 'mp4' : 'webm';
  var who = (body.fullName || 'Unnamed').replace(/[\\/:*?"<>|]/g, '').trim();
  var role = body.role === 'Client' ? 'Client' : 'VA';
  var stamp = Utilities.formatDate(new Date(), 'America/New_York', 'yyyy-MM-dd');
  return stamp + ' — ' + role + ' — ' + who + '.' + ext;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Run once from the editor to grant permissions and check the folder id. */
function testSetup() {
  var folder = DriveApp.getFolderById(FOLDER_ID);
  Logger.log('Folder OK: ' + folder.getName());
  if (SHEET_ID) {
    Logger.log('Sheet OK: ' + SpreadsheetApp.openById(SHEET_ID).getName());
  }
}
