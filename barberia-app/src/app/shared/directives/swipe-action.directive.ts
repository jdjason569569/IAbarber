import { DestroyRef, Directive, ElementRef, inject, input, output } from '@angular/core';
import { FeedbackService } from '../../core/feedback/feedback.service';

/** Default time the finger must stay down before the card can be swiped. */
const DEFAULT_HOLD_MS = 1000;
/**
 * At first a finger that moves is scrolling. After this long still on the card it is holding: the
 * page stops scrolling under it. From then on sideways movement is fine (people start swiping before
 * the hold ends); only a vertical drift beyond HOLD_SLOP_PX gives it up.
 */
const HOLD_CLAIM_MS = 250;
const SCROLL_SLOP_PX = 10;
const HOLD_SLOP_PX = 40;
/** A release after this long, but before the hold ends, gets the "keep holding" hint. */
const EARLY_RELEASE_MS = 350;
/** The card commits once dragged past this share of its width (capped in px). */
const COMMIT_RATIO = 0.33;
const COMMIT_MAX_PX = 140;
/** Length of the fly-out before the action is emitted. */
const FLY_OUT_MS = 260;

/** Elements that keep their own tap and never start a hold. */
const INTERACTIVE = 'ion-button, button, a, ion-input, input, textarea, ion-select';

/**
 * Hold-then-swipe gesture for a card: keep the finger down `holdMs` (a bar fills up; after a moment the page stops scrolling and the finger may wobble), the phone
 * bumps and the card is "armed"; then drag it right (`swipeRight`) or left (`swipeLeft`) past a
 * third of its width and release. A shorter drag springs back.
 *
 * Put it on a wrapper that holds the card and, behind it, the `.swipe-bg-right` / `.swipe-bg-left`
 * labels; the styles live in global.scss (`.swipe-row`). The directive only toggles classes and
 * writes `--swipe-x`, so the movement runs on the GPU. The holding / armed texts come from the
 * `data-hold-label` and `data-armed-label` attributes.
 */
@Directive({
  selector: '[appSwipeAction]',
  host: {
    class: 'swipe-row',
    '[class.swipe-enabled]': 'enabled()',
    '[style.--hold-ms]': 'holdMs() + "ms"',
  },
})
export class SwipeActionDirective {
  /** Whether the card can be swiped (e.g. only active appointments). */
  readonly enabled = input(true, { alias: 'appSwipeAction' });
  readonly holdMs = input(DEFAULT_HOLD_MS);

  readonly swipeRight = output<void>();
  readonly swipeLeft = output<void>();
  /** The finger was lifted before the hold ended: a chance to explain the gesture. */
  readonly releasedEarly = output<void>();

  private readonly element: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly feedback = inject(FeedbackService);

  private state: 'idle' | 'holding' | 'armed' | 'leaving' = 'idle';
  private pointerId = -1;
  private startX = 0;
  private startY = 0;
  private startedAt = 0;
  private lastX = 0;
  private dx = 0;
  private pastThreshold = false;
  private holdTimer: ReturnType<typeof setTimeout> | undefined;
  /** The press was a hold, not a tap: the click that follows it must not reach the card's content. */
  private swallowClick = false;
  private frame = 0;

