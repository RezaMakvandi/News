import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon';
import type { SliderSlide } from '../../../core/models/home-layout.model';

@Component({
  selector: 'app-image-slider',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (slides().length) {
      <div class="image-slider" [attr.aria-label]="'اسلایدر تصاویر'">
        @let slide = currentSlide();
        @if (slide) {
          @if (slide.link?.startsWith('/')) {
            <a class="slide-link" [routerLink]="slide.link">
              <img [src]="slide.image" [alt]="slide.alt || ''" loading="lazy" />
            </a>
          } @else {
            <a
              class="slide-link"
              [attr.href]="slide.link || null"
              [attr.target]="slide.link ? '_blank' : null"
              rel="noopener"
            >
              <img [src]="slide.image" [alt]="slide.alt || ''" loading="lazy" />
            </a>
          }
        }

        @if (slides().length > 1) {
          <button
            type="button"
            class="nav nav-prev"
            (click)="prev()"
            aria-label="تصویر قبلی"
          >
            <app-icon name="chevron-right" [size]="20" />
          </button>
          <button
            type="button"
            class="nav nav-next"
            (click)="next()"
            aria-label="تصویر بعدی"
          >
            <app-icon name="chevron-left" [size]="20" />
          </button>

          <div class="dots" role="tablist" aria-label="انتخاب تصویر">
            @for (slide of slides(); track $index) {
              <button
                type="button"
                class="dot"
                [class.is-active]="index() === $index"
                (click)="goTo($index)"
                [attr.aria-label]="'تصویر ' + ($index + 1)"
              ></button>
            }
          </div>
        }
      </div>
    }
  `,
  styles: `
    .image-slider {
      position: relative;
      width: 100%;
      overflow: hidden;
      border-radius: var(--radius-lg, 12px);
      background: var(--surface-2, #f1f5f9);
      box-shadow: var(--shadow-xs, 0 1px 2px rgba(0, 0, 0, 0.06));
    }

    .slide-link {
      display: block;
      line-height: 0;
    }

    .slide-link img {
      width: 100%;
      height: auto;
      display: block;
      object-fit: contain;
    }

    .nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 2;
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      border: 0;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.45);
      color: #fff;
      cursor: pointer;
      transition: background 0.15s;
    }

    .nav:hover {
      background: rgba(0, 0, 0, 0.65);
    }

    .nav-prev {
      right: 10px;
    }

    .nav-next {
      left: 10px;
    }

    .dots {
      position: absolute;
      bottom: 10px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2;
      display: flex;
      gap: 6px;
    }

    .dot {
      width: 8px;
      height: 8px;
      border: 0;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.5);
      cursor: pointer;
      padding: 0;
      transition: width 0.2s, background 0.2s;
    }

    .dot.is-active {
      width: 22px;
      background: #fff;
    }

    @media (max-width: 640px) {
      .nav {
        width: 30px;
        height: 30px;
      }
    }
  `,
})
export class ImageSliderComponent {
  readonly slides = input<SliderSlide[]>([]);
  readonly loop = input(true);
  readonly interval = input(4000);

  protected readonly index = signal(0);

  protected readonly currentSlide = computed(() => {
    const list = this.slides();
    if (!list.length) return null;
    const i = Math.min(this.index(), list.length - 1);
    return list[i] ?? null;
  });

  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      const slides = this.slides();
      this.stop();
      this.index.set(0);
      if (slides.length > 1 && this.loop()) {
        this.start();
      }
    });

    this.destroyRef.onDestroy(() => this.stop());
  }

  protected next(): void {
    const total = this.slides().length;
    if (!total) return;
    this.index.update((i) => (i + 1) % total);
    this.restart();
  }

  protected prev(): void {
    const total = this.slides().length;
    if (!total) return;
    this.index.update((i) => (i - 1 + total) % total);
    this.restart();
  }

  protected goTo(i: number): void {
    if (i < 0 || i >= this.slides().length) return;
    this.index.set(i);
    this.restart();
  }

  private start(): void {
    this.timer = setInterval(() => {
      const total = this.slides().length;
      if (total > 1) {
        this.index.update((i) => (i + 1) % total);
      }
    }, Math.max(1000, this.interval()));
  }

  private stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private restart(): void {
    if (!this.loop()) return;
    this.stop();
    if (this.slides().length > 1) this.start();
  }
}