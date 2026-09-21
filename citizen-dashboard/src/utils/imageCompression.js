const DEFAULT_MAX_BYTES = 4 * 1024 * 1024;

const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('The selected file could not be decoded for compression.'));
    };

    image.src = objectUrl;
  });

const toFile = (blob, fileName, mimeType) => new File([blob], fileName, { type: mimeType, lastModified: Date.now() });

const loadDrawableImage = async (file) => {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Some browsers cannot create a bitmap for every supported image format.
      // Fall back to the browser Image decoder below.
    }
  }

  return loadImageFromFile(file);
};

const getImageDimensions = (image) => ({
  width: image.width || image.naturalWidth,
  height: image.height || image.naturalHeight,
});

export async function compressImage(file, maxBytes = DEFAULT_MAX_BYTES) {
  if (!file) {
    throw new Error('Please choose an image to continue.');
  }

  if (file.size <= maxBytes) {
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      wasCompressed: false,
    };
  }

  const image = await loadDrawableImage(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to prepare image compression in this browser.');
  }

  const { width: originalWidth, height: originalHeight } = getImageDimensions(image);
  let width = originalWidth;
  let height = originalHeight;
  const longestSide = Math.max(width, height);

  if (longestSide > 2560) {
    const ratio = 2560 / longestSide;
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));
  }

  try {
    for (let dimensionAttempt = 0; dimensionAttempt < 5; dimensionAttempt += 1) {
      canvas.width = width;
      canvas.height = height;

      // Canvas re-encoding strips EXIF (including GPS), so location must come from the location step,
      // never from EXIF on the client.
      if (file.type === 'image/png') {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
      }
      context.drawImage(image, 0, 0, width, height);

      for (const quality of [0.85, 0.75, 0.65, 0.55, 0.45]) {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

        if (blob && blob.size <= maxBytes) {
          const compressedFile = toFile(
            blob,
            `${(file.name || 'image').replace(/\.[^.]+$/, '')}.jpg`,
            'image/jpeg',
          );

          return {
            file: compressedFile,
            originalSize: file.size,
            compressedSize: compressedFile.size,
            wasCompressed: true,
          };
        }
      }

      if (width === 1 && height === 1) break;
      width = Math.max(1, Math.round(width * 0.85));
      height = Math.max(1, Math.round(height * 0.85));
    }
  } finally {
    image.close?.();
  }

  throw new Error('Unable to compress this image below 4 MB. Please choose a smaller image.');
}

export { DEFAULT_MAX_BYTES };
