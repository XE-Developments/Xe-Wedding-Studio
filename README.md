# XE Minimal Gallery — Root Branch Deployment

This package publishes the **frontend directly from the repository root** using standard GitHub Pages branch deployment. It uses:

- **GitHub Pages:** static public gallery and `studio.html` admin login
- **Render:** Node.js backend API (`backend/`)
- **Supabase:** gallery metadata and settings
- **Backblaze B2:** private cloud storage for original image files

There is no automatic photo expiry. Photos remain until an administrator deletes them. The admin panel supports individual deletion and a two-step **Delete all photos** action. Delete All removes objects under the dedicated `gallery/` prefix in the configured B2 bucket and their database records. Admin credentials and gallery settings remain.

## Important

This is a source/deployment package, not a service already configured in your accounts. You must create and configure GitHub, Render, Supabase and Backblaze B2. No third-party credentials are included. Never publish Supabase service-role keys or B2 application keys in GitHub or frontend files.

## 1. GitHub repository and Pages (root)

1. Create a **public** GitHub repository named `xe-minimal-gallery` (GitHub Pages on GitHub Free generally requires a public repository).
2. Extract this ZIP.
3. Upload the **contents of this folder** to the repository's top level. Do not upload the outer ZIP folder as an extra nested folder.
4. Confirm that the repository root directly contains `index.html`, `studio.html`, `config.js`, `assets/`, `backend/`, `render.yaml`, and `README.md`.
5. Open **Settings → Pages**.
6. Under **Build and deployment**, choose **Deploy from a branch**.
7. Branch: `main`; folder: `/(root)`; click **Save**.
8. GitHub Pages will publish the frontend from the repository root. No `pages.yml` or GitHub Actions workflow is needed.

The frontend URLs will be:
- `https://YOUR-GITHUB-USERNAME.github.io/xe-minimal-gallery/`
- `https://YOUR-GITHUB-USERNAME.github.io/xe-minimal-gallery/studio.html`

Because Pages publishes the repository root, files in `backend/` and the README are also publicly fetchable as static files. The backend source contains no secrets; keep all real credentials exclusively in Render environment variables. If you do not want backend source publicly visible, use a separate private repository for the backend and connect Render to that repository instead.

## 2. Supabase database

1. Create a project at https://supabase.com/ and save its database password securely.
2. Open **SQL Editor → New query**.
3. Copy all contents of `backend/supabase-schema.sql` into the editor and run it.
4. Open **Project Settings → API** (or API Keys) and copy the Project URL and `service_role` secret key. The service-role key belongs only in Render; never put it in `config.js` or GitHub.

The schema creates `gallery_settings` and `gallery_photos` with Row Level Security enabled and no public policies. The server accesses them using the service-role key.

## 3. Backblaze B2 cloud storage

1. Create/sign in at https://www.backblaze.com/b2/cloud-storage.html.
2. Create a **private bucket dedicated to this gallery** and note its name and region.
3. Under **App Keys**, create an application key restricted to this bucket, with the permissions needed for read, write, list and delete.
4. Save the Key ID and Application Key securely. Never put them in GitHub or frontend files.

Endpoint format: `https://s3.<region>.backblazeb2.com` (replace `<region>` with your actual bucket region). The application uses the `gallery/` object prefix. Delete All removes objects under that prefix, so keep this bucket dedicated to this gallery.

## 4. Render backend

1. Open https://render.com/ and connect the GitHub repository.
2. Choose **New → Web Service** and select this repository.
3. Set **Root Directory** to `backend`.
4. Runtime: Node. Build command: `npm install`. Start command: `npm start`.
5. Add these environment variables under the Render service's **Environment** tab:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `ALLOWED_ORIGIN` | `https://YOUR-GITHUB-USERNAME.github.io` |
| `ADMIN_USERNAME` | Your chosen admin username |
| `ADMIN_PASSWORD` | A long unique password |
| `JWT_SECRET` | A random secret of at least 40 characters |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role secret |
| `B2_ENDPOINT` | `https://s3.YOUR_REGION.backblazeb2.com` |
| `B2_REGION` | Your B2 bucket region |
| `B2_BUCKET` | Your private bucket name |
| `B2_KEY_ID` | Your B2 application Key ID |
| `B2_APPLICATION_KEY` | Your B2 application key |
| `MAX_FILE_SIZE_MB` | `100` |
| `MIN_IMAGE_PIXELS` | `6000000` |

