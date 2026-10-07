# Google Sign-In setup

The website now supports Google OpenID Connect through the existing Neon-backed session system. To enable it in production, configure a Google OAuth **Web application** client and add its server-side credentials to the Render API service.

## 1. Create the Google OAuth client

In the Google Cloud Console, configure the OAuth consent screen and create an OAuth client ID with application type **Web application**. Add the public site origin as an authorized JavaScript origin if the console requests one. Add this exact authorized redirect URI:

```text
https://www.ushangachronicles.com/api/auth/google/callback
```

Google requires the redirect URI to match exactly. If the production `PUBLIC_SITE_URL` uses a different host, set `GOOGLE_REDIRECT_URI` to `<PUBLIC_SITE_URL>/api/auth/google/callback` and register that exact value instead. The callback must remain on the same public site origin so the existing session cookie is set in the correct browser context and the site's `/api/*` routing can deliver the callback to the API.

## 2. Add server environment variables in Render

In the Render dashboard, open the production API service for this repository and add:

| Variable | Value |
| --- | --- |
| `GOOGLE_CLIENT_ID` | The OAuth client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | The OAuth client secret from Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | `https://www.ushangachronicles.com/api/auth/google/callback` |

Do not put the client secret in frontend variables (for example, any `VITE_*` variable), source code, or chat. Keep it only in the backend service's protected environment. Save the environment changes and allow Render to restart/deploy the API.

The application uses `PUBLIC_SITE_URL` to construct the post-login redirect. If that variable is already set, keep it aligned with the host used in `GOOGLE_REDIRECT_URI`; do not replace an existing production value without checking its other uses.

## 3. Consent-screen availability

If the Google OAuth consent screen is still in **Testing**, only its configured test users can sign in. Follow Google's publishing and verification requirements before making the login available to everyone.

The sign-in requests only `openid`, `email`, and `profile`. It uses state, nonce, and PKCE validation; requires a verified Google email; creates a regular user account for a new address; and links an existing local account only when its email matches the verified Google email. Existing account roles are preserved, and disabled local accounts remain disabled.
