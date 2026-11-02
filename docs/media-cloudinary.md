# Photos and videos (Cloudinary)

Why: keeps files and their traffic off Supabase. Cloudinary stores the originals and serves each visitor a resized,
modern-format copy (WebP/AVIF for photos, efficient video codecs), which is much smaller than the original.

## How an upload works

1. In the editor, the operator picks a photo or video.
2. Our server checks this person may edit this experience and signs one upload: folder
   `wenro/experiences/<experience id>/`, formats jpg/png/webp/mp4/mov/webm, valid for a short time.
   The secret key never leaves the server.
3. The browser sends the file straight to Cloudinary (progress bar), so large videos never pass through our server
   and Vercel's 4.5 MB request limit does not apply.
4. Cloudinary answers with a signed result. Our server checks that signature and that the file is in this experience's
   folder, builds the address itself, and records it. A forged or altered answer is refused.
5. Removing a photo or video in the editor deletes it at Cloudinary too.

Limits set by WENRO: photos up to 10 MB, videos up to 100 MB (best under 30 seconds, muted), 12 files per experience,
3 of them videos. Your Cloudinary plan has its own limits (storage, monthly bandwidth/credits, maximum file sizes):
check them in the Cloudinary console. Videos use the most bandwidth: keep them short.

On the experience page the cover (first item) fills the large middle panel. A video plays muted in a loop; visitors
who ask their device to reduce motion see a still frame with a play button instead.

## Setup (keys never go in chat or Git)

1. Create a Cloudinary account. In the console, under API Keys, find the cloud name, API key and API secret.
2. Add them in Vercel → Project → Settings → Environment Variables (and in `.env.local`):
   `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (optional `CLOUDINARY_FOLDER`).
3. Redeploy. The editor now says "Photo or short video".

No upload preset is needed: every upload is signed by our server.

Without these keys the app falls back to Supabase Storage (photos only, 4 MB). Demo illustrations live in
`public/demo/` and use no storage at all.

## Tests

`scripts/fake-cloudinary.js` imitates Cloudinary's upload and destroy APIs with the same signature rules;
`scripts/e2e-media.js` runs the whole flow against it, including a forged upload result.
