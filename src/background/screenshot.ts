import type { BoundingBox } from '../shared/types';

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onerror = () => reject(new Error('Could not read image data.'));
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Unexpected image output type.'));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBitmap(dataUrl: string): Promise<ImageBitmap> {
  const blob = await dataUrlToBlob(dataUrl);
  return createImageBitmap(blob);
}

async function captureTabDataUrl(windowId?: number): Promise<string> {
  return windowId === undefined
    ? chrome.tabs.captureVisibleTab({ format: 'png' })
    : chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
}

type CaptureOutputProfile = 'default' | 'clipboard';

interface EncodeOptions {
  maxDimension: number;
  format: 'image/jpeg' | 'image/png';
  quality?: number;
  maxLength?: number;
  secondPassScale?: number;
  secondPassQuality?: number;
}

const DEFAULT_FULL_ENCODE: EncodeOptions = {
  maxDimension: 1900,
  format: 'image/jpeg',
  quality: 0.8,
  maxLength: 420000,
  secondPassScale: 0.82,
  secondPassQuality: 0.7
};

const DEFAULT_CROP_ENCODE: EncodeOptions = {
  maxDimension: 1100,
  format: 'image/jpeg',
  quality: 0.82,
  maxLength: 260000,
  secondPassScale: 0.8,
  secondPassQuality: 0.72
};

const CLIPBOARD_FULL_ENCODE: EncodeOptions = {
  maxDimension: 3200,
  format: 'image/png'
};

const CLIPBOARD_CROP_ENCODE: EncodeOptions = {
  maxDimension: 3200,
  format: 'image/png'
};

function resolveEncodeOptions(profile: CaptureOutputProfile, kind: 'full' | 'crop'): EncodeOptions {
  if (profile === 'clipboard') {
    return kind === 'full' ? CLIPBOARD_FULL_ENCODE : CLIPBOARD_CROP_ENCODE;
  }
  return kind === 'full' ? DEFAULT_FULL_ENCODE : DEFAULT_CROP_ENCODE;
}

export interface CropGeometry {
  sx: number;
  sy: number;
  safeWidth: number;
  safeHeight: number;
  outputWidth: number;
  outputHeight: number;
}

export function resolveCropGeometry(input: {
  bitmapWidth: number;
  bitmapHeight: number;
  rect: BoundingBox;
  devicePixelRatio?: number;
  maxDimension?: number;
}): CropGeometry {
  const devicePixelRatio = input.devicePixelRatio ?? 1;
  const maxDimension = input.maxDimension ?? 1100;

  const sx = Math.max(0, Math.round(input.rect.x * devicePixelRatio));
  const sy = Math.max(0, Math.round(input.rect.y * devicePixelRatio));
  const sw = Math.max(1, Math.round(input.rect.width * devicePixelRatio));
  const sh = Math.max(1, Math.round(input.rect.height * devicePixelRatio));

  const safeWidth = Math.max(1, Math.min(sw, input.bitmapWidth - sx));
  const safeHeight = Math.max(1, Math.min(sh, input.bitmapHeight - sy));
  const scale = Math.min(1, maxDimension / Math.max(safeWidth, safeHeight));
  const outputWidth = Math.max(1, Math.round(safeWidth * scale));
  const outputHeight = Math.max(1, Math.round(safeHeight * scale));

  return {
    sx,
    sy,
    safeWidth,
    safeHeight,
    outputWidth,
    outputHeight
  };
}

async function encodeCanvas(canvas: OffscreenCanvas, options: EncodeOptions, qualityOverride?: number): Promise<string> {
  const blob =
    options.format === 'image/png'
      ? await canvas.convertToBlob({ type: options.format })
      : await canvas.convertToBlob({
          type: options.format,
          quality: qualityOverride ?? options.quality
        });

  return blobToDataUrl(blob);
}

