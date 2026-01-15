# Amazon S3 Storage Setup Guide

Complete step-by-step guide for implementing S3 as your sole storage provider, replacing Firebase and Supabase.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [AWS Setup](#aws-setup)
3. [Installation](#installation)
4. [Implementation](#implementation)
5. [Configuration](#configuration)
6. [Testing](#testing)
7. [Production Considerations](#production-considerations)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Active AWS account
- Node.js project (already set up)
- Basic understanding of AWS IAM
- AWS CLI installed (optional but recommended)

---

## AWS Setup

### Step 1: Create S3 Bucket

1. **Log into AWS Console**
   - Navigate to [AWS S3 Console](https://console.aws.amazon.com/s3/)
   - Click "Create bucket"

2. **Bucket Configuration**

   ```
   Bucket name: self-risen-storage (must be globally unique)
   AWS Region: us-east-1 (or your preferred region)

   Object Ownership: ACLs disabled (recommended)

   Block Public Access settings:
   ✓ Block all public access (CHECKED)

   Bucket Versioning: Disabled (or enable for backup)

   Default encryption:
   ✓ Server-side encryption with Amazon S3 managed keys (SSE-S3)

   Advanced settings:
   Object Lock: Disabled
   ```

3. **Click "Create bucket"**

### Step 2: Configure Bucket CORS (Optional - for direct browser uploads)

1. Select your bucket → Permissions tab → CORS
2. Add CORS configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### Step 3: Create IAM User for Application

1. **Navigate to IAM Console**
   - Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
   - Click "Users" → "Add users"

2. **User Details**

   ```
   User name: self-risen-storage-user
   Access type: ✓ Programmatic access
   ```

3. **Set Permissions**
   - Choose "Attach existing policies directly"
   - Click "Create policy"

4. **Create Custom Policy**

   Click "JSON" tab and paste:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "S3StorageAccess",
         "Effect": "Allow",
         "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket", "s3:GetObjectAttributes"],
         "Resource": ["arn:aws:s3:::self-risen-storage", "arn:aws:s3:::self-risen-storage/*"]
       }
     ]
   }
   ```

   ```
   Policy name: SelfRisenS3StoragePolicy
   Description: Allows full object access to self-risen-storage bucket
   ```

5. **Attach Policy to User**
   - Go back to user creation
   - Search for "SelfRisenS3StoragePolicy"
   - Check the policy
   - Click "Next" → "Create user"

6. **Save Credentials**

   ```
   ⚠️ IMPORTANT: Download the CSV or copy these values immediately

   Access key ID: AKIAIOSFODNN7EXAMPLE
   Secret access key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   ```

---

## Installation

### Step 1: Install AWS SDK

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### Step 2: Verify Installation

Check your `package.json`:

```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.x.x",
    "@aws-sdk/s3-request-presigner": "^3.x.x"
  }
}
```

---

## Implementation

### Step 1: Update Storage Service Enum

**File: `src/common/storage/storage.service.ts`**

```typescript
export enum StorageProvider {
  S3 = 's3',
}
```

Remove FIREBASE and SUPABASE entries.

### Step 2: Create S3 Storage Service

**File: `src/common/storage/s3-storage.service.ts`**

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { FileType, UploadResult } from './storage.service';

@Injectable()
export class S3StorageService {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  // Allowed MIME types for each file type
  private readonly ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ];

  private readonly ALLOWED_AUDIO_TYPES = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/aac',
    'audio/webm',
  ];

  private readonly ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    'video/ogg',
  ];

  // Max file sizes (in bytes)
  private readonly MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

  constructor() {
    this.initialize();
  }

  private initialize() {
    const region = config.AWS_REGION;
    const accessKeyId = config.AWS_ACCESS_KEY_ID;
    const secretAccessKey = config.AWS_SECRET_ACCESS_KEY;
    const bucketName = config.S3_BUCKET_NAME;

    if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error(
        'S3 configuration is missing. Please configure AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET_NAME in your environment variables.',
      );
    }

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.bucketName = bucketName;
    this.region = region;

    console.log(`[S3StorageService] Initialized with bucket: ${this.bucketName} in region: ${this.region}`);
  }

  /**
   * Validate file type and size
   */
  private validateFile(file: Express.Multer.File, fileType: FileType): void {
    const allowedTypes =
      fileType === FileType.IMAGE
        ? this.ALLOWED_IMAGE_TYPES
        : fileType === FileType.AUDIO
          ? this.ALLOWED_AUDIO_TYPES
          : this.ALLOWED_VIDEO_TYPES;

    const maxSize =
      fileType === FileType.IMAGE
        ? this.MAX_IMAGE_SIZE
        : fileType === FileType.AUDIO
          ? this.MAX_AUDIO_SIZE
          : this.MAX_VIDEO_SIZE;

    // Check MIME type
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid file type. Allowed types for ${fileType}: ${allowedTypes.join(', ')}`);
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      throw new BadRequestException(`File size exceeds maximum allowed size of ${maxSizeMB}MB for ${fileType}`);
    }
  }

  /**
   * Generate a unique file path
   */
  private generateFilePath(fileType: FileType, userId: string, originalName: string, folder?: string): string {
    const timestamp = Date.now();
    const fileExtension = originalName.split('.').pop();
    const fileName = `${uuidv4()}-${timestamp}.${fileExtension}`;

    if (folder) {
      return `${fileType}s/${folder}/${userId}/${fileName}`;
    }

    return `${fileType}s/${userId}/${fileName}`;
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(
    file: Express.Multer.File,
    fileType: FileType,
    userId: string,
    folder?: string,
  ): Promise<UploadResult> {
    console.log(
      `[S3StorageService.uploadFile] Starting upload - FileType: ${fileType}, UserId: ${userId}, Folder: ${folder}`,
    );

    // Validate file
    this.validateFile(file, fileType);

    // Generate file path
    const filePath = this.generateFilePath(fileType, userId, file.originalname, folder);
    console.log(`[S3StorageService.uploadFile] Generated file path: ${filePath}`);

    try {
      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
          fileType,
        },
        // Server-side encryption
        ServerSideEncryption: 'AES256',
      });

      await this.s3Client.send(command);
      console.log(`[S3StorageService.uploadFile] File uploaded successfully`);

      // Generate signed URL (valid for 7 days - S3 maximum)
      const signedUrl = await this.getSignedUrl(filePath, 604800); // 7 days in seconds

      return {
        url: signedUrl,
        path: filePath,
        fileName: file.originalname,
        contentType: file.mimetype,
        size: file.size,
      };
    } catch (error) {
      console.error(`[S3StorageService.uploadFile] Upload error:`, error);
      throw new BadRequestException(`Failed to upload file to S3: ${error.message}`);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: Express.Multer.File[],
    fileType: FileType,
    userId: string,
    folder?: string,
  ): Promise<UploadResult[]> {
    console.log(`[S3StorageService.uploadFiles] Uploading ${files.length} files`);

    const uploadPromises = files.map((file) => this.uploadFile(file, fileType, userId, folder));

    return Promise.all(uploadPromises);
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(filePath: string): Promise<void> {
    console.log(`[S3StorageService.deleteFile] Deleting file: ${filePath}`);

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
      });

      await this.s3Client.send(command);
      console.log(`[S3StorageService.deleteFile] File deleted successfully`);
    } catch (error) {
      console.error(`[S3StorageService.deleteFile] Delete error:`, error);
      throw new BadRequestException(`Failed to delete file from S3: ${error.message}`);
    }
  }

  /**
   * Get a signed URL for a file
   * @param filePath - Path to the file in S3
   * @param expiresIn - Expiration time in seconds (max 604800 = 7 days)
   */
  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
      });

      // S3 signed URLs have a maximum expiration of 7 days (604800 seconds)
      const maxExpiry = 604800;
      const actualExpiry = Math.min(expiresIn, maxExpiry);

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: actualExpiry,
      });

      return signedUrl;
    } catch (error) {
      console.error(`[S3StorageService.getSignedUrl] Error:`, error);
      throw new BadRequestException(`Failed to get signed URL from S3: ${error.message}`);
    }
  }
}
```

### Step 3: Simplify Storage Service

**File: `src/common/storage/storage.service.ts`**

Replace the entire file with:

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { S3StorageService } from './s3-storage.service';

export enum FileType {
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
}

export enum StorageProvider {
  S3 = 's3',
}

export interface UploadResult {
  url: string;
  path: string;
  fileName: string;
  contentType: string;
  size: number;
}

@Injectable()
export class StorageService {
  constructor(private readonly s3Service: S3StorageService) {
    console.log('[StorageService] Initialized with S3 storage provider');
  }

  async uploadFile(
    file: Express.Multer.File,
    fileType: FileType,
    userId: string,
    folder?: string,
  ): Promise<UploadResult> {
    return this.s3Service.uploadFile(file, fileType, userId, folder);
  }

  async uploadFiles(
    files: Express.Multer.File[],
    fileType: FileType,
    userId: string,
    folder?: string,
  ): Promise<UploadResult[]> {
    return this.s3Service.uploadFiles(files, fileType, userId, folder);
  }

  async deleteFile(filePath: string): Promise<void> {
    return this.s3Service.deleteFile(filePath);
  }

  async getSignedUrl(filePath: string, expiresIn: string = '1h'): Promise<string> {
    const expiresInSeconds = this.parseExpiresIn(expiresIn);
    return this.s3Service.getSignedUrl(filePath, expiresInSeconds);
  }

  /**
   * Parse expiresIn string (e.g., '1h', '1d') to seconds
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 3600; // Default 1 hour

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    const seconds = value * (multipliers[unit] || 3600);

    // Cap at 7 days (S3 maximum)
    return Math.min(seconds, 604800);
  }
}
```

