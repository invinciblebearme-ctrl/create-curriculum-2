import * as pdfjsLib from 'pdfjs-dist';

// Use Vite's worker URL import for robust bundler resolution
// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  try {
    const resolvedUrl = new URL(pdfWorkerUrl, window.location.href).href;
    pdfjsLib.GlobalWorkerOptions.workerSrc = resolvedUrl;
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.6.82/pdf.worker.min.mjs`;
  }
}

export { pdfjsLib };
