# Firebase Credentials Setup - Issue Documentation

## Problem Summary

When trying to create users via the `/auth/signup` endpoint, the application was throwing the following error:

```
FirebaseAppError: Credential implementation provided to initializeApp() via the "credential" property failed to fetch a valid Google OAuth2 access token with the following error: "Could not load the default credentials."
```

## Initial Setup

The application uses:

- **Firebase Admin SDK** for backend authentication and user management
- **@alpha018/nestjs-firebase-auth** module for NestJS integration
- Environment variables for Firebase credentials (for production/Railway deployment)

## Investigation Flow

### Step 1: Initial Error - Missing Project ID

**Error:** `Unable to detect a Project Id in the current environment`

**Root Cause:** Firebase Admin SDK wasn't recognizing the credentials format. The credentials were being passed as a plain object instead of using `admin.credential.cert()`.

**Solution:** Wrapped credentials with `admin.credential.cert()` in `app.module.ts`:

```typescript
credential: admin.credential.cert(credentials as admin.ServiceAccount);
```

### Step 2: Migration to Environment Variables

**Requirement:** Move from JSON file to individual environment variables for better deployment practices.

**Changes Made:**

1. Updated `config.ts` to include individual Firebase environment variables:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_PRIVATE_KEY`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY_ID` (optional)
   - `FIREBASE_CLIENT_ID` (optional)

2. Updated `app.module.ts` to read credentials directly from `ConfigService` instead of using `loadFirebaseCredentials()` utility.

3. Ensured credentials use camelCase format (as required by Firebase Admin SDK):
   - `projectId` (not `project_id`)
   - `privateKey` (not `private_key`)
   - `clientEmail` (not `client_email`)

### Step 3: Credential Format Issues

**Error:** Still getting "Could not load the default credentials" even after credentials were being read correctly.

**Investigation:**

- Added debug logging to verify credentials were being read
- Verified private key format (newlines, markers)
- Tested credential object creation - **this worked!**
- Tested getting access token from credential - **this worked!**

**Discovery:** The credentials themselves were valid and working. The issue was with how the `@alpha018/nestjs-firebase-auth` module was using them.

### Step 4: Module Bug Discovery

**Investigation:** Examined the module's source code in `node_modules`:

**File:** `node_modules/@alpha018/nestjs-firebase-auth/dist/firebase/provider/firebase.provider.js`

**Bug Found (Line 25-35):**

```javascript
constructor(data) {
    this.data = data;
    if (data.base64) {
        this._app = initializeApp({ credential: ... });
    }
    else if (data.options) {
        this._app = initializeApp(this.data.options);  // Uses our credentials
    }
    // BUG: This ALWAYS runs and overwrites the above!
    this._app = getApps().length > 0 ? getApp() : initializeApp();
}
```

**The Problem:**

1. If `data.options` is provided, it initializes Firebase with our credentials
2. **But then** the last line always executes
3. If no apps exist, it calls `initializeApp()` without credentials → fails
4. If apps exist, it gets the existing app (which might not have credentials) → fails

**Why This Happens:**

- The module's logic is flawed - it should only use `getApp()` if it didn't already initialize
- The last line should be: `if (!this._app) { this._app = getApps().length > 0 ? getApp() : initializeApp(); }`

## Solutions Attempted

### Solution 1: Fix Credential Format

**Attempt:** Ensure credentials use correct camelCase format
**Result:** ✅ Credentials were correctly formatted, but issue persisted

### Solution 2: Use ConfigService Instead of Config Object

**Attempt:** Switch from `config` object to `ConfigService` to ensure proper loading
**Result:** ✅ Credentials were being read correctly, but issue persisted

### Solution 3: Initialize Firebase in main.ts

**Attempt:** Initialize Firebase Admin SDK directly in `main.ts` before NestJS app starts
**Result:** ⚠️ Partially worked - Firebase initialized, but module tried to reinitialize → duplicate app error

### Solution 4: Don't Pass Options When Firebase Already Initialized

**Attempt:** Check if Firebase is already initialized, and if so, don't pass `options` to the module
**Result:** ✅ **FINAL SOLUTION** - Module uses `getApp()` to get our properly initialized app

## Final Solution

### Implementation

**1. Initialize Firebase in `main.ts` (before NestJS app starts):**

