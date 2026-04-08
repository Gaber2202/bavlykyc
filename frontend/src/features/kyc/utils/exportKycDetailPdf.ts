function sanitizeFilenamePart(s: string): string {
  return (
    s
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, "")
      .slice(0, 80) || "client"
  );
}

export function buildKycPdfFilename(r: { client_full_name: string; id: string }): string {
  const name = sanitizeFilenamePart(r.client_full_name);
  const idShort = r.id.replace(/-/g, "").slice(0, 12);
  return `KYC_${name}_${idShort}.pdf`;
}

/**
 * Rasterizes a prepared DOM node (logo + “Client details” + tables) into a multi-page A4 PDF.
 * Uses horizontal canvas slices per page — avoids the full-image + negative Y offset bug that
 * produced black bands and mid-row “tears” between pages.
 */
export async function exportKycDetailToPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: "#ffffff",
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - 2 * margin;
  const contentHeight = pageHeight - 2 * margin;

  /** Total height (mm) if the full canvas is drawn at `contentWidth`. */
  const imgHeightMm = (canvas.height * contentWidth) / canvas.width;
  /** Source pixels that correspond to 1 mm of printed height. */
  const pxPerMm = canvas.height / imgHeightMm;

  let yPx = 0;
  let pageIndex = 0;

  while (yPx < canvas.height) {
    if (pageIndex > 0) {
      pdf.addPage();
    }

    const remainingPx = canvas.height - yPx;
    const maxSlicePx = Math.floor(contentHeight * pxPerMm);
    const slicePx = Math.max(1, Math.min(maxSlicePx, remainingPx));

    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = slicePx;
    const ctx = sliceCanvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get canvas context");
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(
      canvas,
      0,
      yPx,
      canvas.width,
      slicePx,
      0,
      0,
      canvas.width,
      slicePx,
    );

    const sliceHeightMm = (slicePx / canvas.height) * imgHeightMm;
    const imgData = sliceCanvas.toDataURL("image/png", 1.0);
    pdf.addImage(imgData, "PNG", margin, margin, contentWidth, sliceHeightMm);

    yPx += slicePx;
    pageIndex += 1;
  }

  pdf.save(filename);
}