### Step 4: Update Storage Module

**File: `src/common/storage/storage.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { S3StorageService } from './s3-storage.service';

@Module({
  controllers: [StorageController],
  providers: [S3StorageService, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
```

### Step 5: Update Storage Controller (No Changes Needed)

Your existing `storage.controller.ts` should work without any modifications.

### Step 6: Update DTOs Export

**File: `src/common/storage/dto/index.ts`**

```typescript
export * from './upload-file.dto';
```

---

## Configuration

### Step 1: Add Environment Variables

**File: `.env`**

```env
# Storage Provider
STORAGE_PROVIDER=s3

# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET_NAME=self-risen-storage
```

**⚠️ Security Notes:**

- Never commit `.env` to version control
- Add `.env` to `.gitignore`
- Use different credentials for dev/staging/production

### Step 2: Update Config File

**File: `src/common/config.ts`**

Add these configuration values:

```typescript
export const config = {
  // ... existing config

  // Storage Configuration
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || 's3',

  // AWS S3 Configuration
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
};
```

### Step 3: Environment-Specific Configuration

**Development (`.env.development`):**

```env
STORAGE_PROVIDER=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=YOUR_DEV_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_DEV_SECRET_KEY
S3_BUCKET_NAME=self-risen-storage-dev
```

