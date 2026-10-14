/** Peso máximo del archivo que se envía por correo (debe coincidir con la función). */
export const MAX_RECEIPT_BYTES = 3 * 1024 * 1024;
const MAX_SIDE_PX = 1600;
const JPEG_QUALITY = 0.8;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(blob);
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo abrir la imagen.'));
    };
    img.src = url;
  });
}

/**
 * Deja el comprobante listo para enviarse: las imágenes se reducen a ~1600 px
 * en JPEG (unos 200–400 KB); los PDF se envían tal cual si pesan poco.
 */
export async function prepareReceiptFile(file: File): Promise<{ mimeType: string; contentBase64: string }> {
  if (file.type === 'application/pdf') {
    if (file.size > MAX_RECEIPT_BYTES) {
      throw new Error('El PDF pesa más de 3 MB. Envía una captura de pantalla en su lugar.');
    }
    return { mimeType: file.type, contentBase64: await blobToBase64(file) };
  }

  const img = await loadImage(file);
  const scale = Math.min(1, MAX_SIDE_PX / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen.');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
  if (!blob) throw new Error('No se pudo procesar la imagen.');
  if (blob.size > MAX_RECEIPT_BYTES) {
    throw new Error('La imagen sigue siendo muy pesada. Prueba con una captura de pantalla.');
  }
  return { mimeType: 'image/jpeg', contentBase64: await blobToBase64(blob) };
}
