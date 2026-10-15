declare module 'page-flip' {
  export interface PageFlipOptions {
    width: number;
    height: number;
    size?: 'fixed' | 'stretch';
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    drawShadow?: boolean;
    flippingTime?: number;
    usePortrait?: boolean;
    startPage?: number;
    startZIndex?: number;
    autoSize?: boolean;
    maxShadowOpacity?: number;
    showCover?: boolean;
    mobileScrollSupport?: boolean;
    swipeDistance?: number;
    clickEventForward?: boolean;
    useMouseEvents?: boolean;
    showPageCorners?: boolean;
    disableFlipByClick?: boolean;
  }

  export interface FlipEvent {
    data: number;
    object: PageFlip;
  }

  export class PageFlip {
    constructor(element: HTMLElement, options: PageFlipOptions);
    loadFromHTML(items: NodeListOf<HTMLElement> | HTMLElement[]): void;
    updateFromHtml(items: NodeListOf<HTMLElement> | HTMLElement[]): void;
    flipNext(corner?: 'top' | 'bottom'): void;
    flipPrev(corner?: 'top' | 'bottom'): void;
    flip(pageIndex: number, corner?: 'top' | 'bottom'): void;
    turnToPage(pageIndex: number): void;
    turnToPrevPage(): void;
    turnToNextPage(): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    getOrientation(): 'portrait' | 'landscape';
    getBoundsRect(): DOMRect;
    destroy(): void;
    on(event: 'flip', callback: (e: FlipEvent) => void): void;
    on(event: 'changeOrientation', callback: (e: any) => void): void;
    on(event: 'init', callback: (e: any) => void): void;
    on(event: string, callback: (e: any) => void): void;
    off(event: string): void;
  }
}
