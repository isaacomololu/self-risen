# Google Cloud Storage Setup Guide for Self-Risen

This document provides step-by-step instructions for setting up Google Cloud Storage for the Self-Risen project.

## Overview

The Self-Risen project uses **Google Cloud Storage (GCS)** for file storage, specifically for user avatar uploads. The implementation follows the project's design philosophy by:

- Extending `BaseService` for standardized error handling
- Using the service response pattern (`ServiceResponse<T>`)
- Following NestJS modular architecture
- Integrating with the existing Firebase authentication system
- Using dependency injection for cloud storage service

## Architecture

### Module Structure

```
src/common/storage/
├── cloud-storage.service.ts    # Core GCS service
├── cloud-storage.module.ts     # NestJS module
├── dto/
│   ├── upload-file.dto.ts     # Upload response DTO
│   └── index.ts
└── index.ts
```

### Key Components

1. **CloudStorageService**: Extends `BaseService` and provides:
   - `uploadFile()` - Upload files to GCS
   - `deleteFile()` - Delete files from GCS
   - `getSignedUrl()` - Generate temporary signed URLs
   - `getPublicUrl()` - Get public URL for files

2. **User Module Integration**:
   - `POST /user/avatar` - Upload avatar endpoint
   - `DELETE /user/avatar` - Delete avatar endpoint
   - File validation (type, size)
   - Automatic old avatar cleanup

## Prerequisites

- A Google Cloud Platform (GCP) account
- A GCP project created
- Billing enabled on your GCP project
- Node.js and pnpm installed locally
- Self-Risen backend running

## Step 1: Create a GCS Bucket

1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Go to **Cloud Storage** > **Buckets**
4. Click **Create Bucket**
5. Configure the bucket:
   - **Name:** Choose a unique bucket name (e.g., `self-risen-avatars`)
   - **Location type:** Choose based on your needs (recommended: same region as your deployment)
   - **Storage class:** Standard (for frequently accessed data)
   - **Access control:** Uniform (recommended)
   - **Public access:** Files will be publicly accessible via URLs
6. Click **Create**

## Step 2: Create a Service Account

1. In the Google Cloud Console, go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Configure the service account:
   - **Name:** `self-risen-storage` (or any descriptive name)
   - **Description:** "Service account for Self-Risen cloud storage operations"
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

## Step 4: Configure Environment Variables

1. Open the downloaded JSON key file
2. Copy the entire JSON content (it should be a single-line JSON object)
3. Update your `.env` file with the GCS configuration:

```env
# Google Cloud Storage Configuration
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account","project_id":"...","private_key":"..."}
```

**Important Notes:**
- `GOOGLE_CLOUD_PROJECT_ID`: Your GCP project ID
- `GOOGLE_CLOUD_STORAGE_BUCKET`: The bucket name you created in Step 1
- `GOOGLE_CLOUD_CREDENTIALS`: The entire JSON content from the service account key file (as a single-line string)
- Ensure the private key in the JSON has escaped newlines (`\\n` instead of actual newlines)

### Example Configuration

```env
GOOGLE_CLOUD_PROJECT_ID=self-risen-123456
GOOGLE_CLOUD_STORAGE_BUCKET=self-risen-avatars
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account","project_id":"self-risen-123456","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\\nMIIE...\\n-----END PRIVATE KEY-----\\n","client_email":"self-risen-storage@self-risen-123456.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/self-risen-storage%40self-risen-123456.iam.gserviceaccount.com"}
```

## Step 5: Verify the Setup

1. Start the server:
   ```bash
   pnpm run start:dev
   ```

2. Test avatar upload via the API:
   ```bash
   POST http://localhost:8080/user/avatar
   Content-Type: multipart/form-data
   Authorization: Bearer <your-firebase-jwt-token>

   Body:
   - file: <image-file> (jpg, jpeg, png, or gif, max 2MB)
   ```

3. Check your GCS bucket to verify the file was uploaded

## API Endpoints

### Upload Avatar

**Endpoint:** `POST /user/avatar`

**Authentication:** Required (Firebase JWT token)

**Request:**
- Method: `POST`
- Headers:
  - `Authorization: Bearer <firebase-jwt-token>`
  - `Content-Type: multipart/form-data`
- Body:
  - `file`: Image file (jpg, jpeg, png, or gif)

**File Specifications:**
- Max file size: 2MB
- Accepted formats: jpg, jpeg, png, gif
- Field name: `file`

**Response:**
```json
{
  "message": "Avatar uploaded successfully",
  "data": {
    "user": {
      "id": "uuid",
      "firebaseId": "firebase-uid",
      "name": "User Name",
      "email": "user@example.com",
      "avatar": "https://storage.googleapis.com/bucket-name/avatars/user-id-timestamp.jpg",
      ...
    },
    "file": {
      "fileName": "avatars/user-id-timestamp.jpg",
      "publicUrl": "https://storage.googleapis.com/bucket-name/avatars/user-id-timestamp.jpg",
      "size": 123456,
      "mimeType": "image/jpeg",
      "uploadedAt": "2025-11-15T12:00:00.000Z"
    }
  }
}
```

### Delete Avatar

**Endpoint:** `DELETE /user/avatar`

**Authentication:** Required (Firebase JWT token)

**Request:**
- Method: `DELETE`
- Headers:
  - `Authorization: Bearer <firebase-jwt-token>`

**Response:**
```json
{
  "message": "Avatar deleted successfully",
  "data": {
    "id": "uuid",
    "firebaseId": "firebase-uid",
    "name": "User Name",
    "email": "user@example.com",
    "avatar": null,
    ...
  }
}
```

## Implementation Details

