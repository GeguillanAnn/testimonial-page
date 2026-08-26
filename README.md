# Lighthouse Voyages — Testimonial Submission Page

A single self-contained page where Clients and VAs share their testimonial by
video or in writing. No build step, no dependencies, no external requests.

**Live:** https://geguillanann.github.io/testimonial-page/

## Flow

1. **Your Role** — Client or Virtual Assistant (VA)
2. **Testimonial Type** — Video or Written
3. **Your Story** — record in-page, upload a file, or type it. Guide questions
   change based on the role picked in step 1.
4. **Submit** — name, email, role-specific field, permissions, submit.

## How a submission travels

```
Page  ──▶ Apps Script  ──▶ one-time upload link
      ──▶ video bytes straight to Google Drive
      ──▶ Apps Script logs a row to the tracking Sheet
      ──▶ text fields + Drive link to GoHighLevel
```

The video never passes through GHL or a webhook — those cannot carry a file
this size. It goes browser to Drive directly, using a session link that is good
for exactly one file in one folder. No Google credential is ever present in the
page, which is why this is safe to run on a public URL.

## Setup

### 1. Drive folder

Create the folder that receives testimonials in the team Google account, and
share it with whoever reviews them. Every uploaded file inherits the folder's
sharing, so this folder is the only place access is managed. Copy the folder id
from its URL — the long string after `/folders/`.

### 2. Tracking Sheet (optional but recommended)

Create an empty Google Sheet. The script writes its own header row on first use.
This is your searchable index of every submission. Copy its id from the URL.

### 3. Apps Script

Go to script.google.com, create a project, and paste in `apps-script/Code.gs`.
Set `FOLDER_ID` and `SHEET_ID` at the top, then:

- Run `testSetup` once from the editor to grant permissions and confirm the ids
- Deploy > New deployment > Web app
  - **Execute as:** Me — the team account that owns the folder
  - **Who has access:** Anyone
- Copy the `/exec` URL

Re-deploy as a **new version** after any edit, or the change will not go live.

### 4. Wire up the page

In `index.html`, near the top of the `<script>`:

```js
var CONFIG = {
  SCRIPT_URL:  "",           // the Apps Script /exec URL
  WEBHOOK_URL: "",           // GHL inbound webhook
  MAX_VIDEO_MB: 100,
  MAX_RECORD_SECONDS: 240,
  VIDEO_BITRATE: 1200000,
  AUDIO_BITRATE: 128000
};
```

With both blank the page runs in demo mode: it validates, shows the thank-you
screen, and logs the payload to the console instead of sending anything.

Fields sent to GHL: `submitted_at`, `role`, `testimonial_format`, `full_name`,
`email`, `company_name`, `current_role`, `written_testimonial`,
`video_file_name`, `video_url`, `marketing_permission`,
`social_tag_permission`, `social_handle`.

## Video size

In-page recording is capped at 720p / 1.2 Mbps, which puts a 3-minute clip near
30MB rather than 100MB+. Uploaded files are rejected above `MAX_VIDEO_MB`.

A regular Gmail account shares 15GB across Gmail, Drive, and Photos. When that
fills, **the account stops receiving email.** At roughly 30MB per testimonial
that is ~250 submissions of headroom. Google One at 100GB removes the risk for
about $2/month and is worth doing before this sees real volume.

## Embedding in GHL

Paste the file contents into a page's custom code / HTML block and the camera
prompts normally. If you embed it as an iframe instead, the iframe must pass the
permission through or the browser will never ask:

```html
<iframe src="..." allow="camera; microphone"></iframe>
```

## Brand

Papaya `#FF8700`, Cream `#FAF5EC`, Dark Gray `#2A2A2A`, White `#FFFFFF`. Arial.
