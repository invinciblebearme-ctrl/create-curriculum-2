import { generateCoverFromPdf } from './pdfUtils';

const THUMBNAIL_STORAGE_KEY_PREFIX = 'cf_flipbook_thumb_';

// 큐 관리: 브라우저 부하 방지를 위해 최대 2개씩 순차 처리
type Task = () => Promise<void>;
const queue: Task[] = [];
let activeCount = 0;
const MAX_CONCURRENT = 2;

function processQueue() {
  if (activeCount >= MAX_CONCURRENT || queue.length === 0) return;
  const task = queue.shift();
  if (task) {
    activeCount++;
    task().finally(() => {
      activeCount--;
      processQueue();
    });
  }
}

function enqueueTask(task: Task) {
  queue.push(task);
  processQueue();
}

/**
 * PDF URL로부터 썸네일 이미지를 안전하게 추출하고 IndexedDB/LocalStorage에 캐싱합니다.
 */
export async function getOrGenerateThumbnail(bookId: string, pdfUrl: string): Promise<string> {
  const cacheKey = THUMBNAIL_STORAGE_KEY_PREFIX + bookId;

  // 1. Check LocalStorage cache first
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached && cached.startsWith('data:image/')) {
      return cached;
    }
  } catch {}

  // 2. Fetch and generate in controlled queue
  return new Promise((resolve) => {
    enqueueTask(async () => {
      try {
        const res = await fetch(pdfUrl);
        if (!res.ok) throw new Error(`PDF Fetch 실패: ${res.status}`);
        const blob = await res.blob();
        const extracted = await generateCoverFromPdf(blob);

        // Store to cache (compressed dataUrl)
        try {
          localStorage.setItem(cacheKey, extracted.coverDataUrl);
        } catch {
          // If storage full, keep in memory
        }

        resolve(extracted.coverDataUrl);
      } catch (err) {
        console.warn(`[ThumbnailManager] ${bookId} 표지 생성 실패:`, err);
        resolve(''); // Fail gracefully to fallback cover
      }
    });
  });
}

/**
 * CREATE 모형 단원설계안 공식 벡터 표지 SVG 생성기
 * (실제 교재 느낌의 학년별 컬러와 정교한 타이포그래피)
 */
export function generateCreateBookSvgCover(title: string, category: string): string {
  // 학년별 시그니처 테마 컬러
  let primaryColor = '#7C63D8'; // 기본 퍼플
  let secondaryColor = '#EEE9FF';
  let badgeColor = '#FF6B9D';

  if (title.includes('1학년') || title.includes('2학년')) {
    primaryColor = '#E67E22'; // 1·2학년 오렌지/앰버
    secondaryColor = '#FEF5E7';
    badgeColor = '#D35400';
  } else if (title.includes('3학년') || title.includes('4학년')) {
    primaryColor = '#16A085'; // 3·4학년 틸/에메랄드
    secondaryColor = '#E8F8F5';
    badgeColor = '#0E6251';
  } else if (title.includes('5학년') || title.includes('6학년')) {
    primaryColor = '#2980B9'; // 5·6학년 블루
    secondaryColor = '#EAF2F8';
    badgeColor = '#1F618D';
  } else if (title.includes('길잡이')) {
    primaryColor = '#8E44AD'; // 길잡이 퍼플
    secondaryColor = '#F4ECF7';
    badgeColor = '#C2185B';
  }

  // 깔끔한 줄바꿈 처리
  const safeTitle = title.replace(/[<>&"']/g, '');
  let line1 = safeTitle;
  let line2 = '';
  if (safeTitle.length > 14) {
    line1 = safeTitle.slice(0, 14);
    line2 = safeTitle.slice(14);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="580" viewBox="0 0 400 580">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primaryColor}" />
      <stop offset="100%" stop-color="${badgeColor}" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.15" />
    </filter>
  </defs>

  <!-- Book Base Background -->
  <rect width="400" height="580" fill="url(#bg)" />

  <!-- Inner Page Frame -->
  <rect x="20" y="20" width="360" height="540" rx="14" fill="${secondaryColor}" filter="url(#shadow)" />

  <!-- Top Academic Badge -->
  <rect x="40" y="45" width="130" height="28" rx="14" fill="${primaryColor}" />
  <text x="105" y="63" fill="#ffffff" font-size="11" font-weight="bold" font-family="'Noto Sans KR', sans-serif" text-anchor="middle">미래학교 프로젝트</text>

  <!-- Main CREATE Emblem -->
  <circle cx="200" cy="165" r="54" fill="${primaryColor}" opacity="0.1" />
  <circle cx="200" cy="165" r="44" fill="${primaryColor}" />
  <text x="200" y="160" fill="#ffffff" font-size="20" font-weight="900" font-family="'Baloo 2', sans-serif" text-anchor="middle">CREATE</text>
  <text x="200" y="178" fill="#FAC775" font-size="10" font-weight="bold" font-family="'Noto Sans KR', sans-serif" text-anchor="middle">수업설계 모델</text>

  <!-- Title Section -->
  <text x="200" y="275" fill="#1A1730" font-size="21" font-weight="800" font-family="'Noto Sans KR', sans-serif" text-anchor="middle">${line1}</text>
  ${line2 ? `<text x="200" y="308" fill="#1A1730" font-size="18" font-weight="800" font-family="'Noto Sans KR', sans-serif" text-anchor="middle">${line2}</text>` : ''}

  <!-- Divider Line -->
  <line x1="80" y1="340" x2="320" y2="340" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round" opacity="0.3" />

  <!-- Category Tag -->
  <rect x="140" y="360" width="120" height="30" rx="15" fill="${primaryColor}" opacity="0.15" />
  <text x="200" y="380" fill="${primaryColor}" font-size="13" font-weight="700" font-family="'Noto Sans KR', sans-serif" text-anchor="middle">${category}</text>

  <!-- Bottom Details -->
  <text x="200" y="480" fill="#5E5A80" font-size="12" font-family="'Noto Sans KR', sans-serif" text-anchor="middle">학년별 단원설계안 및 교수학습 설계 자료</text>
  <text x="200" y="505" fill="#5E5A80" font-size="10" opacity="0.7" font-family="'Noto Sans KR', sans-serif" text-anchor="middle">전라북도교육청 미래학교 연구회</text>

  <!-- Book Spine 3D Texture -->
  <rect x="0" y="0" width="16" height="580" fill="black" opacity="0.15" />
  <line x1="16" y1="0" x2="16" y2="580" stroke="white" stroke-width="1" opacity="0.3" />
</svg>`;

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