### Service Layer (`CloudStorageService`)

The cloud storage service follows the project's design patterns:

```typescript
export class CloudStorageService extends BaseService {
  // Extends BaseService for error handling

  async uploadFile(file: Express.Multer.File, destination: string):
    Promise<ServiceResponse<UploadedFileMetadata>> {
    // Returns ServiceResponse<T> pattern
  }

  async deleteFile(fileName: string): Promise<ServiceResponse<boolean>> {
    // Consistent error handling via HandleError()
  }
}
```

### User Service Integration

The user service handles avatar uploads with automatic cleanup:

1. User uploads new avatar
2. Service checks for existing avatar
3. Old avatar is deleted from GCS (if exists)
4. New avatar is uploaded with timestamp
5. User record is updated with new avatar URL
6. Returns both user data and file metadata

### File Naming Convention

Avatars are stored with the following naming pattern:
```
avatars/{user-id}-{timestamp}.{extension}
```

Example: `avatars/abc123-1699999999999.jpg`

This ensures:
- Unique filenames per user
- No naming conflicts
- Easy identification of user avatars
- Chronological ordering

## Security Best Practices

1. **Never commit credentials:**
   - Add `.env` to `.gitignore` (already configured)
   - Never commit service account JSON files

2. **Rotate keys regularly:**
   - Generate new service account keys periodically
   - Delete old keys from GCP console

3. **Principle of least privilege:**
   - Only grant Storage Object Admin role
   - Don't use project owner credentials

4. **Monitor usage:**
   - Enable GCS audit logs to track storage operations
   - Set up alerts for unusual activity

5. **File validation:**
   - Server validates file type and size
   - Malicious files are rejected before upload

6. **Environment variables:**
   - Use `.env.example` as template
   - Never share actual credentials

## Docker Deployment

If deploying with Docker, ensure environment variables are passed to the container:

### Option 1: Environment Variables in docker-compose.yml

```yaml
services:
  app:
    environment:
      - GOOGLE_CLOUD_PROJECT_ID=${GOOGLE_CLOUD_PROJECT_ID}
      - GOOGLE_CLOUD_STORAGE_BUCKET=${GOOGLE_CLOUD_STORAGE_BUCKET}
      - GOOGLE_CLOUD_CREDENTIALS=${GOOGLE_CLOUD_CREDENTIALS}
```

### Option 2: .env File

```yaml
services:
  app:
    env_file:
      - .env
```

## Troubleshooting

### Error: "Could not load the default credentials"

**Cause:** Service account credentials not properly configured

**Solution:**
- Verify `GOOGLE_CLOUD_CREDENTIALS` is set in `.env`
- Ensure JSON is valid (use JSON validator)
- Check that the JSON is properly escaped (newlines as `\\n`)

### Error: "Permission denied"

**Cause:** Service account lacks necessary permissions

**Solution:**
- Verify service account has **Storage Object Admin** role
- Check bucket name matches `GOOGLE_CLOUD_STORAGE_BUCKET`
- Ensure service account has access to the bucket

### Error: "Bucket not found"

**Cause:** Bucket doesn't exist or wrong name

**Solution:**
- Verify bucket exists in GCP Console
- Check bucket name spelling in `.env`
- Ensure you're using the correct GCP project

### Files not uploading

**Possible causes and solutions:**
- **File size:** Check file is under 2MB
- **File type:** Verify file is jpg, jpeg, png, or gif
- **Authentication:** Ensure Firebase JWT token is valid
- **Network:** Check server logs for detailed error messages

### Avatar URL broken

**Possible causes:**
- File was deleted manually from GCS
- Bucket permissions changed
- URL format changed

**Solution:**
- Re-upload avatar via API
- Check bucket public access settings

## Cost Considerations

Google Cloud Storage pricing includes:

1. **Storage costs:** Based on data stored per month
   - Standard storage: ~$0.020 per GB/month

2. **Network costs:** For data egress (downloads)
   - First 1 GB free per month
   - Additional: $0.12 per GB (varies by region)

3. **Operations costs:** For API requests
   - Class A (writes): $0.05 per 10,000 operations
   - Class B (reads): $0.004 per 10,000 operations

For small projects with typical usage:
- 100 users with avatars (average 500KB each) = 50MB storage ≈ $0.001/month
- 1,000 avatar views/month = minimal egress cost
- Upload/delete operations = minimal cost

**Total estimated cost for small projects:** < $1/month

Monitor actual usage in the GCP Console under **Cloud Storage** > **Buckets** > **Usage**.

## Additional Resources

- [Google Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-service-accounts)
- [@google-cloud/storage NPM Package](https://www.npmjs.com/package/@google-cloud/storage)
- [NestJS File Upload](https://docs.nestjs.com/techniques/file-upload)

## Design Philosophy Alignment

This implementation follows Self-Risen's design patterns:

1. **Base Service Pattern:**
   - CloudStorageService extends `BaseService`
   - Uses `HandleError()` and `Results()` methods
   - Returns `ServiceResponse<T>` consistently

2. **Modular Architecture:**
   - Separate module (`CloudStorageModule`)
   - Exported service for dependency injection
   - Clean separation of concerns

3. **Error Handling:**
   - Follows NestJS exception handling
   - Consistent error response format
   - Proper HTTP status codes

4. **Authentication:**
   - Integrates with Firebase authentication
   - Uses `@FirebaseUser()` decorator
   - Route-level guards

5. **Configuration:**
   - Centralized config validation
   - Environment variable based
   - Startup validation via `setupConfig()`

---

**Last Updated:** 2025-11-15
**Author:** Claude Code
**Version:** 1.0.0