async function compressDataUrl(dataUrl: string, options: EncodeOptions): Promise<string> {
  const bitmap = await dataUrlToBitmap(dataUrl);
  const scale = Math.min(1, options.maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not initialize compression canvas context.');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);

  let encoded = await encodeCanvas(canvas, options);

  if (options.maxLength && encoded.length > options.maxLength) {
    const secondPass = new OffscreenCanvas(
      Math.max(1, Math.round(width * (options.secondPassScale ?? 0.82))),
      Math.max(1, Math.round(height * (options.secondPassScale ?? 0.82)))
    );
    const secondContext = secondPass.getContext('2d');
    if (!secondContext) {
      return encoded;
    }
    secondContext.imageSmoothingEnabled = true;
    secondContext.imageSmoothingQuality = 'high';
    secondContext.drawImage(canvas, 0, 0, width, height, 0, 0, secondPass.width, secondPass.height);
    encoded = await encodeCanvas(secondPass, options, options.secondPassQuality);
  }

  return encoded;
}

async function cropDataUrl(
  dataUrl: string,
  rect: BoundingBox,
  devicePixelRatio = 1,
  options: EncodeOptions = DEFAULT_CROP_ENCODE
): Promise<string> {
  const bitmap = await dataUrlToBitmap(dataUrl);
  const geometry = resolveCropGeometry({
    bitmapWidth: bitmap.width,
    bitmapHeight: bitmap.height,
    rect,
    devicePixelRatio,
    maxDimension: options.maxDimension
  });

  const canvas = new OffscreenCanvas(geometry.outputWidth, geometry.outputHeight);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not initialize screenshot canvas context.');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    bitmap,
    geometry.sx,
    geometry.sy,
    geometry.safeWidth,
    geometry.safeHeight,
    0,
    0,
    geometry.outputWidth,
    geometry.outputHeight
  );

  let encoded = await encodeCanvas(canvas, options);

  if (options.maxLength && encoded.length > options.maxLength) {
    const secondPass = new OffscreenCanvas(
      Math.max(1, Math.round(geometry.outputWidth * (options.secondPassScale ?? 0.8))),
      Math.max(1, Math.round(geometry.outputHeight * (options.secondPassScale ?? 0.8)))
    );
    const secondContext = secondPass.getContext('2d');
    if (!secondContext) {
      return encoded;
    }
    secondContext.imageSmoothingEnabled = true;
    secondContext.imageSmoothingQuality = 'high';
    secondContext.drawImage(
      canvas,
      0,
      0,
      geometry.outputWidth,
      geometry.outputHeight,
      0,
      0,
      secondPass.width,
      secondPass.height
    );
    encoded = await encodeCanvas(secondPass, options, options.secondPassQuality);
  }

  return encoded;
}

export async function captureElementScreenshot(input: {
  windowId?: number;
  boundingBox: BoundingBox;
  devicePixelRatio?: number;
}): Promise<{ full: string; cropped: string }> {
  const fullRaw = await captureTabDataUrl(input.windowId);

  const [full, cropped] = await Promise.all([
    compressDataUrl(fullRaw, DEFAULT_FULL_ENCODE),
    cropDataUrl(fullRaw, input.boundingBox, input.devicePixelRatio ?? 1, DEFAULT_CROP_ENCODE)
  ]);

  return { full, cropped };
}

export async function captureVisibleScreenshot(input: {
  windowId?: number;
  outputProfile?: CaptureOutputProfile;
}): Promise<string> {
  const fullRaw = await captureTabDataUrl(input.windowId);
  const options = resolveEncodeOptions(input.outputProfile ?? 'default', 'full');
  return compressDataUrl(fullRaw, options);
}

export async function captureRegionScreenshot(input: {
  windowId?: number;
  boundingBox: BoundingBox;
  devicePixelRatio?: number;
  outputProfile?: CaptureOutputProfile;
}): Promise<string> {
  const fullRaw = await captureTabDataUrl(input.windowId);
  const options = resolveEncodeOptions(input.outputProfile ?? 'default', 'crop');
  return cropDataUrl(fullRaw, input.boundingBox, input.devicePixelRatio ?? 1, options);
}
