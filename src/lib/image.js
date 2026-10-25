// Turns a picked image file into a square JPEG data URL, small enough to store directly in Firestore.
// Winner photos are kept large (800px) so the downloadable cards stay sharp; quality steps down if
// the result would be too big for a Firestore field.
const MAX_CHARS = 380000; // firestore.rules allows < 400000

export async function fileToAvatar(file, size = 800, quality = 0.86) {
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
    const out = Math.min(size, side);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = out;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    // portrait photos: crop a little above centre, where faces usually are
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) * 0.3, side, side, 0, 0, out, out);
    let q = quality;
    let data = canvas.toDataURL('image/jpeg', q);
    while (data.length > MAX_CHARS && q > 0.5) {
      q -= 0.08;
      data = canvas.toDataURL('image/jpeg', q);
    }
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}