  constructor() {
    const passive: AddEventListenerOptions = { passive: true };
    const on = <K extends keyof HTMLElementEventMap>(
      name: K,
      handler: (event: HTMLElementEventMap[K]) => void,
      options: AddEventListenerOptions = passive,
    ) => {
      this.element.addEventListener(name, handler, options);
      return () => this.element.removeEventListener(name, handler, options);
    };
    const off = [
      on('pointerdown', (e) => this.onDown(e)),
      on('pointermove', (e) => this.onMove(e)),
      on('pointerup', (e) => this.onUp(e)),
      on('pointercancel', () => this.abort()),
      // Once the hold is claimed, the page must not scroll under the finger.
      on('touchmove', (e) => this.holdClaimed() && e.cancelable && e.preventDefault(), { passive: false }),
      // After a hold, the release must not also "tap" what is under the finger (e.g. call the client).
      on(
        'click',
        (e) => {
          if (!this.swallowClick) return;
          this.swallowClick = false;
          e.preventDefault();
          e.stopPropagation();
        },
        { capture: true },
      ),
      // Android shows a context menu on long presses; the hold is ours.
      on('contextmenu', (e) => this.state !== 'idle' && e.preventDefault(), { passive: false }),
    ];
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.holdTimer);
      cancelAnimationFrame(this.frame);
      off.forEach((remove) => remove());
    });
  }

  private onDown(event: PointerEvent): void {
    // A new press: whatever the previous hold left pending no longer applies.
    if (this.state === 'idle') this.swallowClick = false;
    if (!this.enabled() || this.state !== 'idle' || !event.isPrimary) return;
    if ((event.target as Element).closest(INTERACTIVE)) return;
    this.state = 'holding';
    this.pointerId = event.pointerId;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.lastX = event.clientX;
    this.startedAt = performance.now();
    this.feedback.unlockAudio();
    this.element.classList.add('swipe-holding');
    this.holdTimer = setTimeout(() => this.arm(), this.holdMs());
  }

  private arm(): void {
    if (this.state !== 'holding') return;
    this.state = 'armed';
    this.pastThreshold = false;
    this.element.classList.remove('swipe-holding');
    this.element.classList.add('swipe-armed');
    this.feedback.tap();
    // The finger may already be on its way: the card jumps to it at once.
    this.follow(this.lastX);
  }

  private onMove(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) return;
    this.lastX = event.clientX;
    if (this.state === 'holding') {
      if (this.holdClaimed()) {
        if (Math.abs(event.clientY - this.startY) > HOLD_SLOP_PX) this.abort();
      } else if (Math.hypot(event.clientX - this.startX, event.clientY - this.startY) > SCROLL_SLOP_PX) {
        this.abort();
      }
      return;
    }
    if (this.state === 'armed') this.follow(event.clientX);
  }

  /** Moves the armed card to the finger's x (on the next frame). */
  private follow(clientX: number): void {
    this.dx = clientX - this.startX;
    const past = Math.abs(this.dx) >= this.threshold();
    if (past !== this.pastThreshold) {
      this.pastThreshold = past;
      if (past) this.feedback.tap();
    }
    if (!this.frame) this.frame = requestAnimationFrame(() => this.paint());
  }

  private paint(): void {
    this.frame = 0;
    const style = this.element.style;
    style.setProperty('--swipe-x', `${this.dx}px`);
    // 0..1 toward the threshold: the label behind the card grows as it gets closer.
    style.setProperty('--swipe-progress', Math.min(Math.abs(this.dx) / this.threshold(), 1).toFixed(3));
    this.element.classList.toggle('swipe-right', this.dx > 0);
    this.element.classList.toggle('swipe-left', this.dx < 0);
    this.element.classList.toggle('swipe-past', this.pastThreshold);
  }

  private onUp(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) return;
    if (this.state === 'holding') {
      const early = performance.now() - this.startedAt >= EARLY_RELEASE_MS;
      this.swallowClick = early;
      this.abort();
      if (early) this.releasedEarly.emit();
      return;
    }
    if (this.state !== 'armed') return;
    this.swallowClick = true;
    if (this.pastThreshold) {
      this.flyOut(this.dx > 0 ? 'right' : 'left');
    } else {
      this.abort();
    }
  }

  /** Throws the card off the screen, emits the action and lets it slide back in with its new state. */
  private flyOut(direction: 'right' | 'left'): void {
    this.state = 'leaving';
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    const distance = this.element.offsetWidth + 60;
    this.element.classList.add('swipe-leaving');
    this.element.style.setProperty('--swipe-x', `${direction === 'right' ? distance : -distance}px`);
    setTimeout(() => {
      if (direction === 'right') this.swipeRight.emit();
      else this.swipeLeft.emit();
      this.reset();
    }, FLY_OUT_MS);
  }

  /** Back to rest; the CSS transition slides the card home. */
  private abort(): void {
    clearTimeout(this.holdTimer);
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.reset();
  }

  private reset(): void {
    this.state = 'idle';
    this.pointerId = -1;
    this.dx = 0;
    this.pastThreshold = false;
    this.element.classList.remove(
      'swipe-holding',
      'swipe-armed',
      'swipe-right',
      'swipe-left',
      'swipe-past',
      'swipe-leaving',
    );
    this.element.style.setProperty('--swipe-x', '0px');
    this.element.style.setProperty('--swipe-progress', '0');
  }

  /** Holding long enough to be a hold, or already armed: scrolling is blocked. */
  private holdClaimed(): boolean {
    if (this.state === 'armed') return true;
    return this.state === 'holding' && performance.now() - this.startedAt >= HOLD_CLAIM_MS;
  }

  private threshold(): number {
    return Math.min(this.element.offsetWidth * COMMIT_RATIO, COMMIT_MAX_PX);
  }
}
