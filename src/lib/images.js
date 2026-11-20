/**
 * Prepares a picture chosen by the user for upload: decodes it (applying the
 * camera's EXIF orientation), crops it to a centred square, scales it down and
 * re-encodes it as JPEG. The result carries no metadata, and the upload stays
 * small. The server validates and strips metadata again regardless.
 */
export class ImageDecodeError extends Error {}

export async function squareJpeg(file, { size = 512, quality = 0.88 } = {}) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ImageDecodeError('unsupported image');
  }
  const side = Math.min(bitmap.width, bitmap.height);
  const target = Math.min(size, side);
  const canvas = document.createElement('canvas');
  canvas.width = target;
  canvas.height = target;
  const context = canvas.getContext('2d');
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, target, target);
  bitmap.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new ImageDecodeError('could not encode image');
  return blob;
}
