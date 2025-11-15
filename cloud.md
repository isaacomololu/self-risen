# Google Cloud Storage Setup Guide

This document provides step-by-step instructions for setting up Google Cloud Storage for the Minasan project.

## Overview

The Minasan project uses **Google Cloud Storage (GCS)** for file storage, specifically for user avatar uploads. The implementation uses the `@google-cloud/storage` package to interact with a GCS bucket named `minasan`.

## Prerequisites

- A Google Cloud Platform (GCP) account
- A GCP project created
- Billing enabled on your GCP project
- Node.js and yarn installed locally

## Step 1: Create a GCS Bucket

1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Go to **Cloud Storage** > **Buckets**
4. Click **Create Bucket**
5. Configure the bucket:
   - **Name:** `minasan` (must match the hardcoded name in the code)
   - **Location type:** Choose based on your needs (recommended: same region as your Cloud Run deployment - `asia-southeast1`)
   - **Storage class:** Standard (for frequently accessed data)
   - **Access control:** Uniform (recommended)
   - **Public access:** Configure based on your needs (files will be publicly accessible via URLs)
6. Click **Create**

## Step 2: Create a Service Account

1. In the Google Cloud Console, go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Configure the service account:
   - **Name:** `minasan-storage` (or any descriptive name)
   - **Description:** "Service account for Minasan cloud storage operations"
4. Click **Create and Continue**
5. Grant the following role:
   - **Storage Object Admin** (roles/storage.objectAdmin) - allows read/write/delete operations
6. Click **Continue**, then **Done**

## Step 3: Generate Service Account Key

1. Find your newly created service account in the list
2. Click on the service account name
3. Go to the **Keys** tab
4. Click **Add Key** > **Create new key**
5. Select **JSON** as the key type
6. Click **Create**
7. The JSON key file will download automatically - **save this file securely**

## Step 4: Configure the Server

1. Rename the downloaded JSON key file to `gcp-key.json`
2. Move the file to the server root directory:
   ```
   minasan/server/gcp-key.json
   ```

3. **IMPORTANT:** Add `gcp-key.json` to your `.gitignore` to prevent committing credentials:
   ```bash
   echo "gcp-key.json" >> server/.gitignore
   ```

4. Copy the environment example file and configure it:
   ```bash
   cd server
   cp .env.example .env
   ```

5. Update the `.env` file with the correct path to your credentials:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=./gcp-key.json
   ```

## Step 5: Install Dependencies

Navigate to the server directory and install dependencies:

```bash
cd server
yarn install
```

This will install `@google-cloud/storage` along with other required packages.

## Step 6: Verify the Setup

The cloud storage service is located at:
- `server/src/core/Services/cloud-storage.service.ts`

It provides two main methods:
- `uploadFile(uploadedFile: File, destination: string)` - Uploads files to GCS
- `removeFile(fileName: string)` - Deletes files from GCS

## Step 7: Test the Integration

1. Start the server:
   ```bash
   yarn start:dev
   ```

2. Test avatar upload via the API:
   ```bash
   PATCH /users/me
   Content-Type: multipart/form-data
   Authorization: Bearer <your-jwt-token>

   Body:
   - avatar: <image-file> (jpg, jpeg, png, or gif, max 2MB)
   ```

3. Check your GCS bucket to verify the file was uploaded

## File Upload Specifications

- **Endpoint:** `PATCH /users/me`
- **File field name:** `avatar`
- **Accepted formats:** jpg, jpeg, png, gif
- **Max file size:** 2MB
- **Storage location:** `minasan` bucket in GCS
- **Access:** Files are publicly accessible via URLs like:
  ```
  https://storage.googleapis.com/minasan/<filename>
  ```

## Docker Deployment

If deploying with Docker, ensure the `gcp-key.json` file is available to the container:

### Option 1: Mount as Volume
```yaml
# In docker-compose.yml
volumes:
  - ./gcp-key.json:/app/gcp-key.json:ro
```

### Option 2: Use Secrets (Recommended for Production)
```yaml
# In docker-compose.yml
secrets:
  - gcp_credentials
```

## Production Deployment (GCP Cloud Run)

The project includes a `cloudbuild.yaml` for GCP Cloud Run deployment:

- **Project:** `duongle-279811`
- **Region:** `asia-southeast1`
- **Service:** Deployed via Cloud Build

When deploying to Cloud Run, you can:
1. Use Workload Identity (recommended) - no key file needed
2. Or mount the service account key as a secret in Cloud Run

## Troubleshooting

### Error: "Could not load the default credentials"
- Ensure `GOOGLE_APPLICATION_CREDENTIALS` is set correctly in `.env`
- Verify the `gcp-key.json` file exists in the specified path
- Check that the JSON key file is valid and not corrupted

### Error: "Permission denied"
- Verify the service account has the **Storage Object Admin** role
- Check that the bucket name is exactly `minasan`
- Ensure the service account has access to the bucket

### Error: "Bucket not found"
- Verify the bucket name is `minasan` (hardcoded in the application)
- Check that the bucket exists in your GCP project
- Ensure you're using the correct GCP project

### Files not uploading
- Check file size (must be under 2MB)
- Verify file type (must be jpg, jpeg, png, or gif)
- Check server logs for detailed error messages

## Security Best Practices

1. **Never commit credentials:** Always add `gcp-key.json` to `.gitignore`
2. **Rotate keys regularly:** Generate new service account keys periodically
3. **Principle of least privilege:** Only grant necessary permissions
4. **Monitor usage:** Enable GCS audit logs to track storage operations
5. **Use secrets management:** For production, use GCP Secret Manager or similar

## Cost Considerations

Google Cloud Storage pricing includes:
- **Storage costs:** Based on data stored per month
- **Network costs:** For data egress (downloads)
- **Operations costs:** For API requests (uploads, deletes, etc.)

For small projects, costs are typically minimal, but monitor usage in the GCP Console.

## Additional Resources

- [Google Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-service-accounts)
- [@google-cloud/storage NPM Package](https://www.npmjs.com/package/@google-cloud/storage)

## Implementation Details

### Key Files

1. **Cloud Storage Service:**
   - `server/src/core/Services/cloud-storage.service.ts`

2. **User Controller (Upload Endpoint):**
   - `server/src/modules/users/users.controller.ts:77`

3. **User Service (Avatar Management):**
   - `server/src/modules/users/users.service.ts`

### Upload Flow

1. User sends PATCH request to `/users/me` with avatar file
2. Multer middleware processes the multipart/form-data request
3. File is validated (type and size)
4. `CloudStorageService.uploadFile()` is called
5. File is uploaded to GCS with a timestamped filename
6. Public URL is generated and saved to user's profile
7. Old avatar (if exists) is deleted from GCS

---

**Last Updated:** 2025-11-15
