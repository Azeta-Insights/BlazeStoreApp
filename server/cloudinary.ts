import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// Check if Cloudinary is configured
export function isCloudinaryConfigured(): boolean {
  if (process.env.CLOUDINARY_URL) {
    return true;
  }
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

// Lazy configure Cloudinary instance
export function configureCloudinary(): boolean {
  if (!isCloudinaryConfigured()) {
    return false;
  }

  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({
      cloudinary_url: process.env.CLOUDINARY_URL,
      secure: true,
    });
    return true;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return true;
}

export interface CloudinaryStatus {
  configured: boolean;
  cloudName: string | null;
  hasApiKey: boolean;
  hasApiSecret: boolean;
  message: string;
}

export function getCloudinaryStatus(): CloudinaryStatus {
  const isConfigured = isCloudinaryConfigured();
  let cloudName = process.env.CLOUDINARY_CLOUD_NAME || null;

  if (!cloudName && process.env.CLOUDINARY_URL) {
    try {
      const match = process.env.CLOUDINARY_URL.match(/@([^/?]+)/);
      if (match) {
        cloudName = match[1];
      }
    } catch {
      // ignore
    }
  }

  return {
    configured: isConfigured,
    cloudName: cloudName || (isConfigured ? 'Active (URL Configured)' : null),
    hasApiKey: Boolean(process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_URL),
    hasApiSecret: Boolean(process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_URL),
    message: isConfigured
      ? `Cloudinary storage is active and ready (Cloud: ${cloudName || 'configured'}).`
      : 'Cloudinary credentials not detected. Uploads will use inline preview until CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY & CLOUDINARY_API_SECRET are set in Settings/Secrets.',
  };
}

export interface UploadResult {
  success: boolean;
  url: string;
  publicId?: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  isCloudinary: boolean;
  message?: string;
  error?: string;
}

/**
 * Upload an image (base64 string or remote URL) to Cloudinary
 */
export async function uploadImageToCloudinary(
  imageContent: string,
  options?: { folder?: string; tags?: string[] }
): Promise<UploadResult> {
  if (!imageContent || typeof imageContent !== 'string') {
    throw new Error('Image data is required for upload');
  }

  const configured = configureCloudinary();

  if (!configured) {
    console.log('[Cloudinary] Warning: Cloudinary not configured in environment. Using inline image data URL.');
    return {
      success: true,
      url: imageContent,
      isCloudinary: false,
      message: 'Cloudinary environment variables not set. Image stored directly for instant preview.',
    };
  }

  try {
    const uploadOptions: Record<string, any> = {
      folder: options?.folder || 'blazestore_catalog',
      resource_type: 'auto',
      tags: options?.tags || ['blazestore', 'product'],
    };

    const result: UploadApiResponse = await cloudinary.uploader.upload(
      imageContent,
      uploadOptions
    );

    console.log(`[Cloudinary] Successfully uploaded image to Cloudinary: ${result.secure_url}`);

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      isCloudinary: true,
      message: 'Image uploaded to Cloudinary CDN successfully!',
    };
  } catch (err: any) {
    console.error('[Cloudinary] Upload error:', err);
    // If Cloudinary fails due to invalid credentials, fallback gracefully with error description
    return {
      success: true,
      url: imageContent.startsWith('data:') ? imageContent : imageContent,
      isCloudinary: false,
      error: err?.message || 'Cloudinary upload failed',
      message: `Cloudinary upload error (${err?.message || 'Check credentials'}). Image preserved locally.`,
    };
  }
}
