# Get Firebase Web Config for Frontend

The **service account** you have is for the **backend only**. The frontend needs different credentials.

## Steps to get frontend credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project **lms-project-22d08**
3. Click the **gear icon** → **Project settings**
4. Scroll to **Your apps**
5. If you see a **Web app** (</> icon):
   - Click it and copy the `firebaseConfig` values
6. If you don't have a Web app:
   - Click **Add app** → **Web** (</>)
   - Register with a nickname (e.g. "LMS Web")
   - Copy the config

## You need these values

```javascript
const firebaseConfig = {
  apiKey: "AIza...",           // → VITE_FIREBASE_API_KEY
  authDomain: "lms-project-22d08.firebaseapp.com",
  projectId: "lms-project-22d08",
  storageBucket: "lms-project-22d08.appspot.com",
  messagingSenderId: "123456789",  // → VITE_FIREBASE_MESSAGING_SENDER_ID
  appId: "1:123456789:web:abc123"  // → VITE_FIREBASE_APP_ID
};
```

## Add to LMS/.env

```
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=lms-project-22d08.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=lms-project-22d08
VITE_FIREBASE_STORAGE_BUCKET=lms-project-22d08.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

## Summary

| Credential | Where it goes | Where to get it |
|------------|---------------|-----------------|
| Service account (project_id, client_email, private_key) | Backend `.env` | ✅ You have this |
| Web config (apiKey, appId, messagingSenderId) | Frontend `.env` | Firebase Console → Project Settings → Your apps → Web app |