Replace all placeholders. Do not include quote marks around values. Never share credentials in chat or commit them to GitHub. Create the service and wait for deployment.

6. Copy your Render service URL, for example `https://xe-gallery-api.onrender.com`.
7. Edit the root `config.js` in GitHub and replace the placeholder URL with your actual Render URL:

```js
window.XE_CONFIG = { API_BASE_URL: 'https://YOUR-ACTUAL-RENDER-URL' };
```

Commit the change. GitHub Pages will republish automatically from the root branch.

For a custom frontend domain, set `ALLOWED_ORIGIN` to that exact origin. Multiple allowed origins may be comma-separated if supported by your backend configuration.

## 5. Verify XE Studio

1. Open `https://YOUR-GITHUB-USERNAME.github.io/xe-minimal-gallery/studio.html`.
2. Sign in with the username and password configured in Render.
3. Use **Browse photographs** to select one or multiple files.
4. Test captions, ordering, replacement, appearance settings and sign-out.

The login token is held in browser session storage and expires after eight hours. The server authorizes every admin API operation. A hidden or renamed URL is not a replacement for authentication.

## 6. Required end-to-end checks before sharing

Use non-sensitive test photos:

- Open the public gallery in a private/incognito browser.
- Confirm the empty gallery loads.
- Verify an incorrect password is rejected.
- Upload a small image and an image over 6 MP.
- Verify original dimensions and file bytes are preserved.
- Confirm the image appears on the public gallery after refresh.
- Test original download, caption editing and reordering.
- Replace a photo and verify the replacement is displayed.
- Delete one photo; confirm it disappears from the gallery and its B2 object is deleted.
- Use Delete All with both confirmations; verify gallery records and all objects under `gallery/` are gone, while login and settings remain.
- Sign out and verify unauthenticated admin API calls are rejected.

Health check: `https://YOUR-RENDER-SERVICE.onrender.com/health` should return `{"ok":true}`.

## 7. Image handling and limits

- Configured maximum: 100 MB per image.
- Configured minimum resolution: 6 megapixels.
- Accepted formats: JPEG, PNG, WebP, AVIF and TIFF.
- The server reads dimensions but uploads original bytes to B2 without resizing or recompression.
- RAW camera formats such as CR2/CR3 are not accepted; export them as full-resolution JPEG or TIFF.
- Render's plan/proxy and the browser connection must support the selected upload size. Test large uploads before relying on the 100 MB limit.

## 8. Operations and limitations

- GitHub Pages is static hosting; it cannot run Node.js or store secrets. Privileged actions run through Render.
- Supabase stores metadata/settings; B2 stores image files.
- Render free instances may sleep while idle, increasing the first-request response time. Cloud files and database records remain in their services.
- Back up the Supabase database and keep credentials securely.
- If cloud deletion fails, the API should report an error; inspect Render logs and B2 before retrying. Do not assume deletion succeeded until verified.
- Delete All is destructive and irreversible. It deletes objects under `gallery/` in the configured bucket.
- The package has not been deployed into your accounts. Complete all end-to-end checks before sharing it publicly.

## Repository layout

```text
xe-minimal-gallery/        # GitHub Pages publishes this root
├── index.html
├── studio.html
├── config.js
├── .nojekyll
├── assets/
│   ├── styles.css
│   ├── gallery.js
│   └── admin.js
├── backend/               # Render Root Directory = backend
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   └── supabase-schema.sql
├── render.yaml
├── .gitignore
└── README.md
```
