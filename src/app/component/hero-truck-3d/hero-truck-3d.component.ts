import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import type { SceneHandle } from './truck-scene';

/**
 * The landing hero's visual: an SVG route-line illustration that renders
 * immediately, and a WebGL truck that cross-fades over it once three.js has
 * loaded and drawn its first frame.
 *
 * The SVG is not a placeholder — it is the fallback, and it stays mounted for
 * the component's whole life so a lost WebGL context can fade straight back
 * to it. States: 'svg' → 'loading' → 'canvas', with 'svg' also being the
 * terminal state on any failure.
 *
 * Zone discipline follows `src/app/directives/scroll-reveal.directive.ts`:
 * every listener and observer is created inside `runOutsideAngular`. A
 * pointermove handler registered inside the zone would run change detection
 * on every mouse move, which is far more damaging than the render loop.
 */
@Component({
  selector: 'app-hero-truck-3d',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero-truck-3d.component.html',
  styleUrls: ['./hero-truck-3d.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroTruck3dComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') private canvasRef?: ElementRef<HTMLCanvasElement>;

  /** Drives the cross-fade. Written directly to the DOM, not bound. */
  private scene?: SceneHandle;
  private frame?: number;
  private lastTime = 0;

  /** Set in ngOnDestroy and checked after every await — see teardown notes. */
  private destroyed = false;

  private io?: IntersectionObserver;
  private ro?: ResizeObserver;
  private inView = true;
  private started = false;

  private readonly listeners: Array<() => void> = [];

  constructor(
    private host: ElementRef<HTMLElement>,
    private zone: NgZone
  ) {}

  ngAfterViewInit(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.supportsWebgl(canvas)) {
      return; // stays on the SVG
    }

    // Enter the zone-free world BEFORE the await, so the continuation and
    // everything it creates inherits it.
    this.zone.runOutsideAngular(() => this.scheduleStart(canvas));
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stopLoop();
    this.io?.disconnect();
    this.ro?.disconnect();
    this.listeners.forEach((off) => off());
    this.listeners.length = 0;
    this.scene?.dispose();
    this.scene = undefined;
  }

  /** A plain context probe — also what makes this testable under ChromeHeadless. */
  private supportsWebgl(canvas: HTMLCanvasElement): boolean {
    try {
      return canvas.getContext('webgl2') != null;
    } catch {
      return false;
    }
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  /**
   * Defer the import out of the LCP window. index.html already loads the
   * Tailwind Play CDN (a runtime JIT compiler), Bootstrap CSS + JS,
   * FontAwesome and Google GSI from four origins — starting a 500 KB fetch
   * and a PMREM bake on top of that during first paint is the wrong trade.
   */
  private scheduleStart(canvas: HTMLCanvasElement): void {
    if (typeof IntersectionObserver === 'undefined') {
      this.whenIdle(() => void this.start(canvas));
      return;
    }

    this.io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        this.inView = entry.isIntersecting;
        if (entry.isIntersecting && !this.started) {
          this.started = true;
          this.whenIdle(() => void this.start(canvas));
        }
      }
      // Once running, the same observer gates the loop so an off-screen hero
      // costs nothing.
      this.syncLoop();
    });
    this.io.observe(this.host.nativeElement);
  }

  /** requestIdleCallback with a timeout fallback — Safari still lacks it. */
  private whenIdle(fn: () => void): void {
    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;

    if (typeof ric === 'function') {
      ric(fn, { timeout: 1500 });
    } else {
      setTimeout(fn, 200);
    }
  }

  private async start(canvas: HTMLCanvasElement): Promise<void> {
    this.setState('loading');

    let scene: SceneHandle;
    try {
      /* webpackChunkName pins the emitted filename so ngsw-config.json can
         exclude it from the precache. The try/catch is NOT defensive
         paranoia: nginx.conf has `try_files $uri $uri/ /index.html`, so a
         missing chunk returns index.html with HTTP 200 and the import
         rejects with an opaque MIME error rather than a clean 404. */
      const mod = await import(
        /* webpackChunkName: "three-scene" */ './truck-scene'
      );
      if (this.destroyed) {
        return;
      }
      scene = mod.createTruckScene(canvas, {
        reducedMotion: this.prefersReducedMotion(),
      });
    } catch {
      this.setState('svg');
      return;
    }

    /* The destroyed check above is the one that matters: without it,
       navigating away mid-import builds a WebGLRenderer on a detached canvas
       that is never disposed. Browsers cap concurrent contexts at ~16, so
       that breaks the app after a handful of visits. */
    if (this.destroyed) {
      scene.dispose();
      return;
    }

    this.scene = scene;
    this.observeSize(canvas, scene);
    this.bindPointer(scene);
    this.bindContextLoss(canvas);

    const rect = this.host.nativeElement.getBoundingClientRect();
    scene.resize(rect.width, rect.height);

    if (this.prefersReducedMotion()) {
      scene.settle(); // one static frame, no loop
      this.setState('canvas');
      return;
    }

    scene.render(0);
    this.setState('canvas');
    this.syncLoop();
  }

  private observeSize(canvas: HTMLCanvasElement, scene: SceneHandle): void {
    if (typeof ResizeObserver === 'undefined') {
      const onResize = () => {
        const r = this.host.nativeElement.getBoundingClientRect();
        scene.resize(r.width, r.height);
      };
      window.addEventListener('resize', onResize);
      this.listeners.push(() => window.removeEventListener('resize', onResize));
      return;
    }

    this.ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          scene.resize(width, height);
          if (this.prefersReducedMotion()) {
            scene.settle();
          }
        }
      }
    });
    this.ro.observe(this.host.nativeElement);
    void canvas;
  }

  private bindPointer(scene: SceneHandle): void {
    if (this.prefersReducedMotion()) {
      return;
    }

    const onMove = (event: PointerEvent) => {
      const r = this.host.nativeElement.getBoundingClientRect();
      if (!r.width || !r.height) {
        return;
      }
      scene.setPointer(
        ((event.clientX - r.left) / r.width) * 2 - 1,
        -(((event.clientY - r.top) / r.height) * 2 - 1)
      );
    };
    const onLeave = () => scene.setPointer(0, 0);

    // On the window, not the canvas: the canvas is pointer-events:none so the
    // CTAs underneath stay clickable.
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);
    this.listeners.push(() => window.removeEventListener('pointermove', onMove));
    this.listeners.push(() => window.removeEventListener('pointerleave', onLeave));

    const onVisibility = () => this.syncLoop();
    document.addEventListener('visibilitychange', onVisibility);
    this.listeners.push(() =>
      document.removeEventListener('visibilitychange', onVisibility)
    );
  }

  private bindContextLoss(canvas: HTMLCanvasElement): void {
    const onLost = (event: Event) => {
      // Without preventDefault the context is gone permanently.
      event.preventDefault();
      this.stopLoop();
      this.setState('svg');
    };
    canvas.addEventListener('webglcontextlost', onLost);
    this.listeners.push(() => canvas.removeEventListener('webglcontextlost', onLost));
  }

  /** Run the loop only when visible, focused, and motion is wanted. */
  private syncLoop(): void {
    const shouldRun =
      !!this.scene &&
      !this.destroyed &&
      this.inView &&
      !document.hidden &&
      !this.prefersReducedMotion();

    if (shouldRun && this.frame == null) {
      this.lastTime = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    } else if (!shouldRun) {
      this.stopLoop();
    }
  }

  private readonly tick = (now: number): void => {
    // Clamp so a backgrounded tab does not jump on return.
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.scene?.render(dt);
    this.frame = requestAnimationFrame(this.tick);
  };

  private stopLoop(): void {
    if (this.frame != null) {
      cancelAnimationFrame(this.frame);
      this.frame = undefined;
    }
  }

  /** Written straight to the DOM — OnPush with no bindings to dirty. */
  private setState(state: 'svg' | 'loading' | 'canvas'): void {
    this.host.nativeElement.dataset['state'] = state;
  }
}
