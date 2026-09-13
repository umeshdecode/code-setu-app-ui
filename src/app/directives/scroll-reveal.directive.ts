import {
  Directive,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
} from '@angular/core';

/**
 * Reveals an element the first time it scrolls into view by adding `.is-visible`.
 *
 * Set `appRevealCount` to also count a number up from 0 when the reveal fires —
 * used by the landing page stat band. The formatted value is written into the
 * element's textContent, so the template should render the final value as the
 * initial content (it is what non-JS and reduced-motion users see).
 *
 * No animation library: one IntersectionObserver + requestAnimationFrame.
 */
@Directive({
  selector: '[appScrollReveal]',
  standalone: true,
})
export class ScrollRevealDirective implements OnInit, OnDestroy {
  /** Final value for the count-up. Omit for a plain fade/slide reveal. */
  @Input() appRevealCount?: number;

  /** Appended after the counted number, e.g. '+' or '%'. */
  @Input() appRevealSuffix = '';

  /** Count-up duration in ms. */
  @Input() appRevealDuration = 1600;

  private observer?: IntersectionObserver;
  private frame?: number;

  constructor(private host: ElementRef<HTMLElement>, private zone: NgZone) {}

  ngOnInit(): void {
    const el = this.host.nativeElement;

    if (this.prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-visible');
      return;
    }

    if (this.appRevealCount != null) {
      el.textContent = this.format(0) + this.appRevealSuffix;
    }

    // Outside Angular: scroll-driven work must not trigger change detection.
    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) {
              continue;
            }
            el.classList.add('is-visible');
            if (this.appRevealCount != null) {
              this.countUp(this.appRevealCount);
            }
            this.disconnect();
          }
        },
        { threshold: 0.2, rootMargin: '0px 0px -10% 0px' }
      );
      this.observer.observe(el);
    });
  }

  ngOnDestroy(): void {
    this.disconnect();
    if (this.frame != null) {
      cancelAnimationFrame(this.frame);
    }
  }

  private countUp(target: number): void {
    const el = this.host.nativeElement;
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min((now - start) / this.appRevealDuration, 1);
      // easeOutCubic — fast start, settles gently on the final figure.
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = this.format(target * eased) + this.appRevealSuffix;
      if (t < 1) {
        this.frame = requestAnimationFrame(step);
      } else {
        el.textContent = this.format(target) + this.appRevealSuffix;
      }
    };

    this.frame = requestAnimationFrame(step);
  }

  /** Keeps one decimal for fractional targets (e.g. 99.9% uptime), none otherwise. */
  private format(value: number): string {
    const decimals = Number.isInteger(this.appRevealCount ?? 0) ? 0 : 1;
    return value.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  private disconnect(): void {
    this.observer?.disconnect();
    this.observer = undefined;
  }
}
