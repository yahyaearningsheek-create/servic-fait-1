import { loadImage } from "./pdfExport";

interface Annotation {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  strokeWidth: number;
  opacity: number;
  text?: string;
  points?: { x: number; y: number }[];
  fontSize?: number;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  align?: string;
  page: number;
}

export async function compositeAnnotationsToImage(
  pageImage: string,
  annotations: Annotation[],
  canvasWidth: number,
  canvasHeight: number
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d")!;

  const img = await loadImage(pageImage);
  ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

  for (const ann of annotations) {
    ctx.save();
    ctx.globalAlpha = ann.opacity;

    switch (ann.type) {
      case "highlight":
        ctx.fillStyle = ann.color;
        ctx.fillRect(ann.x, ann.y, ann.w, ann.h);
        break;

      case "underline":
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = ann.strokeWidth;
        ctx.beginPath();
        ctx.moveTo(ann.x, ann.y);
        ctx.lineTo(ann.x + ann.w, ann.y);
        ctx.stroke();
        break;

      case "strikethrough":
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = ann.strokeWidth;
        ctx.beginPath();
        ctx.moveTo(ann.x, ann.y);
        ctx.lineTo(ann.x + ann.w, ann.y);
        ctx.stroke();
        break;

      case "pencil":
      case "freehand":
        if (ann.points && ann.points.length > 1) {
          ctx.strokeStyle = ann.color;
          ctx.lineWidth = ann.strokeWidth;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(ann.x + ann.points[0].x, ann.y + ann.points[0].y);
          for (let i = 1; i < ann.points.length; i++) {
            ctx.lineTo(ann.x + ann.points[i].x, ann.y + ann.points[i].y);
          }
          ctx.stroke();
        }
        break;

      case "rect":
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = ann.strokeWidth;
        ctx.strokeRect(ann.x, ann.y, ann.w, ann.h);
        break;

      case "oval":
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = ann.strokeWidth;
        ctx.beginPath();
        ctx.ellipse(ann.x + ann.w / 2, ann.y + ann.h / 2, ann.w / 2, ann.h / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case "line":
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = ann.strokeWidth;
        ctx.beginPath();
        ctx.moveTo(ann.x, ann.y + ann.h / 2);
        ctx.lineTo(ann.x + ann.w, ann.y + ann.h / 2);
        ctx.stroke();
        break;

      case "arrow": {
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = ann.strokeWidth;
        ctx.beginPath();
        ctx.moveTo(ann.x, ann.y + ann.h / 2);
        ctx.lineTo(ann.x + ann.w, ann.y + ann.h / 2);
        ctx.stroke();
        const headLen = 12;
        const angle = Math.atan2(0, ann.w);
        ctx.beginPath();
        ctx.moveTo(ann.x + ann.w, ann.y + ann.h / 2);
        ctx.lineTo(
          ann.x + ann.w - headLen * Math.cos(angle - Math.PI / 6),
          ann.y + ann.h / 2 - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(ann.x + ann.w, ann.y + ann.h / 2);
        ctx.lineTo(
          ann.x + ann.w - headLen * Math.cos(angle + Math.PI / 6),
          ann.y + ann.h / 2 - headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
        break;
      }

      case "text":
        if (ann.text) {
          ctx.globalAlpha = 1;
          const fontStyle = `${ann.italic ? "italic " : ""}${ann.bold ? "bold " : ""}${ann.fontSize || 16}px ${ann.fontFamily || "Arial"}`;
          ctx.font = fontStyle;
          ctx.fillStyle = ann.color;
          ctx.textAlign = (ann.align as CanvasTextAlign) || "left";
          ctx.textBaseline = "top";
          const tx = ann.align === "center" ? ann.x + ann.w / 2 : ann.align === "right" ? ann.x + ann.w : ann.x;
          ctx.fillText(ann.text, tx, ann.y);
        }
        break;

      case "note":
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#fef9c3";
        ctx.strokeStyle = "#fde68a";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(ann.x, ann.y, ann.w, ann.h, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#92400e";
        ctx.font = "bold 9px Arial";
        ctx.textBaseline = "top";
        ctx.fillText("Note", ann.x + 8, ann.y + 8);
        if (ann.text) {
          ctx.font = "10px Arial";
          const lines = wrapText(ctx, ann.text, ann.w - 16);
          lines.forEach((line, i) => {
            ctx.fillText(line, ann.x + 8, ann.y + 24 + i * 14);
          });
        }
        break;

      case "stamp":
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(ann.x + ann.w / 2, ann.y + ann.h / 2);
        ctx.rotate(-15 * Math.PI / 180);
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(-ann.w / 2, -ann.h / 2, ann.w, ann.h, 8);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fill();
        ctx.fillStyle = ann.color;
        ctx.font = "bold 18px 'Arial Black', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(ann.text || "", 0, 0);
        ctx.restore();
        break;
    }

    ctx.restore();
  }

  return canvas.toDataURL("image/png");
}

export async function compositeSignatureToImage(
  pageImage: string,
  signatureImage: string | null,
  signatureText: string | null,
  signatureFont: string,
  signatureColor: string,
  position: { x: number; y: number; w: number; h: number },
  canvasWidth: number,
  canvasHeight: number
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d")!;

  const img = await loadImage(pageImage);
  ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

  const x = (position.x / 100) * canvasWidth;
  const y = (position.y / 100) * canvasHeight;
  const w = (position.w / 100) * canvasWidth;
  const h = (position.h / 100) * canvasHeight;

  if (signatureImage) {
    const sigImg = await loadImage(signatureImage);
    ctx.drawImage(sigImg, x, y, w, h);
  } else if (signatureText) {
    ctx.fillStyle = signatureColor;
    ctx.font = `${Math.min(h * 0.7, 32)}px ${signatureFont}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(signatureText, x + w / 2, y + h / 2);
  }

  return canvas.toDataURL("image/png");
}

export async function compositePageNumberToImage(
  pageImage: string,
  numberText: string,
  position: string,
  style: {
    fontFamily: string;
    fontSize: number;
    bold: boolean;
    italic: boolean;
    color: string;
    margin: number;
  },
  canvasWidth: number,
  canvasHeight: number
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d")!;

  const img = await loadImage(pageImage);
  ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

  const fontStyle = `${style.italic ? "italic " : ""}${style.bold ? "bold " : ""}${style.fontSize}px ${style.fontFamily}`;
  ctx.font = fontStyle;
  ctx.fillStyle = style.color;
  ctx.textBaseline = "top";

  const m = style.margin;
  const metrics = ctx.measureText(numberText);
  const tw = metrics.width;
  const th = style.fontSize;

  let tx: number;
  let ty: number;

  switch (position) {
    case "tl": tx = m; ty = m; break;
    case "tc": tx = (canvasWidth - tw) / 2; ty = m; break;
    case "tr": tx = canvasWidth - tw - m; ty = m; break;
    case "ml": tx = m; ty = (canvasHeight - th) / 2; break;
    case "mr": tx = canvasWidth - tw - m; ty = (canvasHeight - th) / 2; break;
    case "bl": tx = m; ty = canvasHeight - th - m; break;
    case "bc": tx = (canvasWidth - tw) / 2; ty = canvasHeight - th - m; break;
    case "br": tx = canvasWidth - tw - m; ty = canvasHeight - th - m; break;
    default: tx = (canvasWidth - tw) / 2; ty = canvasHeight - th - m; break;
  }

  ctx.fillStyle = style.color === "#ffffff" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.roundRect(tx - 8, ty - 4, tw + 16, th + 8, 4);
  ctx.fill();

  ctx.fillStyle = style.color;
  ctx.fillText(numberText, tx, ty);

  return canvas.toDataURL("image/png");
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}
