import { DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

/** Default maximum rotation, in degrees, on each axis. */
const DEFAULT_MAX_TILT = 10;

/**
 * Tilts the element in 3D toward the finger (or the mouse) with a highlight that follows it, and eases
 * back flat on release. The styles live in global.scss (`.tilt-3d`); this only writes four CSS
 * variables once per frame, so the animation stays on the GPU.
 *
 * Scrolling is never blocked: listeners are passive, `touch-action: pan-y` leaves vertical drags to
 * `ion-content`, and when the browser takes the gesture for scrolling it sends `pointercancel`,
 * which lays the card flat again. Does nothing when the system asks for reduced motion.
 *
 * Mark inner elements with `.tilt-3d-raise` to lift them toward the viewer.
 */
@Directive({
  selector: '[appTilt3d]',
  host: { class: 'tilt-3d' },
})
export class Tilt3dDirective {
  /** Maximum rotation on each axis, in degrees. */
  readonly maxTilt = input(DEFAULT_MAX_TILT, { alias: 'appTilt3d', transform: toMaxTilt });

  private readonly element: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  /** Measured once per gesture: reading the layout on every move would force reflows. */
  private rect: DOMRect | null = null;
  private pressed = false;
  private frame = 0;
  private pointer = { x: 0, y: 0 };

  constructor() {
    const options: AddEventListenerOptions = { passive: true };
    const listeners: [string, (event: PointerEvent) => void][] = [
      ['pointerdown', (e) => this.onStart(e)],
      ['pointerenter', (e) => e.pointerType === 'mouse' && this.onStart(e)],
      ['pointermove', (e) => this.onMove(e)],
      ['pointerup', (e) => e.pointerType !== 'mouse' && this.reset()],
      ['pointercancel', () => this.reset()],
      ['pointerleave', () => this.reset()],
    ];
    for (const [name, handler] of listeners) {
      this.element.addEventListener(name, handler as EventListener, options);
    }
    inject(DestroyRef).onDestroy(() => {
      cancelAnimationFrame(this.frame);
      for (const [name, handler] of listeners) {
        this.element.removeEventListener(name, handler as EventListener);
      }
    });
  }

  private onStart(event: PointerEvent): void {
    if (this.reducedMotion.matches) return;
    this.pressed = true;
    this.rect = this.element.getBoundingClientRect();
    this.element.classList.add('tilt-3d-active');
    this.track(event);
  }

  private onMove(event: PointerEvent): void {
    // A finger tilts only while it is down; the mouse tilts on hover.
    if (!this.pressed) return;
    this.track(event);
  }

  /** Remembers the latest position and paints it on the next frame (at most once per frame). */
  private track(event: PointerEvent): void {
    this.pointer = { x: event.clientX, y: event.clientY };
    if (!this.frame) {
      this.frame = requestAnimationFrame(() => this.paint());
    }
  }

  private paint(): void {
    this.frame = 0;
    const rect = this.rect;
    if (!this.pressed || !rect || rect.width === 0 || rect.height === 0) return;
    // 0..1 inside the card, clamped so a finger sliding out does not over-rotate.
    const px = clamp((this.pointer.x - rect.left) / rect.width);
    const py = clamp((this.pointer.y - rect.top) / rect.height);
    const max = this.maxTilt();
    const style = this.element.style;
    style.setProperty('--tilt-x', `${((0.5 - py) * 2 * max).toFixed(2)}deg`);
    style.setProperty('--tilt-y', `${((px - 0.5) * 2 * max).toFixed(2)}deg`);
    style.setProperty('--glare-x', `${(px * 100).toFixed(1)}%`);
    style.setProperty('--glare-y', `${(py * 100).toFixed(1)}%`);
  }

  /** Lays the card flat; the CSS transition eases it back. */
  private reset(): void {
    if (!this.pressed) return;
    this.pressed = false;
    this.rect = null;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.element.classList.remove('tilt-3d-active');
    this.element.style.setProperty('--tilt-x', '0deg');
    this.element.style.setProperty('--tilt-y', '0deg');
  }
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** `appTilt3d` with no value (empty string) keeps the default. */
function toMaxTilt(value: number | string | undefined): number {
  const n = Number(value);
  return value === '' || value === undefined || !Number.isFinite(n) ? DEFAULT_MAX_TILT : n;
}