**Production (`.env.production`):**

```env
STORAGE_PROVIDER=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=YOUR_PROD_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_PROD_SECRET_KEY
S3_BUCKET_NAME=self-risen-storage-prod
```

---

## Testing

### Step 1: Test Upload Endpoint

**Using cURL:**

```bash
# Get Firebase auth token first
TOKEN="your-firebase-auth-token"

# Upload image
curl -X POST http://localhost:3000/storage/upload/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "folder=profile"
```

**Expected Response:**

```json
{
  "message": "Image uploaded successfully",
  "data": {
    "url": "https://self-risen-storage.s3.us-east-1.amazonaws.com/images/profile/user123/uuid-timestamp.jpg?X-Amz-...",
    "path": "images/profile/user123/abc123-1234567890.jpg",
    "fileName": "image.jpg",
    "contentType": "image/jpeg",
    "size": 245678
  }
}
```

### Step 2: Test Multiple File Upload

```bash
curl -X POST http://localhost:3000/storage/upload/images \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@/path/to/image1.jpg" \
  -F "files=@/path/to/image2.jpg" \
  -F "folder=gallery"
```

### Step 3: Test File Deletion

```bash
# Use the 'path' from upload response
curl -X DELETE "http://localhost:3000/storage/images%2Fprofile%2Fuser123%2Fabc123-1234567890.jpg" \
  -H "Authorization: Bearer $TOKEN"
```

