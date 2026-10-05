import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon';
import { FaDatePipe, FaNumberPipe } from '../../pipes/format.pipe';
import { ARTICLE_TYPE_LABELS, type ArticleCard } from '../../../core/models/article.model';
import { asAuthor, asCategory, categoryColor } from '../../../core/utils/relation';

@Component({
  selector: 'app-article-card',
  imports: [RouterLink, IconComponent, FaDatePipe, FaNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="article-card">
      <a class="article-thumb" [routerLink]="['/news', article().slug]">
        @if (article().cover) {
          <img
            [src]="article().cover"
            [alt]="article().coverAlt || article().title"
            loading="lazy"
            decoding="async"
          />
        }
        @if (category()) {
          <span class="thumb-badge" [style.background]="color()">
            {{ category()!.name }}
          </span>
        }
        @if (typeLabel()) {
          <span class="thumb-type">
            <app-icon [name]="typeIcon()" [size]="13" />
            {{ typeLabel() }}
          </span>
        }
      </a>

      <div class="article-body">
        <a class="article-title clamp-2" [routerLink]="['/news', article().slug]">
          {{ article().title }}
        </a>

        @if (article().summary) {
          <p class="article-summary clamp-2">{{ article().summary }}</p>
        }

        <div class="article-meta">
          @if (author()) {
            <span class="meta-item">
              <app-icon name="user" [size]="13" />
              {{ author()!.name }}
            </span>
          }
          @if (article().publishedAt) {
            <span class="meta-item">
              <app-icon name="clock" [size]="13" />
              {{ article().publishedAt | faDate: 'relative' }}
            </span>
          }
          <span class="meta-item" [title]="'بازدید'">
            <app-icon name="eye" [size]="13" />
            {{ article().views | faNumber }}
          </span>
        </div>
      </div>
    </article>
  `,
  styles: `
      :host {
        display: block;
        height: 100%;
      }
    `,
  })
export class ArticleCardComponent {
  readonly article = input.required<ArticleCard>();

  protected readonly category = computed(() => asCategory(this.article().category));
  protected readonly author = computed(() => asAuthor(this.article().author));
  protected readonly color = computed(() => categoryColor(this.article().category));

  protected readonly typeLabel = computed(() => {
    const type = this.article().type;
    return type && type !== 'news' ? ARTICLE_TYPE_LABELS[type] : '';
  });

  protected readonly typeIcon = computed(() => {
    const type = this.article().type;
    if (type === 'video') return 'video';
    if (type === 'gallery') return 'image';
      return 'file';
    });
  }