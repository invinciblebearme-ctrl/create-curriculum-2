import { pdfjsLib } from './pdfWorker';

export interface ExtractedCover {
  coverBlob: Blob;
  coverDataUrl: string;
  pageCount: number;
  width: number;
  height: number;
}

/**
 * 어떤 호스팅 환경(GitHub Pages, Cloudflare Pages, 로컬)에서도
 * 절대 경로와 서브패스를 자동 계산하여 정적 에셋의 정확한 절대 URL을 반환합니다.
 */
export function resolveAssetUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('blob:') || path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.replace(/^\//, '');
  const pathname = window.location.pathname;
  const baseDir = pathname.endsWith('/') ? pathname : pathname.substring(0, pathname.lastIndexOf('/') + 1);
  return `${window.location.origin}${baseDir}${cleanPath}`;
}


/**
 * PDF 파일의 첫 페이지를 읽어 썸네일 표지 Blob 및 메타데이터를 자동 생성합니다.
 */
export async function generateCoverFromPdf(pdfFile: File | Blob): Promise<ExtractedCover> {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;

  const pageCount = pdfDoc.numPages;
  const firstPage = await pdfDoc.getPage(1);

  // 표지 이미지용 적정 해상도 뷰포트 (너비 약 600px 기준)
  const unscaledViewport = firstPage.getViewport({ scale: 1.0 });
  const targetWidth = 600;
  const scale = targetWidth / unscaledViewport.width;
  const viewport = firstPage.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D 컨텍스트를 생성할 수 없습니다.');
  }

  await firstPage.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('표지 이미지 Blob 변환 실패'));
          return;
        }
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve({
          coverBlob: blob,
          coverDataUrl: dataUrl,
          pageCount,
          width: canvas.width,
          height: canvas.height,
        });
      },
      'image/jpeg',
      0.9
    );
  });
}

/**
 * 바이트 크기를 사람이 읽기 쉬운 문자열(KB, MB)로 변환
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
