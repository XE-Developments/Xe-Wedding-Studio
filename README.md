# XE Minimal Gallery — Single Cloudflare R2 Bucket

This is the single-bucket edition of XE Minimal Gallery. It uses one private Cloudflare R2 bucket named `xe-gallery` for all new originals and thumbnails. There is no secondary bucket, overflow routing, or automatic expiration.

## Package contents

- `index.html` — public gallery
- `studio.html` — password-protected admin studio
- `config.js` — public Render API URL setting
- `assets/` — frontend scripts and styles
- `backend/server.js` — Express API, authentication, upload, image processing, signed viewing/download URLs, replacement and cloud deletion
- `backend/supabase-schema.sql` — database setup and migration
- `backend/.env.example` — environment variable template
- `render.yaml` — Render service configuration

## Important before starting

1. Back up your current Supabase project and keep your existing Backblaze B2 bucket and credentials safe.
2. Existing photo rows are treated as legacy B2 records (`storage_bucket = 'b2'`). The backend can continue serving and deleting those photos only while the old B2 environment variables remain configured in Render.
3. New uploads go to the one R2 bucket and are recorded as `storage_bucket = 'r2'`.
4. This package does not copy old B2 objects to R2. Do not remove the B2 bucket or credentials until old photos have been migrated or intentionally removed.
5. R2 requires an R2 subscription checkout before R2 API tokens can be created. Cloudflare's included monthly free allowance does not mean that account activation/payment setup is necessarily possible without a payment method. Payment method availability depends on Cloudflare's billing flow and account/country.
6. Do not put Cloudflare, Supabase service-role, B2, or admin secrets in GitHub files or `config.js`. Add secrets only in Render Environment.

## Part A — Create / activate Cloudflare R2

1. Open https://dash.cloudflare.com/ and sign in (or create a Cloudflare account).
2. Open **Storage & databases → R2 Object Storage**.
3. If prompted, complete the R2 subscription checkout. Review the payment method and any amount shown before approving. R2 is usage-billed with a monthly free allowance; usage beyond the allowance can be charged.
4. Open R2 Overview and choose **Create bucket**.
5. Enter exactly `xe-gallery`.
6. Choose **Standard** storage class. The R2 free tier applies to Standard storage, not Infrequent Access.
7. Choose a location if Cloudflare asks, then create the bucket.
8. Keep the bucket private. Do not enable public access for this package; the backend creates time-limited signed URLs.

## Part B — Create the R2 API token

1. In R2 Overview, find **Manage R2 API Tokens** / **Manage** next to API Tokens.
2. Choose **Create Account API token** or **Create User API token** (whichever your account permits).
3. Set permission to **Object Read & Write**.
4. Restrict it to **Apply to specific buckets only** and select only `xe-gallery`.
5. Create the token.
6. Copy the **Access Key ID** and **Secret Access Key** immediately. Cloudflare does not show the secret again.
7. Copy your Cloudflare **Account ID**.
8. S3 endpoint format: `https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com`.

Never share these credentials in chat, screenshots, GitHub, or the public frontend.

## Part C — Supabase database

1. Open your Supabase project.
2. Open **SQL Editor → New query**.
3. For a new project, paste and run all of `backend/supabase-schema.sql`.
4. For an existing gallery database, first back up the database, then run the migration below. It adds the storage marker while preserving existing rows as B2:

```sql
alter table public.gallery_photos
add column if not exists storage_bucket text not null default 'b2';

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.gallery_photos to service_role;
grant select, insert, update, delete on table public.gallery_settings to service_role;
```

5. Do not change old rows from `b2` to `r2` unless the corresponding original and thumbnail objects have actually been copied into R2 and the keys updated.
6. The backend uses the Supabase server-side service-role/secret key. Never use the publishable/anon key for `SUPABASE_SERVICE_ROLE_KEY`.

## Part D — Deploy the backend on Render

1. Push the extracted project files to your GitHub repository. Keep the frontend files (`index.html`, `studio.html`, `config.js`, `assets/`) in the repository root.
2. In Render, create or open your Web Service connected to this repository.
3. Set:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Runtime:** Node (Node 20 or newer)
4. Open Render → your service → **Environment** and add these variables:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `ALLOWED_ORIGIN` | `https://xe-developments.github.io` (use your exact GitHub Pages origin) |
| `ADMIN_USERNAME` | Your chosen admin username |
| `ADMIN_PASSWORD` | A strong, unique admin password |
| `JWT_SECRET` | At least 40 random characters |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service-role/secret key |
| `R2_ACCOUNT_ID` | Your Cloudflare Account ID |
| `R2_ACCESS_KEY_ID` | R2 Access Key ID |
| `R2_SECRET_ACCESS_KEY` | R2 Secret Access Key |
| `R2_BUCKET` | `xe-gallery` |
| `MAX_FILE_SIZE_MB` | `100` |
| `MIN_IMAGE_PIXELS` | `6000000` |