### Step 4: Verify in AWS Console

1. Go to [S3 Console](https://console.aws.amazon.com/s3/)
2. Click on your bucket: `self-risen-storage`
3. Navigate to folder structure: `images/profile/user123/`
4. Verify file exists with correct metadata

### Step 5: Check CloudWatch Logs (Optional)

If you have CloudWatch enabled:

```bash
aws logs tail /aws/s3/self-risen-storage --follow
```

---

## Production Considerations

### 1. Security Enhancements

**Enable Bucket Encryption:**

```bash
aws s3api put-bucket-encryption \
  --bucket self-risen-storage \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

**Enable Versioning:**

```bash
aws s3api put-bucket-versioning \
  --bucket self-risen-storage \
  --versioning-configuration Status=Enabled
```

**Enable Access Logging:**

```bash
# Create logging bucket first
aws s3 mb s3://self-risen-storage-logs

# Enable logging
aws s3api put-bucket-logging \
  --bucket self-risen-storage \
  --bucket-logging-status '{
    "LoggingEnabled": {
      "TargetBucket": "self-risen-storage-logs",
      "TargetPrefix": "access-logs/"
    }
  }'
```

### 2. Cost Optimization

**Lifecycle Policies** (Auto-delete old files):

```json
{
  "Rules": [
    {
      "Id": "DeleteOldTempFiles",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "images/temp/"
      },
      "Expiration": {
        "Days": 7
      }
    },
    {
      "Id": "TransitionToIA",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "STANDARD_IA"
        }
      ]
    }
  ]
}
```

Apply via AWS CLI:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket self-risen-storage \
  --lifecycle-configuration file://lifecycle.json
```

### 3. Performance Optimization

**CloudFront CDN Setup:**

1. Create CloudFront Distribution:

```bash
aws cloudfront create-distribution \
  --origin-domain-name self-risen-storage.s3.us-east-1.amazonaws.com \
  --default-root-object index.html
```

2. Update S3 Service to use CloudFront URLs:

```typescript
// In s3-storage.service.ts
private readonly CLOUDFRONT_DOMAIN = config.CLOUDFRONT_DOMAIN;

async uploadFile(...): Promise<UploadResult> {
  // ... upload logic ...

  // Use CloudFront URL instead of S3 URL
  const publicUrl = this.CLOUDFRONT_DOMAIN
    ? `https://${this.CLOUDFRONT_DOMAIN}/${filePath}`
    : signedUrl;

  return {
    url: publicUrl,
    // ...
  };
}
```

### 4. Monitoring

**CloudWatch Alarms:**

```bash
# Alert on high request count
aws cloudwatch put-metric-alarm \
  --alarm-name s3-high-requests \
  --alarm-description "S3 request count too high" \
  --metric-name NumberOfObjects \
  --namespace AWS/S3 \
  --statistic Average \
  --period 300 \
  --threshold 10000 \
  --comparison-operator GreaterThanThreshold
```

### 5. Backup Strategy

**Cross-Region Replication:**

```json
{
  "Role": "arn:aws:iam::ACCOUNT-ID:role/s3-replication-role",
  "Rules": [
    {
      "Status": "Enabled",
      "Priority": 1,
      "Filter": {},
      "Destination": {
        "Bucket": "arn:aws:s3:::self-risen-storage-backup",
        "ReplicationTime": {
          "Status": "Enabled",
          "Time": {
            "Minutes": 15
          }
        }
      }
    }
  ]
}
```

---

## Troubleshooting

### Issue 1: "Access Denied" Error

**Symptoms:**

```
BadRequestException: Failed to upload file to S3: Access Denied
```

**Solutions:**

1. **Check IAM Policy:**

```bash
aws iam get-user-policy \
  --user-name self-risen-storage-user \
  --policy-name SelfRisenS3StoragePolicy
