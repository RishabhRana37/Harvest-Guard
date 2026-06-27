/**
 * Image processing pipeline for CropDoc AI
 * Resizes, compresses, and checks image for blur client-side.
 */

interface ProcessedImageResult {
  blob: Blob;
  isBlurry: boolean;
  variance: number;
  originalSize: number;
  compressedSize: number;
}

/**
 * Reads a File as an Image object
 */
const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
};

/**
 * Resizes and compresses an image to JPEG format at 80% quality
 */
export const resizeAndCompress = async (
  img: HTMLImageElement,
  maxDimension: number = 1280,
  quality: number = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;

    // Maintain aspect ratio while forcing max dimension
    if (width > height) {
      if (width > maxDimension) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      }
    } else {
      if (height > maxDimension) {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not get 2D canvas context.'));
      return;
    }

    // Draw image on canvas
    ctx.drawImage(img, 0, 0, width, height);

    // Compress to JPEG blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas compression failed.'));
        }
      },
      'image/jpeg',
      quality
    );
  });
};

/**
 * Checks if the image is blurry by calculating the variance of the Laplacian.
 * Operates on a small 128x128 canvas for uniform execution speed (~2-5ms).
 */
export const calculateBlurriness = (img: HTMLImageElement): { isBlurry: boolean; variance: number } => {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { isBlurry: false, variance: 999 };
  }

  // Draw scaled down image
  ctx.drawImage(img, 0, 0, size, size);
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  // 1. Convert to grayscale
  const gray = new Float32Array(size * size);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Standard luma coefficients
    gray[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // 2. Apply 3x3 Laplacian filter kernel:
  // [  0,  1,  0 ]
  // [  1, -4,  1 ]
  // [  0,  1,  0 ]
  const laplacian = new Float32Array((size - 2) * (size - 2));
  let sum = 0;
  let count = 0;

  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const idx = y * size + x;
      
      const val = 
        gray[idx - size] + // top
        gray[idx - 1] +    // left
        gray[idx + 1] +    // right
        gray[idx + size] - // bottom
        4 * gray[idx];     // center

      laplacian[count] = val;
      sum += val;
      count++;
    }
  }

  const mean = sum / count;

  // 3. Compute variance
  let varianceSum = 0;
  for (let i = 0; i < count; i++) {
    varianceSum += Math.pow(laplacian[i] - mean, 2);
  }
  
  const variance = varianceSum / count;
  
  // Recommended threshold: below 100 means blurry
  const BLURRY_THRESHOLD = 80;
  const isBlurry = variance < BLURRY_THRESHOLD;

  return { isBlurry, variance };
};

/**
 * Runs the full client image pipeline
 */
export const runImagePipeline = async (file: File): Promise<ProcessedImageResult> => {
  const img = await loadImage(file);
  
  // Compress
  const compressedBlob = await resizeAndCompress(img);
  
  // Check blur
  const { isBlurry, variance } = calculateBlurriness(img);

  return {
    blob: compressedBlob,
    isBlurry,
    variance,
    originalSize: file.size,
    compressedSize: compressedBlob.size,
  };
};
