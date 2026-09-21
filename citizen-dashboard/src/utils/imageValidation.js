const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_ORIGINAL_SIZE_BYTES = 25 * 1024 * 1024;

const getFileExtension = (fileName = '') => {
  const match = /\.([a-z0-9]+)$/i.exec(fileName);
  return match ? `.${match[1].toLowerCase()}` : '';
};

const decodeImage = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('The selected file could not be read. Please choose a valid image.'));
    };

    image.src = objectUrl;
  });

export async function validateImage(file) {
  if (!file) {
    throw new Error('Please choose an image to continue.');
  }

  const extension = getFileExtension(file.name);
  const normalizedType = String(file.type || '').toLowerCase();
  const hasAllowedExtension = ALLOWED_EXTENSIONS.includes(extension);
  const hasAllowedMimeType = ALLOWED_IMAGE_TYPES.includes(normalizedType);

  if (!hasAllowedExtension || !hasAllowedMimeType) {
    throw new Error('Unsupported image type. Please upload JPG, JPEG, PNG, or WEBP.');
  }

  if (file.size > MAX_ORIGINAL_SIZE_BYTES) {
    throw new Error('Image is too large to process. Maximum original size is 25 MB.');
  }

  // Decoding catches both empty files and image data that has been corrupted.
  await decodeImage(file);

  return {
    file,
    isValid: true,
    mimeType: normalizedType || (extension === '.png' ? 'image/png' : 'image/jpeg'),
    extension,
  };
}

export { ALLOWED_IMAGE_TYPES, ALLOWED_EXTENSIONS, MAX_ORIGINAL_SIZE_BYTES };
