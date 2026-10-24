// Turns a picked image file into a small square JPEG data URL (center-cropped),
// small enough to store directly in Firestore.
export async function fileToAvatar(file, size = 360, quality = 0.82) {
  if (!file.type.startsWith('image/')) throw Object.assign(new Error('Please choose an image file.'), { key: 'err.image' });
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(Object.assign(new Error('Could not read this image.'), { key: 'err.imageRead' }));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