```

2. **Verify Bucket Policy:**

```bash
aws s3api get-bucket-policy --bucket self-risen-storage
```

3. **Test Credentials:**

```bash
aws s3 ls s3://self-risen-storage \
  --profile self-risen
```

### Issue 2: "Bucket Does Not Exist" Error

**Symptoms:**

```
The specified bucket does not exist
```

**Solutions:**

1. **Verify bucket name in .env:**

```bash
echo $S3_BUCKET_NAME
```

2. **List buckets:**

```bash
aws s3 ls
```

3. **Check region:**

```bash
aws s3api get-bucket-location --bucket self-risen-storage
```

### Issue 3: Signed URLs Not Working

**Symptoms:**

- URL returns 403 Forbidden
- URL expired

**Solutions:**

1. **Check URL expiration:**
   - S3 signed URLs max out at 7 days (604800 seconds)
   - Verify expiration in URL parameters: `X-Amz-Expires=`

2. **Regenerate URL:**

```typescript
const newUrl = await storageService.getSignedUrl(filePath, '1h');
```

3. **Check system clock:**
   - AWS uses system time for signature
   - Ensure server time is accurate

### Issue 4: Large File Upload Fails

**Symptoms:**

```
Request Entity Too Large
```

**Solutions:**

1. **Increase NestJS body limit:**

```typescript
// main.ts
const app = await NestFactory.create(AppModule, {
  bodyParser: true,
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
```

2. **Use multipart upload for files > 100MB:**

```typescript
import { Upload } from '@aws-sdk/lib-storage';

const upload = new Upload({
  client: this.s3Client,
  params: {
    Bucket: this.bucketName,
    Key: filePath,
    Body: file.buffer,
  },
  queueSize: 4, // parallel uploads
  partSize: 5 * 1024 * 1024, // 5MB parts
});

await upload.done();
```

### Issue 5: CORS Errors

**Symptoms:**

```
Access to fetch at '...' from origin 'http://localhost:3000' has been blocked by CORS
```

**Solution:**

Update S3 bucket CORS:

```bash
aws s3api put-bucket-cors \
  --bucket self-risen-storage \
  --cors-configuration file://cors.json
```

**cors.json:**

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

---

## Additional Resources

### AWS Documentation

- [S3 Developer Guide](https://docs.aws.amazon.com/s3/)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [S3 Pricing](https://aws.amazon.com/s3/pricing/)

### Cost Estimation

```
Typical costs for moderate usage:
- Storage: $0.023/GB/month (first 50TB)
- PUT requests: $0.005 per 1,000 requests
- GET requests: $0.0004 per 1,000 requests
- Data transfer out: $0.09/GB (first 10TB)

Example: 100GB storage + 10k uploads/month + 100k downloads/month
= ~$3-5/month
```

### Migration Checklist

If migrating from Firebase/Supabase:

- [ ] Backup existing files
- [ ] Create S3 bucket
- [ ] Set up IAM user and policy
- [ ] Install AWS SDK packages
- [ ] Implement S3 service
- [ ] Update environment variables
- [ ] Test uploads in development
- [ ] Migrate existing files to S3
- [ ] Update application to use new URLs
- [ ] Monitor for errors
- [ ] Delete old storage after verification

---

## Summary

You now have a complete S3 storage implementation that:

✅ Uploads images, audio, and video files
✅ Validates file types and sizes
✅ Generates unique file paths
✅ Provides signed URLs for secure access
✅ Supports multiple file uploads
✅ Implements proper error handling
✅ Includes metadata tracking
✅ Uses server-side encryption

**Next Steps:**

1. Set up production bucket
2. Implement CloudFront CDN
3. Add lifecycle policies
4. Set up monitoring
5. Configure backups
