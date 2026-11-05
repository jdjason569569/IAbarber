/**
 * Re-encodes a picture as a JPEG whose longest side is at most `maxSide` pixels, so it uploads
 * quickly on a mobile connection. Pictures already small enough are only re-encoded.
 */
export function toJpegDataUrl(
  dataUrl: string,
  maxSide = 1024,
  quality = 0.85,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(
        1,
        maxSide / Math.max(image.naturalWidth, image.naturalHeight),
      );
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Canvas 2D context is not available'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    image.onerror = () => reject(new Error('The picture could not be loaded'));
    image.src = dataUrl;
  });
}
