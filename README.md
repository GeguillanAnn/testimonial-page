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

## Connecting it to GoHighLevel

Open `index.html`, find the `CONFIG` block near the top of the `<script>`:

```js
var CONFIG = {
  WEBHOOK_URL: "",          // paste your GHL inbound webhook here
  MAX_VIDEO_MB: 300,
  MAX_RECORD_SECONDS: 240
};
```

While `WEBHOOK_URL` is empty the page runs in demo mode: it validates, shows the
thank-you screen, and logs the payload to the browser console instead of sending
it. Paste a webhook URL and it POSTs a `FormData` with every field, plus the
video file attached as `video`.

Fields sent: `submitted_at`, `role`, `testimonial_format`, `full_name`, `email`,
`company_name`, `current_role`, `written_testimonial`, `video_file_name`,
`marketing_permission`, `social_tag_permission`, `social_handle`.

Note: a GHL inbound webhook stores the text fields but will not hold a raw video
file. Send videos to storage first (R2, S3, or a Zapier/Make step) and pass the
resulting URL into GHL.

## Embedding in GHL

Paste the file contents into a page's custom code / HTML block and the camera
prompts normally. If you embed it as an iframe instead, the iframe must pass the
permission through or the browser will never ask:

```html
<iframe src="..." allow="camera; microphone"></iframe>
```

## Brand

Papaya `#FF8700`, Cream `#FAF5EC`, Dark Gray `#2A2A2A`, White `#FFFFFF`. Arial.
