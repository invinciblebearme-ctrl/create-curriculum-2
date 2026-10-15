/**
 * 순수 JavaScript로 오프라인/테스트용 유효한 표준 다중 페이지 PDF 바이너리를 생성합니다.
 */
export function createSamplePdfBlob(title: string, author: string, pageCount: number, themeColor: string = '#2B4C7E'): Blob {
  // 간단한 표준 PDF 1.4 파일 바이너리 생성
  let objects: string[] = [];
  
  // 1: Catalog
  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
  
  // 2: Pages container (kids will be 3, 4, ... 2+pageCount)
  const pageRefs = Array.from({ length: pageCount }, (_, i) => `${3 + i * 2} 0 R`).join(' ');
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [${pageRefs}] /Count ${pageCount} >>\nendobj\n`);

  for (let i = 0; i < pageCount; i++) {
    const pageObjNum = 3 + i * 2;
    const contentObjNum = pageObjNum + 1;
    const pageNum = i + 1;

    // Page object (A4: 595 x 842 pt)
    objects.push(
      `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>\nendobj\n`
    );

    // Stream content
    const pageText = pageNum === 1
      ? `BT /F1 28 Tf 50 720 Td (${escapePdfText(title)}) Tj ET\nBT /F2 16 Tf 50 680 Td (Written by ${escapePdfText(author)}) Tj ET\nBT /F2 14 Tf 50 620 Td (3D FlipBook Online Library Demo Edition) Tj ET\nBT /F2 12 Tf 50 580 Td (Flip this page using your mouse drag, click, or touch swipe!) Tj ET`
      : `BT /F1 22 Tf 50 750 Td (Chapter ${pageNum - 1}: Page Overview) Tj ET\nBT /F2 14 Tf 50 700 Td (This is page ${pageNum} of ${pageCount} pages.) Tj ET\nBT /F2 12 Tf 50 650 Td (Experience smooth single-page 3D turning animation on PC and mobile.) Tj ET\nBT /F2 11 Tf 50 610 Td (Rendered with PDF.js and StPageFlip single-sheet portrait engine.) Tj ET`;

    // Visual decorations (Page border and header bar)
    const stream = `
q
0.95 0.95 0.93 rg 30 30 535 782 re f
0.2 0.3 0.5 rg 40 790 515 8 re f
0.8 0.8 0.8 RG 2 w 30 30 535 782 re S
Q
${pageText}
BT /F2 10 Tf 270 50 Td (- ${pageNum} -) Tj ET
`;

    const streamBytes = new TextEncoder().encode(stream);
    objects.push(
      `${contentObjNum} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream\nendobj\n`
    );
  }

  // Calculate xref offsets
  let pdf = `%PDF-1.4\n%âãÏÓ\n`;
  const offsets: number[] = [0]; // 0000000000 65535 f

  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += objects[i];
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (let i = 1; i <= objects.length; i++) {
    pdf += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return new Blob([pdf], { type: 'application/pdf' });
}

function escapePdfText(text: string): string {
  return text.replace(/[()\\]/g, (match) => '\\' + match);
}