5. If old gallery photos still live in Backblaze B2, also keep the following old variables in Render until those photos are migrated or deleted:
   - `B2_ENDPOINT` (for example, `https://s3.us-east-005.backblazeb2.com` — use your actual B2 endpoint)
   - `B2_REGION` (your actual B2 region)
   - `B2_BUCKET` (your existing B2 bucket name)
   - `B2_KEY_ID` (your existing B2 key ID)
   - `B2_APPLICATION_KEY` (your existing B2 application key)
6. Save the environment changes and deploy. Do not send credentials to anyone.

## Part E — Deploy the frontend on GitHub Pages

1. In the repository root, open `config.js`.
2. Replace the placeholder with your actual Render service URL, without a trailing slash. Example:

```js
window.XE_CONFIG = { API_BASE_URL: 'https://YOUR-RENDER-SERVICE.onrender.com' };
```

3. Commit and push all project files.
4. In GitHub repository → **Settings → Pages** choose **Deploy from a branch**.
5. Select branch `main` and folder `/(root)`, then save.
6. Your public gallery should be at `https://xe-developments.github.io/xe-minimal-gallery/` if the repository is named `xe-minimal-gallery` under the `xe-developments` account.
7. Admin studio: `https://xe-developments.github.io/xe-minimal-gallery/studio.html`.

If your repository name or GitHub account differs, use the actual Pages URL.

## Part F — First deployment checks

1. Open `https://YOUR-RENDER-SERVICE.onrender.com/health`. Expected JSON: `{"ok":true}`.
2. Open `https://YOUR-RENDER-SERVICE.onrender.com/api/status`. It should identify **Cloudflare R2 single bucket + Supabase**.
3. Open the GitHub Pages admin URL and sign in using the Render `ADMIN_USERNAME` and `ADMIN_PASSWORD` values.
4. Upload one disposable test photo that is at least 6 megapixels and no larger than 100 MB.
5. In Cloudflare R2 → `xe-gallery`, confirm an original object and a `gallery/thumbs/` WebP thumbnail appear.
6. Open the public gallery and confirm the image loads. Test download if enabled.
7. Test replace and individual delete using disposable test photos. Confirm the relevant objects disappear from R2.
8. Test **Delete All** only with disposable test photos. It deletes every object under the `gallery/` prefix in the configured R2 bucket, and also the legacy B2 `gallery/` prefix if B2 credentials are configured. It does not delete unrelated prefixes in either bucket.

## How this edition handles photos

- One R2 bucket only: `xe-gallery`.
- New original images and WebP thumbnails are stored under the `gallery/` prefix.
- Thumbnail generation: maximum 640 × 640 fit-inside, WebP quality 65.
- Original image files are retained for download; no automatic expiration is configured.
- Uploads are written to temporary disk storage on Render, processed one at a time per request, and then sent to R2.
- Admin login is enforced by the backend; JWT session expires after 8 hours.
- Public viewing/download links are signed and expire after one hour; the gallery requests fresh links when it reloads.
- Individual deletion removes the matching cloud objects before removing the Supabase row.
- Delete All is prefix-scoped to `gallery/`; it does not empty the entire bucket.
- Existing B2 photos remain readable through the optional legacy B2 connection.

## Cost and billing notes

Cloudflare R2 Standard currently includes monthly free usage of 10 GB-month storage, 1 million Class A operations, and 10 million Class B operations. Internet egress from R2 is free. Usage above the free allowances is billed at Cloudflare's published rates. The free allowance is shared at the Cloudflare account level; it is not multiplied by bucket count. Review the live pricing and billing pages before activating the subscription:

- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/r2/get-started/

The Render service and Supabase plan have their own limits/pricing, independent of R2. Render's temporary disk is used during uploads; it is not permanent photo storage.

## Security and operational cautions

- Keep the R2 bucket private and restrict the token to Object Read & Write on only `xe-gallery`.
- Keep Supabase service-role and all R2/B2 secrets only in Render Environment.
- Do not commit `.env` files or secrets to GitHub.
- Do not delete old B2 content until you have confirmed every old gallery image is migrated or intentionally removed.
- Do not run Delete All on a real gallery until the disposable-photo test passes.
- The package has passed local JavaScript syntax checks, but it has not been connected to your Cloudflare, Supabase, Render, or GitHub accounts and has not been end-to-end tested in your deployment. Follow the test checklist before using it with real photos.
