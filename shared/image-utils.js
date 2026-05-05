window.compressImage = async function (file, opts = {}) {
  const { maxEdge = 1920, quality = 0.85, skipUnderBytes = 500 * 1024 } = opts;
  if (!file || !file.type || !file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= maxEdge && file.size < skipUnderBytes) {
      bitmap.close && bitmap.close();
      return file;
    }
    const scale = Math.min(1, maxEdge / longest);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
    bitmap.close && bitmap.close();
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (!blob) return file;
    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
};
