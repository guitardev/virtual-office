// Isolated A4 PDF export helper: clones only the target document node into a dedicated
// A4-sized hidden iframe so the browser generates a clean A4 vector PDF without web UI chrome.

export interface A4PdfOptions {
  orientation?: "portrait" | "landscape";
  marginMm?: number;
}

export async function exportElementToA4Pdf(
  root: HTMLElement,
  title: string,
  options: A4PdfOptions = {}
): Promise<void> {
  const orientation = options.orientation || "portrait";
  const marginMm = options.marginMm ?? 12;

  const clone = root.cloneNode(true) as HTMLElement;
  clone.style.transform = "none";
  clone.style.margin = "0 auto";
  clone
    .querySelectorAll('.print\\:hidden, [data-pdf-ignore="true"]')
    .forEach((el) => el.remove());

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  const headStyles = Array.from(
    document.querySelectorAll('link[rel="stylesheet"], style')
  )
    .map((el) => el.outerHTML)
    .join("\n");

  const pageWidth = orientation === "landscape" ? "297mm" : "210mm";

  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>${title.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title>
  ${headStyles}
  <style>
    @page {
      size: A4 ${orientation};
      margin: ${marginMm}mm;
    }
    html, body {
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: 'TH Sarabun New', 'Sarabun', 'TH Sarabun PSK', sans-serif !important;
      font-size: 16pt;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .a4-pdf-root {
      width: 100%;
      max-width: ${pageWidth};
      margin: 0 auto;
      box-shadow: none !important;
      border: none !important;
    }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    thead { display: table-header-group; }
  </style>
</head>
<body>
  <div class="a4-pdf-root"></div>
</body>
</html>`);
  doc.close();

  const container = doc.querySelector(".a4-pdf-root");
  if (container) {
    container.appendChild(doc.importNode(clone, true));
  }

  // Wait briefly for stylesheets & fonts inside iframe to settle
  await new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    iframe.onload = () => setTimeout(done, 120);
    setTimeout(done, 450);
  });

  try {
    if (doc.fonts?.ready) {
      await Promise.race([
        doc.fonts.ready,
        new Promise((r) => setTimeout(r, 600)),
      ]);
    }
  } catch {
    // Ignore font readiness errors
  }

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 500);
  };

  win.onafterprint = cleanup;
  win.focus();
  win.print();
  // Fallback cleanup if onafterprint does not fire
  setTimeout(cleanup, 60000);
}
