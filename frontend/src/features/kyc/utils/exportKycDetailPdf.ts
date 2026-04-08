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
 * Dynamic import keeps the main bundle smaller until the user exports.
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

  const imgData = canvas.toDataURL("image/png", 1.0);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 12;
  const imgWidth = pageWidth - 2 * marginX;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let y = 0;

  pdf.addImage(imgData, "PNG", marginX, y, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    y = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", marginX, y, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}
