# Firebase web push setup

The site now supports Firebase Cloud Messaging (FCM) alerts for newly published products.

## 1. Create or select a Firebase project

In Firebase Console:

1. Open the project used for Ushanga Chronicles.
2. Add a **Web app** under Project settings.
3. Copy the web app configuration values.
4. Under **Cloud Messaging**, create a Web Push certificate key pair and copy the public VAPID key.
5. Enable the Firebase Cloud Messaging API in the linked Google Cloud project.
6. Create a service account with permission to send Firebase Cloud Messaging messages and download its JSON key.

## 2. Add frontend variables to Render

Add these as Render environment variables for the frontend build:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_VAPID_KEY
```

The web configuration and VAPID public key are safe to expose in the browser. They are not server secrets.

## 3. Add server variables to Render

Add these to the Render API service only:

```text
FCM_PROJECT_ID=your-firebase-project-id
FCM_SERVICE_ACCOUNT_JSON={the complete downloaded service-account JSON on one line}
```

Keep `FCM_SERVICE_ACCOUNT_JSON` private. Do not put it in the repository, frontend variables, or `VITE_*` variables.

The existing `RESEND_API_KEY` and `EMAIL_FROM` variables continue to control email delivery.

## 4. Customer experience

After deployment:

1. A public visitor sees **Get instant new-product alerts**.
2. They select **Enable alerts**.
3. The browser asks for notification permission.
4. The browser token is stored in Neon.
5. When an active product is created, the server sends an FCM alert immediately.
6. The Firebase service worker displays the alert even when the site is closed.

Customers must opt in once. Browsers that deny permission must be re-enabled from the browser's site notification settings.
