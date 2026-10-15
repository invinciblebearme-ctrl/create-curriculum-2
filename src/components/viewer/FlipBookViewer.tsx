import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PageFlip, FlipEvent } from 'page-flip';
import { pdfjsLib } from '@/lib/pdfWorker';
import { resolveAssetUrl } from '@/lib/pdfUtils';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  BookOpen,
  ArrowLeft,
  Loader2,
  List,
  Sparkles,
  Move,
  RotateCcw,
} from 'lucide-react';

interface FlipBookViewerProps {
  pdfUrl: string;
  title: string;
  onClose: () => void;
}

export const FlipBookViewer: React.FC<FlipBookViewerProps> = ({ pdfUrl, title, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const flipBookRef = useRef<PageFlip | null>(null);
  const pdfDocRef = useRef<any>(null);

  // States
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [inputPage, setInputPage] = useState<string>('1');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(10);
  const [error, setError] = useState<string | null>(null);

  // Zoom & Pan (1.0 ~ 2.5)
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  // Fullscreen & Drawer
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);
  const [pageThumbnails, setPageThumbnails] = useState<string[]>([]);

  // Dimensions
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({ width: 500, height: 700 });

  // Rendering tasks cancellation map
  const activeRenderTasksRef = useRef<Map<number, any>>(new Map());
  const renderedPagesRef = useRef<Set<number>>(new Set());

  // 1. PDF Document Loading
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setLoadingProgress(20);
    setError(null);

    const loadPdf = async () => {
      try {
        const finalUrl = resolveAssetUrl(pdfUrl);
        let loadingTask: any;

        // Try ArrayBuffer fetch first to ensure 100% compatibility across CDNs & subpaths
        if (!finalUrl.startsWith('blob:') && !finalUrl.startsWith('data:')) {
          try {
            const res = await fetch(finalUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status} (${res.statusText})`);
            const buffer = await res.arrayBuffer();
            loadingTask = pdfjsLib.getDocument({
              data: new Uint8Array(buffer),
              cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/cmaps/',
              cMapPacked: true,
            });
          } catch (e) {
            console.warn('[FlipBookViewer] ArrayBuffer 로드 실패, URL로 재시도:', e);
            loadingTask = pdfjsLib.getDocument({
              url: finalUrl,
              cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/cmaps/',
              cMapPacked: true,
            });
          }
        } else {
          loadingTask = pdfjsLib.getDocument({
            url: finalUrl,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/cmaps/',
            cMapPacked: true,
          });
        }

        loadingTask.onProgress = (progressData: { loaded: number; total: number }) => {
          if (progressData.total > 0) {
            const percent = Math.min(80, Math.floor((progressData.loaded / progressData.total) * 70) + 20);
            setLoadingProgress(percent);
          }
        };

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        pdfDocRef.current = doc;
        setTotalPages(doc.numPages);
        setLoadingProgress(90);

        // Aspect ratio inspection
        const firstPage = await doc.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1.0 });
        const ratio = viewport.height / viewport.width;

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        let targetWidth = Math.min(650, windowWidth * 0.88);
        if (windowWidth < 640) {
          targetWidth = windowWidth * 0.92;
        }
        let targetHeight = targetWidth * ratio;

        const maxAllowedHeight = windowHeight * 0.78;
        if (targetHeight > maxAllowedHeight) {
          targetHeight = maxAllowedHeight;
          targetWidth = targetHeight / ratio;
        }

        setPageSize({
          width: Math.round(targetWidth),
          height: Math.round(targetHeight),
        });

        setLoading(false);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('PDF 로드 실패:', err);
          setError('PDF 문서를 불러오는 중 오류가 발생했습니다: ' + (err.message || '알 수 없는 오류'));
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
      if (flipBookRef.current) {
        try {
          flipBookRef.current.destroy();
        } catch {}
        flipBookRef.current = null;
      }
    };
  }, [pdfUrl]);

  // 2. Render Page Canvas
  const renderPageCanvas = useCallback(
    async (pageNumber: number) => {
      if (!pdfDocRef.current || pageNumber < 1 || pageNumber > totalPages) return;

      const pageEl = document.getElementById(`flip-page-${pageNumber}`);
      if (!pageEl) return;

      let canvas = pageEl.querySelector('canvas') as HTMLCanvasElement;
      if (canvas && renderedPagesRef.current.has(pageNumber)) {
        return;
      }

      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.className = 'w-full h-full object-contain pointer-events-none select-none rounded shadow-inner';
        pageEl.innerHTML = '';
        pageEl.appendChild(canvas);
      }

      if (activeRenderTasksRef.current.has(pageNumber)) {
        try {
          activeRenderTasksRef.current.get(pageNumber).cancel();
        } catch {}
        activeRenderTasksRef.current.delete(pageNumber);
      }

      try {
        const page = await pdfDocRef.current.getPage(pageNumber);
        // HiDPI 및 확대(Zoom) 대비 초고해상도 렌더링 (슈퍼샘플링)
        // 200%~250% 확대 시에도 벡터 텍스트가 칼같이 선명하도록 충분한 픽셀 버퍼 확보 (최소 2.8x)
        const dpr = window.devicePixelRatio || 1;
        const renderScaleFactor = Math.max(dpr, 1.5) * 2.2; // 초고해상도 벡터 유지

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const scale = (pageSize.width / unscaledViewport.width) * renderScaleFactor;
        const viewport = page.getViewport({ scale });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = '100%';
        canvas.style.height = '100%';

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        // 안티에일리어싱 및 고화질 텍스트 렌더링 옵션
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const renderTask = page.render({
          canvasContext: ctx,
          viewport: viewport,
        });

        activeRenderTasksRef.current.set(pageNumber, renderTask);
        await renderTask.promise;
        activeRenderTasksRef.current.delete(pageNumber);
        renderedPagesRef.current.add(pageNumber);
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn(`페이지 ${pageNumber} 렌더링 경고:`, err);
        }
      }
    },
    [totalPages, pageSize]
  );

  // 3. Render Nearby Pages
  const renderNearbyPages = useCallback(
    (centerPage: number) => {
      const range = 2;
      const start = Math.max(1, centerPage - range);
      const end = Math.min(totalPages, centerPage + range);

      for (let p = start; p <= end; p++) {
        renderPageCanvas(p);
      }
    },
    [totalPages, renderPageCanvas]
  );

  // 4. Initialize StPageFlip ONCE (DO NOT re-instantiate on zoomLevel change)
  useEffect(() => {
    if (loading || totalPages === 0 || !containerRef.current) return;

    const timer = setTimeout(() => {
      if (!containerRef.current) return;

      try {
        if (flipBookRef.current) {
          try {
            flipBookRef.current.destroy();
          } catch {}
          flipBookRef.current = null;
        }

        const pageElements = containerRef.current.querySelectorAll('.page');
        if (pageElements.length === 0) return;

        // STRICT SINGLE-PAGE (PORTRAIT) MODE
        const pageFlip = new PageFlip(containerRef.current, {
          width: pageSize.width,
          height: pageSize.height,
          size: 'fixed',
          minWidth: 260,
          maxWidth: 1400,
          minHeight: 380,
          maxHeight: 1800,
          drawShadow: true,
          maxShadowOpacity: 0.55,
          showCover: false,
          usePortrait: true,
          autoSize: true,
          startPage: currentPage - 1,
          flippingTime: 650,
          useMouseEvents: true,
          swipeDistance: 25,
          showPageCorners: true,
          disableFlipByClick: false,
        });

        pageFlip.loadFromHTML(pageElements as any);

        pageFlip.on('flip', (e: FlipEvent) => {
          const newPageNum = e.data + 1;
          setCurrentPage(newPageNum);
          setInputPage(String(newPageNum));
          renderNearbyPages(newPageNum);
        });

        flipBookRef.current = pageFlip;
        renderNearbyPages(currentPage);
      } catch (err) {
        console.error('PageFlip 초기화 오류:', err);
      }
    }, 50);

    return () => {
      clearTimeout(timer);
    };
  }, [loading, totalPages, pageSize]); // CRITICAL FIX: zoomLevel excluded from dependencies!

  useEffect(() => {
    if (!loading && totalPages > 0) {
      renderNearbyPages(currentPage);
    }
  }, [currentPage, loading, totalPages, renderNearbyPages]);

  // 5. Generate Thumbnails asynchronously
  useEffect(() => {
    if (!pdfDocRef.current || totalPages === 0 || pageThumbnails.length > 0) return;

    const generateThumbs = async () => {
      const thumbs: string[] = [];
      const doc = pdfDocRef.current;
      const count = Math.min(totalPages, 30);

      for (let i = 1; i <= count; i++) {
        try {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 0.18 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            thumbs.push(canvas.toDataURL('image/jpeg', 0.7));
          }
        } catch {
          thumbs.push('');
        }
      }
      setPageThumbnails(thumbs);
    };

    generateThumbs();
  }, [totalPages]);

  // 6. Navigation Handlers
  const handlePrevPage = () => {
    if (flipBookRef.current && currentPage > 1) {
      flipBookRef.current.flipPrev();
    }
  };

  const handleNextPage = () => {
    if (flipBookRef.current && currentPage < totalPages) {
      flipBookRef.current.flipNext();
    }
  };

  const handlePageJump = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(inputPage, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages && flipBookRef.current) {
      flipBookRef.current.turnToPage(target - 1);
    } else {
      setInputPage(String(currentPage));
    }
  };

  // 7. Robust Zoom Controls
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(2.5, parseFloat((prev + 0.25).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(1.0, parseFloat((prev - 0.25).toFixed(2)));
      if (next === 1.0) {
        setPanPosition({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1.0);
    setPanPosition({ x: 0, y: 0 });
  };

  // Quick double-click to toggle 100% <-> 150%
  const handleDoubleClick = () => {
    if (zoomLevel > 1.0) {
      handleResetZoom();
    } else {
      setZoomLevel(1.5);
    }
  };

  // Wheel zoom (Ctrl + Wheel or standard wheel if zoomed)
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  };

  // Pan interactions during Zoom > 1
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1.0) return;
    setIsPanning(true);
    panStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: panPosition.x,
      initialY: panPosition.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !panStartRef.current || zoomLevel <= 1.0) return;
    const dx = e.clientX - panStartRef.current.startX;
    const dy = e.clientY - panStartRef.current.startY;
    setPanPosition({
      x: panStartRef.current.initialX + dx,
      y: panStartRef.current.initialY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    panStartRef.current = null;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      } else if (e.key === 'Home') {
        e.preventDefault();
        flipBookRef.current?.turnToPage(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        flipBookRef.current?.turnToPage(totalPages - 1);
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          toggleFullscreen();
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, isFullscreen, zoomLevel]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#172033] text-neutral-100 flex flex-col select-none overflow-hidden font-sans"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* 1. Header Toolbar with create.allforedu.kr Theme */}
      <header className="h-14 bg-[#1e293f]/95 backdrop-blur border-b border-[#687fe0]/30 px-4 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-[#687fe0] text-white transition-all text-xs font-bold border border-white/10"
            title="홈으로 나가기 (ESC)"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">홈으로 나가기</span>
          </button>

          <div className="h-4 w-px bg-white/15 hidden sm:block" />

          <h2 className="text-xs sm:text-sm font-bold text-neutral-100 truncate max-w-[200px] sm:max-w-md flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#a1b1fb] shrink-0" />
            <span className="truncate">{title}</span>
          </h2>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Zoom Controls with Clear Feedback */}
          <div className="flex items-center bg-white/10 rounded-xl border border-white/15 px-1 py-0.5 shadow-sm">
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 1.0}
              className="p-1.5 hover:bg-white/15 active:scale-95 rounded disabled:opacity-30 transition text-white"
              title="축소 (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2.5 py-1 text-xs font-mono font-bold text-[#FAC775] hover:text-white rounded transition"
              title="원래 크기로 맞춤 (100%)"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= 2.5}
              className="p-1.5 hover:bg-white/15 active:scale-95 rounded disabled:opacity-30 transition text-white"
              title="확대 (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Thumbnails Sidebar Button */}
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`p-2 rounded-xl border transition ${
              showThumbnails
                ? 'bg-[#687fe0] border-[#687fe0] text-white shadow-card'
                : 'bg-white/10 hover:bg-white/15 border-white/15 text-neutral-200'
            }`}
            title="목차 및 썸네일 보기"
          >
            <List className="w-4 h-4" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-neutral-200 hover:text-white transition"
            title={isFullscreen ? '전체화면 종료' : '전체화면'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* 2. Main Stage with Zoom & Pan */}
      <main
        className="flex-1 relative flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#172033] via-[#1c273e] to-[#141b2b]"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        style={{
          cursor: zoomLevel > 1.0 ? (isPanning ? 'grabbing' : 'grab') : 'default',
        }}
      >
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#172033]/90 z-30 backdrop-blur-sm">
            <Loader2 className="w-10 h-10 text-[#687fe0] animate-spin mb-4" />
            <p className="text-sm font-bold text-neutral-200">3D 전자책 페이지 렌더링 중...</p>
            <div className="w-52 h-2 bg-white/10 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#687fe0] to-[#a1b1fb] transition-all duration-300 rounded-full"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <span className="text-xs text-[#a1b1fb] mt-2 font-mono font-bold">{loadingProgress}%</span>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="bg-[#ffedf3] border border-[#ff6b9d] rounded-[20px] p-6 max-w-md shadow-2xl">
              <p className="text-[#e06b98] text-xs font-bold mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-[#687fe0] hover:bg-[#566ecf] text-white rounded-xl text-xs font-bold transition"
              >
                홈으로 나가기
              </button>
            </div>
          </div>
        )}

        {/* Zoom & Pan Stage Container */}
        <div
          className="relative flex items-center justify-center will-change-transform"
          style={{
            transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0, 0.2, 1)',
          }}
        >
          {/* StPageFlip HTML Container: STRICT SINGLE PAGE PORTRAIT */}
          <div
            ref={containerRef}
            className={`shadow-book-deep rounded-xl bg-white relative select-none ${
              zoomLevel > 1.0 ? 'pointer-events-none' : ''
            }`}
            style={{
              width: `${pageSize.width}px`,
              height: `${pageSize.height}px`,
            }}
          >
            {/* Generate individual page container divs */}
            {Array.from({ length: totalPages }, (_, index) => {
              const pageNum = index + 1;
              return (
                <div
                  key={pageNum}
                  id={`flip-page-${pageNum}`}
                  className="page bg-white w-full h-full relative overflow-hidden flex flex-col items-center justify-center"
                  style={{
                    width: `${pageSize.width}px`,
                    height: `${pageSize.height}px`,
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-neutral-400">
                    <Loader2 className="w-6 h-6 animate-spin text-[#687fe0]/50" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Left Arrow Button */}
        <button
          onClick={handlePrevPage}
          disabled={currentPage <= 1 || loading}
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-full bg-[#1e293f]/80 hover:bg-[#687fe0] backdrop-blur border border-white/20 text-white disabled:opacity-20 disabled:pointer-events-none transition-all shadow-xl hover:scale-105 active:scale-95 z-20"
          title="이전 페이지 (←)"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Right Arrow Button */}
        <button
          onClick={handleNextPage}
          disabled={currentPage >= totalPages || loading}
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-full bg-[#1e293f]/80 hover:bg-[#687fe0] backdrop-blur border border-white/20 text-white disabled:opacity-20 disabled:pointer-events-none transition-all shadow-xl hover:scale-105 active:scale-95 z-20"
          title="다음 페이지 (→)"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Zoom panning guidance badge */}
        {zoomLevel > 1.0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#1e293f]/90 backdrop-blur px-4 py-1.5 rounded-full text-xs font-bold text-[#a1b1fb] border border-[#687fe0]/50 flex items-center gap-2 shadow-lg z-10 animate-fade-in">
            <Move className="w-3.5 h-3.5" />
            <span>화면을 드래그하여 자유롭게 이동할 수 있습니다 ({Math.round(zoomLevel * 100)}%)</span>
            <button
              onClick={handleResetZoom}
              className="ml-1 p-0.5 hover:text-white rounded"
              title="원래 크기 (100%)"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        )}
      </main>

      {/* 3. Thumbnails Sidebar Drawer */}
      {showThumbnails && (
        <aside className="absolute right-0 top-14 bottom-14 w-64 bg-[#1e293f]/95 backdrop-blur-md border-l border-[#687fe0]/30 p-4 overflow-y-auto z-20 flex flex-col shadow-2xl transition-all">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
            <h3 className="text-xs font-bold text-neutral-200">페이지 목록</h3>
            <span className="text-xs font-bold text-[#a1b1fb]">{totalPages} 페이지</span>
          </div>

          <div className="grid grid-cols-2 gap-3 flex-1">
            {Array.from({ length: totalPages }, (_, i) => {
              const pNum = i + 1;
              const isSelected = pNum === currentPage;
              const thumbUrl = pageThumbnails[i];

              return (
                <button
                  key={pNum}
                  onClick={() => {
                    flipBookRef.current?.turnToPage(i);
                    setShowThumbnails(false);
                  }}
                  className={`flex flex-col items-center p-1.5 rounded-xl border transition ${
                    isSelected
                      ? 'border-[#687fe0] bg-[#687fe0]/20 ring-2 ring-[#687fe0]'
                      : 'border-white/10 bg-white/5 hover:border-white/30'
                  }`}
                >
                  <div className="w-full aspect-[1/1.4] bg-neutral-900 rounded-lg overflow-hidden flex items-center justify-center shadow">
                    {thumbUrl ? (
                      <img src={thumbUrl} alt={`Page ${pNum}`} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-neutral-500">{pNum}</span>
                    )}
                  </div>
                  <span className={`text-[11px] mt-1 font-mono font-bold ${isSelected ? 'text-[#a1b1fb]' : 'text-neutral-400'}`}>
                    {pNum}p
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
      )}

      {/* 4. Bottom Footer Toolbar */}
      <footer className="h-14 bg-[#1e293f]/95 backdrop-blur border-t border-[#687fe0]/30 px-4 flex items-center justify-between z-20">
        <div className="text-xs text-neutral-300 font-bold hidden sm:flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#4aab82] animate-pulse" />
          <span>단면 3D 넘김 모드 (Portrait 고정)</span>
        </div>

        {/* Page Slider / Jump Controls */}
        <div className="flex items-center space-x-3 mx-auto">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || loading}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-[#687fe0] disabled:opacity-30 transition"
            title="이전 페이지"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>

          <form onSubmit={handlePageJump} className="flex items-center space-x-1.5">
            <input
              type="text"
              value={inputPage}
              onChange={(e) => setInputPage(e.target.value)}
              onBlur={handlePageJump}
              className="w-10 text-center bg-white/15 border border-white/20 rounded-lg py-0.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-[#687fe0]"
            />
            <span className="text-xs text-neutral-300 font-mono font-bold">/ {totalPages || 1}</span>
          </form>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages || loading}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-[#687fe0] disabled:opacity-30 transition"
            title="다음 페이지"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="text-xs text-neutral-300 font-medium hidden sm:block">
          확대/축소 <kbd className="px-1.5 py-0.5 bg-white/15 rounded text-[10px] font-mono">+</kbd>{' '}
          <kbd className="px-1.5 py-0.5 bg-white/15 rounded text-[10px] font-mono">-</kbd> 또는 마우스 휠
        </div>
      </footer>
    </div>
  );
};
