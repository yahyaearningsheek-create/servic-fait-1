import { jsPDF } from "jspdf";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadDataURL(dataURL: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataURL;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function imagesToPDF(
  imageDataURLs: string[],
  filename: string = "document.pdf"
): Promise<void> {
  if (imageDataURLs.length === 0) return;

  const firstImg = await loadImage(imageDataURLs[0]);
  const orientation = firstImg.width > firstImg.height ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "px", format: [firstImg.width, firstImg.height] });

  for (let i = 0; i < imageDataURLs.length; i++) {
    if (i > 0) {
      const img = await loadImage(imageDataURLs[i]);
      const ori = img.width > img.height ? "landscape" : "portrait";
      pdf.addPage([img.width, img.height], ori);
    }
    const img = await loadImage(imageDataURLs[i]);
    pdf.addImage(imageDataURLs[i], "PNG", 0, 0, img.width, img.height);
  }

  pdf.save(filename);
}
