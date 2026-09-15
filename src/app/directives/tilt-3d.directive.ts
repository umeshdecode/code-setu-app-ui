import { Directive, ElementRef, Input, NgZone, OnDestroy, OnInit } from '@angular/core';

/**
 * Pointer-driven 3D tilt for a group of cards.
 *
 * Put this on the CONTAINER, not each card — one delegated pointermove for the
 * whole group rather than one listener per card.
 *
 * It writes `--tilt-x` / `--tilt-y` custom properties rather than setting
 * `transform` directly. That matters: the pillar cards are also
 * `[appScrollReveal]` targets, and a directive assigning `element.style
 * .transform` would fight the reveal animation — last writer wins, and the
 * cards snap or lose their entrance. Custom properties compose into the
 * transform the stylesheet already declares, so the two coexist.
 *
 * Desktop pointers only, and off entirely under reduced motion. Zone handling
 * mirrors `scroll-reveal.directive.ts`: a pointermove listener registered
 * inside the Angular zone would run change detection on every mouse move.
 */
@Directive({
  selector: '[appTilt3d]',
  standalone: true,
})
export class Tilt3dDirective implements OnInit, OnDestroy {
  /** Selector for the tiltable children within this container. */
  @Input('appTilt3d') childSelector = '';

  /** Maximum rotation in degrees on each axis. */
  @Input() tiltMax = 6;

  private readonly teardown: Array<() => void> = [];

  constructor(
    private host: ElementRef<HTMLElement>,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    if (this.disabled()) {
      return;
    }

    this.zone.runOutsideAngular(() => {
      const el = this.host.nativeElement;

      const onMove = (event: PointerEvent) => {
        const card = this.cardFor(event.target);
        if (!card) {
          return;
        }
        const r = card.getBoundingClientRect();
        if (!r.width || !r.height) {
          return;
        }
        // -1..1 from the card's centre.
        const nx = ((event.clientX - r.left) / r.width) * 2 - 1;
        const ny = ((event.clientY - r.top) / r.height) * 2 - 1;
        // Y tilt follows horizontal travel; X tilt inverts so the card leans
        // toward the cursor rather than away from it.
        card.style.setProperty('--tilt-y', `${(nx * this.tiltMax).toFixed(2)}deg`);
        card.style.setProperty('--tilt-x', `${(-ny * this.tiltMax).toFixed(2)}deg`);
      };

      const onOut = (event: PointerEvent) => {
        const card = this.cardFor(event.target);
        if (card) {
          this.reset(card);
        }
      };

      const onLeave = () => {
        el.querySelectorAll<HTMLElement>(this.childSelector).forEach((c) => this.reset(c));
      };

      el.addEventListener('pointermove', onMove, { passive: true });
      el.addEventListener('pointerout', onOut, { passive: true });
      el.addEventListener('pointerleave', onLeave, { passive: true });

      this.teardown.push(
        () => el.removeEventListener('pointermove', onMove),
        () => el.removeEventListener('pointerout', onOut),
        () => el.removeEventListener('pointerleave', onLeave)
      );
    });
  }

  ngOnDestroy(): void {
    this.teardown.forEach((off) => off());
    this.teardown.length = 0;
  }

  private cardFor(target: EventTarget | null): HTMLElement | null {
    if (!this.childSelector || !(target instanceof Element)) {
      return null;
    }
    const card = target.closest<HTMLElement>(this.childSelector);
    return card && this.host.nativeElement.contains(card) ? card : null;
  }

  private reset(card: HTMLElement): void {
    card.style.removeProperty('--tilt-x');
    card.style.removeProperty('--tilt-y');
  }

  /** No hover on touch, and nothing at all under reduced motion. */
  private disabled(): boolean {
    if (typeof matchMedia === 'undefined') {
      return true;
    }
    return (
      !matchMedia('(pointer: fine)').matches ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }
}
