/** Redimensiona una imagen en el navegador (JPEG). Reduce peso antes de subirla. */
export async function resizeImage(file: File, maxSize: number, quality: number): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("not-image");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no-canvas");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}

export async function resizeImageBlob(file: File, maxSize: number, quality: number): Promise<Blob> {
  const dataUrl = await resizeImage(file, maxSize, quality);
  const res = await fetch(dataUrl);
  return res.blob();
}