```typescript
// Initialize Firebase Admin SDK BEFORE NestJS app starts
if (
  config.FIREBASE_PROJECT_ID &&
  config.FIREBASE_PRIVATE_KEY &&
  config.FIREBASE_CLIENT_EMAIL
) {
  if (admin.apps.length === 0) {
    const credentials = {
      projectId: config.FIREBASE_PROJECT_ID,
      privateKey: config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: config.FIREBASE_CLIENT_EMAIL,
      ...(config.FIREBASE_PRIVATE_KEY_ID && {
        privateKeyId: config.FIREBASE_PRIVATE_KEY_ID,
      }),
      ...(config.FIREBASE_CLIENT_ID && { clientId: config.FIREBASE_CLIENT_ID }),
    };

    admin.initializeApp({
      credential: admin.credential.cert(credentials),
      projectId: config.FIREBASE_PROJECT_ID,
    });
  }
}
```

**2. In `app.module.ts`, don't pass options if Firebase is already initialized:**

```typescript
useFactory: (configService: ConfigService) => {
  // If Firebase is already initialized in main.ts, don't pass options
  // The module's buggy code will use getApp() which will get our initialized app
  if (admin.apps.length > 0) {
    return {
      auth: {
        config: {
          extractor: ExtractJwt.fromAuthHeaderAsBearerToken(),
          checkRevoked: true,
          validateRole: true,
        },
      },
    };
  }
  // ... rest of the code for when Firebase isn't initialized
};
```

### How It Works

1. **main.ts** initializes Firebase Admin SDK with our credentials before the NestJS app starts
2. When the `@alpha018/nestjs-firebase-auth` module's `FirebaseProvider` constructor runs:
   - It checks `getApps().length > 0` → **true** (we initialized it)
   - It calls `getApp()` → gets our properly initialized app with credentials
   - It doesn't try to initialize again because we didn't pass `options`

3. The module uses our initialized Firebase app, which has the correct credentials
4. `auth().createUser()` and other Firebase operations work correctly

## Environment Variables Required

```env
FIREBASE_PROJECT_ID=self-risen
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@self-risen.iam.gserviceaccount.com

# Optional
FIREBASE_PRIVATE_KEY_ID=070c8aeda07bc46e16ca0b21a90810ef0e098f3f
FIREBASE_CLIENT_ID=104442878675304920605
```

**Important Notes:**

- `FIREBASE_PRIVATE_KEY` should be on a single line with literal `\n` characters (not actual newlines)
- The private key should be wrapped in quotes if it contains special characters
- The code automatically converts `\n` to actual newlines when processing

## Root Cause Summary

The `@alpha018/nestjs-firebase-auth` module (v1.8.0) has a bug in its `FirebaseProvider` constructor that:

1. Always overwrites the app initialization, even when credentials are provided
2. Doesn't properly check if an app was already initialized before trying to initialize again
3. Falls back to `initializeApp()` without credentials if no apps exist

**Workaround:** Initialize Firebase Admin SDK directly in `main.ts` before the module runs, so the module's buggy code uses `getApp()` to get our properly initialized app.

## Verification

To verify the setup is working:

1. Check console logs on startup:
   - "Initializing Firebase Admin SDK directly with credentials..."
   - "✓ Firebase Admin SDK initialized successfully with credentials"
   - "Firebase already initialized in main.ts, module will reuse existing app"

2. Test user creation via `/auth/signup` endpoint
3. Should successfully create users in Firebase Authentication

## Future Considerations

1. **Monitor for module updates:** Check if `@alpha018/nestjs-firebase-auth` releases a fix for this bug
2. **Alternative modules:** Consider switching to a different Firebase Admin SDK NestJS wrapper if this module continues to have issues
3. **Direct initialization:** Consider removing the module entirely and using Firebase Admin SDK directly if you only need basic authentication features

## Files Modified

1. `src/main.ts` - Added Firebase initialization before NestJS app starts
2. `src/app.module.ts` - Updated to handle already-initialized Firebase and use ConfigService
3. `src/common/config.ts` - Added individual Firebase environment variables
4. `src/common/firebase.utils.ts` - Updated to support individual env vars (kept for backward compatibility)

## Testing Checklist

- [x] Credentials are read from environment variables
- [x] Firebase Admin SDK initializes with credentials in main.ts
- [x] Module reuses existing Firebase app (doesn't try to reinitialize)
- [x] Credential test passes (can get access token)
- [x] User creation works (`auth().createUser()`)
- [x] No duplicate app initialization errors
