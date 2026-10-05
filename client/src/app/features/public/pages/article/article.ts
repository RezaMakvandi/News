import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { ArticleCardComponent } from '../../../../shared/components/article-card/article-card';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { SafeHtmlPipe } from '../../../../shared/pipes/safe-html.pipe';
import { FaDatePipe, FaNumberPipe } from '../../../../shared/pipes/format.pipe';
import { ArticleService } from '../../../../core/services/article.service';
import { CommentService } from '../../../../core/services/comment.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ToastService } from '../../../../core/services/toast.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { asAuthor, asCategory, asTags, authorName, categoryColor, initial } from '../../../../core/utils/relation';
import { faNumber } from '../../../../core/utils/format';
import type { Article, ArticleCard, ArticleDetailResponse, NeighborsResponse } from '../../../../core/models/article.model';
import type { CommentNode } from '../../../../core/models/comment.model';

@Component({
  selector: 'app-article-page',
  imports: [
      NgTemplateOutlet,
      RouterLink,
      IconComponent,
      ArticleCardComponent,
      SpinnerComponent,
      EmptyStateComponent,
      SafeHtmlPipe,
      FaDatePipe,
      FaNumberPipe,
    ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="container page">
        <app-spinner label="در حال بارگذاری خبر…" />
      </div>
    } @else if (article(); as item) {
      <article class="container page">
        <nav class="breadcrumb">
          <a routerLink="/">صفحه اصلی</a>
          @if (category(); as cat) {
            <span class="sep">/</span>
            <a [routerLink]="['/category', cat.slug]">{{ cat.name }}</a>
          }
          <span class="sep">/</span>
          <span class="clamp-1">{{ item.title }}</span>
        </nav>

        <header class="article-header">
          @if (category(); as cat) {
            <a
              class="badge"
              [style.background]="catColor()"
              [routerLink]="['/category', cat.slug]"
            >
              {{ cat.name }}
            </a>
          }
          <h1>{{ item.title }}</h1>
          @if (item.summary) {
            <p class="lead">{{ item.summary }}</p>
          }
        </header>

        <div class="article-info-bar">
          @if (author(); as writer) {
            <a class="author-chip" [routerLink]="['/author', writer.slug || '']">
              @if (writer.avatar) {
                <img [src]="writer.avatar" [alt]="writer.name" />
              } @else {
                <span class="avatar-fallback">{{ authorInitial() }}</span>
              }
              <span>
                <span class="author-name">{{ writer.name }}</span>
                <span class="author-sub">{{ roleLabel(writer.role) }}</span>
              </span>
            </a>
          }

          <div class="stat-list">
            <span class="stat">
              <app-icon name="calendar" [size]="15" />
              {{ item.publishedAt | faDate }}
            </span>
            <span class="stat">
              <app-icon name="clock" [size]="15" />
              {{ item.readingTime | faNumber }} دقیقه مطالعه
            </span>
            <span class="stat">
              <app-icon name="eye" [size]="15" />
              {{ item.views | faNumber }} بازدید
            </span>
            <span class="stat">
              <app-icon name="comment" [size]="15" />
              {{ item.commentsCount | faNumber }} نظر
            </span>
          </div>
        </div>

        @if (item.cover) {
          <figure class="article-figure">
            <img [src]="item.cover" [alt]="item.coverAlt || item.title" />
            @if (item.coverAlt) {
              <figcaption>{{ item.coverAlt }}</figcaption>
            }
          </figure>
        }

        <div class="article-body-content" [innerHTML]="item.content | safeHtml"></div>

        @if (item.gallery?.length) {
          <section class="gallery-section">
            <h2 class="section-title">گالری تصاویر</h2>
            <div class="gallery-grid">
              @for (image of item.gallery; track image.url) {
                <figure class="article-figure">
                  <img [src]="image.url" [alt]="image.alt || item.title" loading="lazy" />
                  @if (image.caption) {
                    <figcaption>{{ image.caption }}</figcaption>
                  }
                </figure>
              }
            </div>
          </section>
        }

        @if (tags().length) {
          <div class="tag-cloud article-tags">
            @for (tag of tags(); track tag._id) {
              <a class="chip" [routerLink]="['/tag', tag.slug]">
                <app-icon name="tag" [size]="14" />
                {{ tag.name }}
              </a>
            }
          </div>
        }

        @if (item.source?.name) {
          <p class="source-note text-sm text-muted">
            <app-icon name="link" [size]="15" />
            منبع:
            @if (item.source?.url) {
              <a [href]="item.source!.url" target="_blank" rel="noopener noreferrer">
                {{ item.source!.name }}
              </a>
            } @else {
              <span>{{ item.source!.name }}</span>
            }
          </p>
        }

        <div class="share-bar">
          <span class="share-label">اشتراک‌گذاری:</span>
          <button type="button" class="btn btn-soft btn-sm" (click)="copyLink()">
            <app-icon name="copy" [size]="15" />
            کپی لینک
          </button>
          <button
            type="button"
            class="btn btn-soft btn-sm"
            [class.is-liked]="liked()"
            [disabled]="liking()"
            (click)="like()"
          >
            <app-icon [name]="liked() ? 'heart-filled' : 'heart'" [size]="15" />
            پسندیدم ({{ likes() | faNumber }})
          </button>
          <a
            class="btn btn-soft btn-sm"
            [href]="telegramShare()"
            target="_blank"
            rel="noopener noreferrer"
          >
            <app-icon name="telegram" [size]="15" />
            تلگرام
          </a>
          <a
            class="btn btn-soft btn-sm"
            [href]="twitterShare()"
            target="_blank"
            rel="noopener noreferrer"
          >
            <app-icon name="twitter" [size]="15" />
            ایکس
          </a>
        </div>

        @if (neighbors().prev || neighbors().next) {
          <nav class="neighbor-nav">
            @if (neighbors().prev; as prev) {
              <a class="neighbor" [routerLink]="['/news', prev!.slug]">
                <span class="text-xs text-faint">
                  <app-icon name="chevron-right" [size]="14" />
                  خبر قبلی
                </span>
                <span class="clamp-2">{{ prev!.title }}</span>
              </a>
            }
            @if (neighbors().next; as next) {
              <a class="neighbor is-next" [routerLink]="['/news', next!.slug]">
                <span class="text-xs text-faint">
                  خبر بعدی
                  <app-icon name="chevron-left" [size]="14" />
                </span>
                <span class="clamp-2">{{ next!.title }}</span>
              </a>
            }
          </nav>
        }

        <section class="comments-section">
          <h2 class="section-title">
            <app-icon name="comment" [size]="18" />
            دیدگاه‌ها ({{ commentsCount() | faNumber }})
          </h2>

          @if (!allowComments()) {
            <div class="notice">
              <app-icon name="info" [size]="16" />
              امکان ثبت دیدگاه برای این خبر غیرفعال شده است.
            </div>
          } @else {
            <form class="comment-form stack" (submit)="submitComment($event)">
              @if (!auth.isLoggedIn()) {
                <div class="grid grid-2">
                  <div class="field">
                    <label class="label" for="c-name">نام</label>
                    <input
                      id="c-name"
                      class="input"
                      type="text"
                      required
                      minlength="2"
                      placeholder="نام و نام خانوادگی"
                      [value]="commentName()"
                      (input)="commentName.set($any($event.target).value)"
                    />
                  </div>
                  <div class="field">
                    <label class="label" for="c-email">ایمیل</label>
                    <input
                      id="c-email"
                      class="input"
                      type="email"
                      required
                      placeholder="you@example.com"
                      [value]="commentEmail()"
                      (input)="commentEmail.set($any($event.target).value)"
                    />
                  </div>
                </div>
              }

              @if (replyTo(); as target) {
                <div class="notice">
                  <app-icon name="comment" [size]="16" />
                  در حال پاسخ به {{ target.authorName }}
                  <button type="button" class="btn btn-ghost btn-sm" (click)="replyTo.set(null)">
                    <app-icon name="close" [size]="14" />
                    انصراف
                  </button>
                </div>
              }

              <div class="field">
                <label class="label" for="c-content">
                  دیدگاه شما
                  <span class="req">*</span>
                </label>
                <textarea
                  id="c-content"
                  class="textarea"
                  rows="4"
                  required
                  minlength="3"
                  maxlength="2000"
                  placeholder="دیدگاه خود را بنویسید…"
                  [value]="commentText()"
                  (input)="commentText.set($any($event.target).value)"
                ></textarea>
                <p class="hint">
                  نشانی ایمیل شما منتشر نخواهد شد. بخش‌های موردنیاز علامت‌گذاری شده‌اند.
                </p>
              </div>

              <div class="row-between">
                <span class="text-xs text-faint">
                  @if (moderated()) {
                    دیدگاه‌ها پس از تأیید مدیر منتشر می‌شوند.
                  }
                </span>
                <button type="submit" class="btn btn-primary" [disabled]="submitting()">
                  @if (submitting()) {
                    <span class="spinner spinner-sm"></span>
                  } @else {
                    <app-icon name="send" [size]="16" />
                  }
                  ارسال دیدگاه
                </button>
              </div>
            </form>
          }

          @if (comments().length) {
            <div class="comment-list">
              @for (comment of comments(); track comment._id) {
                <ng-container
                  [ngTemplateOutlet]="commentTpl"
                  [ngTemplateOutletContext]="{ $implicit: comment, isReply: false }"
                />
              }
            </div>
          } @else {
            <app-empty-state
              icon="comment"
              title="هنوز دیدگاهی ثبت نشده است"
              description="اولین نفری باشید که دیدگاه خود را می‌نویسد."
            />
          }
        </section>

        @if (related().length) {
          <section class="related-section">
            <h2 class="section-head">
              <span class="section-title">مطالب مرتبط</span>
            </h2>
            <div class="article-grid">
              @for (item of related(); track item._id) {
                <app-article-card [article]="item" />
              }
            </div>
          </section>
        }
      </article>

      <ng-template #commentTpl let-comment let-isReply="isReply">
        <div class="comment" [class.is-reply]="isReply">
          @if (comment.author; as user) {
            <span class="comment-avatar">{{ userInitial(user.name) }}</span>
          } @else {
            <span class="comment-avatar">{{ userInitial(comment.authorName) }}</span>
          }
          <div class="comment-main">
            <div class="comment-head">
              <span class="comment-author">{{ comment.authorName }}</span>
              <span class="comment-date">{{ comment.createdAt | faDate: 'relative' }}</span>
              @if (comment.isEdited) {
                <span class="badge">ویرایش شده</span>
              }
            </div>
            <p class="comment-text">{{ comment.content }}</p>

            @if (comment.adminReply) {
              <div class="comment-admin-reply">
                <span class="reply-label">پاسخ تحریریه:</span>
                <p>{{ comment.adminReply }}</p>
              </div>
            }

            <div class="comment-actions">
              <button type="button" (click)="vote(comment, 'like')">
                <app-icon name="heart" [size]="14" />
                {{ comment.likes | faNumber }}
              </button>
              <button type="button" (click)="vote(comment, 'dislike')">
                <app-icon name="thumbs-down" [size]="14" />
                {{ comment.dislikes | faNumber }}
              </button>
              <button type="button" (click)="setReply(comment)">
                <app-icon name="comment" [size]="14" />
                پاسخ
              </button>
            </div>

            @if (comment.replies.length) {
              <div class="comment-list" style="margin-top: var(--space-3)">
                @for (reply of comment.replies; track reply._id) {
                  <ng-container
                    [ngTemplateOutlet]="commentTpl"
                    [ngTemplateOutletContext]="{ $implicit: reply, isReply: true }"
                  />
                }
              </div>
            }
          </div>
        </div>
      </ng-template>
    } @else {
      <div class="container page">
        <app-empty-state
          icon="file"
          title="خبر موردنظر یافت نشد"
          description="ممکن است این خبر حذف یا نشانی آن تغییر کرده باشد."
          actionLabel="بازگشت به صفحه اصلی"
          actionIcon="arrow-right"
          (action)="goHome()"
        />
      </div>
    }
  `,
  styles: `
    .article-header .badge {
      display: inline-block;
      margin-bottom: var(--space-3);
      color: #fff;
    }

    .article-body-content {
      font-size: 1rem;
      line-height: 2.1;
      color: var(--text);

      ::ng-deep {
        p {
          margin: 0 0 var(--space-4);
        }

        h2,
        h3,
        h4 {
          margin: var(--space-5) 0 var(--space-3);
          line-height: 1.6;
        }

        h2 {
          font-size: 1.35rem;
        }

        h3 {
          font-size: 1.15rem;
        }

        a {
          color: var(--accent);
          text-decoration: underline;
        }

        img {
          max-width: 100%;
          height: auto;
          border-radius: var(--radius);
          margin: var(--space-3) 0;
        }

        ul,
        ol {
          margin: 0 0 var(--space-4);
          padding-inline-start: var(--space-5);
        }

        li {
          margin-bottom: var(--space-2);
        }

        blockquote {
          margin: var(--space-4) 0;
          padding: var(--space-3) var(--space-4);
          border-inline-start: 4px solid var(--accent);
          background: var(--surface-2);
          border-radius: var(--radius-xs);
          color: var(--text-muted);
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin: var(--space-4) 0;

          th,
          td {
            padding: var(--space-2) var(--space-3);
            border: 1px solid var(--border);
            text-align: start;
          }

          th {
            background: var(--surface-2);
            font-weight: 700;
          }
        }

        figure {
          margin: var(--space-4) 0;
        }

        iframe {
          width: 100%;
          aspect-ratio: 16 / 9;
          border: 0;
          border-radius: var(--radius);
        }

        code {
          padding: 2px 6px;
          border-radius: var(--radius-xs);
          background: var(--bg-inset);
          font-size: 0.9em;
        }
      }
    }

    .gallery-section,
    .comments-section,
    .related-section {
      margin-top: var(--space-6);
    }

    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: var(--space-4);
      margin-top: var(--space-4);
    }

    .gallery-grid .article-figure {
      margin: 0;
    }

    .article-tags {
      margin-top: var(--space-5);
    }

    .article-tags .chip {
      text-decoration: none;
    }

    .source-note {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: var(--space-4) 0 0;
    }

    .is-liked {
      color: var(--danger);
      border-color: var(--danger);
    }

    .neighbor-nav {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: var(--space-3);
      margin-top: var(--space-5);
    }

    .neighbor {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: var(--space-3) var(--space-4);
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: var(--radius);
      font-size: 0.9rem;
      font-weight: 600;
      transition: border-color var(--transition-fast), color var(--transition-fast);

      &:hover {
        border-color: var(--accent);
        color: var(--accent);
      }

      span:first-child {
        display: flex;
        align-items: center;
        gap: 4px;
      }
    }

    .neighbor.is-next {
      text-align: end;
      align-items: flex-end;
    }

    .notice {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      background: var(--accent-softer);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: var(--space-4);
    }

    .spinner-sm {
      width: 15px;
      height: 15px;
      border-width: 2px;
    }

    .related-section .section-head {
      border-bottom: 0;
      padding-bottom: 0;
      margin-bottom: var(--space-4);
    }
  `,
})
export class ArticlePage {
  /** Bound from the `news/:slug` route parameter. */
  readonly slug = input('');

  private readonly articleService = inject(ArticleService);
  private readonly commentService = inject(CommentService);
  private readonly settings = inject(SettingsService);
  private readonly seo = inject(SeoService);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly article = signal<Article | null>(null);
  protected readonly related = signal<ArticleCard[]>([]);
  protected readonly comments = signal<CommentNode[]>([]);
  protected readonly neighbors = signal<NeighborsResponse>({ prev: null, next: null });
  protected readonly allowComments = signal(true);
  protected readonly likes = signal(0);
  protected readonly liked = signal(false);
  protected readonly liking = signal(false);

  protected readonly commentText = signal('');
  protected readonly commentName = signal('');
  protected readonly commentEmail = signal('');
  protected readonly submitting = signal(false);
  protected readonly replyTo = signal<CommentNode | null>(null);

  protected readonly category = computed(() => asCategory(this.article()?.category));
  protected readonly author = computed(() => asAuthor(this.article()?.author));
  protected readonly tags = computed(() => asTags(this.article()?.tags));
  protected readonly catColor = computed(() => categoryColor(this.article()?.category));
  protected readonly authorInitial = computed(() => initial(authorName(this.article()?.author)));
  protected readonly moderated = computed(() => this.settings.settings()['commentsModeration'] !== false);

  protected readonly commentsCount = computed(() =>
    this.comments().reduce((total, comment) => total + 1 + comment.replies.length, 0),
  );

  constructor() {
    effect(() => {
      const slug = this.slug();
      if (!slug) return;

      this.loading.set(true);
      this.article.set(null);
      this.comments.set([]);
      this.related.set([]);
      this.resetCommentForm();

      this.articleService.bySlug(slug).subscribe({
        next: (response: ArticleDetailResponse) => {
          this.article.set(response.article);
          this.related.set(response.related ?? []);
          this.likes.set(response.article.likes ?? 0);
          this.loading.set(false);
          this.applySeo(response.article);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error('خبر موردنظر یافت نشد.');
        },
      });

      this.articleService.neighbors(slug).subscribe({
        next: (result) => this.neighbors.set(result),
        error: () => this.neighbors.set({ prev: null, next: null }),
      });

      this.commentService.forArticle(slug).subscribe({
        next: (result) => {
          this.comments.set(result.comments ?? []);
          this.allowComments.set(result.allowComments !== false);
        },
        error: () => {
          this.comments.set([]);
          this.allowComments.set(false);
        },
      });
    });
  }

  protected userInitial(name?: string): string {
    return initial(name);
  }

  protected roleLabel(role?: string): string {
    if (role === 'admin') return 'مدیر کل';
    if (role === 'editor') return 'سردبیر';
    if (role === 'author') return 'نویسنده';
    return 'کاربر';
  }

  protected setReply(comment: CommentNode): void {
    this.replyTo.set(comment);
    this.commentText.set('');
    document.getElementById('c-content')?.focus();
  }

  protected submitComment(event: Event): void {
    event.preventDefault();
    const content = this.commentText().trim();
    if (content.length < 3) {
      this.toast.error('متن دیدگاه باید حداقل ۳ نویسه باشد.');
      return;
    }

    if (!this.auth.isLoggedIn() && (!this.commentName().trim() || !this.commentEmail().trim())) {
      this.toast.error('برای ثبت دیدگاه، نام و ایمیل خود را وارد کنید.');
      return;
    }

    this.submitting.set(true);
    this.commentService
      .submit(this.slug(), {
        content,
        parent: this.replyTo()?._id ?? null,
        name: this.auth.isLoggedIn() ? undefined : this.commentName().trim(),
        email: this.auth.isLoggedIn() ? undefined : this.commentEmail().trim(),
      })
      .subscribe({
        next: (result) => {
          this.submitting.set(false);
          this.resetCommentForm();
          this.toast.success(
            result.status === 'approved'
              ? 'دیدگاه شما منتشر شد.'
              : 'دیدگاه شما ثبت شد و پس از تأیید منتشر می‌شود.',
          );
        },
        error: (error: Error) => {
          this.submitting.set(false);
          this.toast.error(error.message);
        },
      });
  }

  protected vote(comment: CommentNode, type: 'like' | 'dislike'): void {
    this.commentService.vote(comment._id, type).subscribe({
      next: (result) => {
        this.comments.update((items) => patchVote(items, comment._id, result.likes, result.dislikes));
      },
      error: (error: Error) => this.toast.error(error.message),
    });
  }

  protected like(): void {
    if (this.liked() || this.liking()) return;
    this.liking.set(true);
    this.articleService.like(this.slug()).subscribe({
      next: (result) => {
        this.liking.set(false);
        this.liked.set(true);
        this.likes.set(result.likes);
        this.toast.success('نظر شما ثبت شد. سپاسگزاریم!');
      },
      error: (error: Error) => {
        this.liking.set(false);
        this.toast.error(error.message);
      },
    });
  }

  protected copyLink(): void {
    const url = window.location.href;
    void navigator.clipboard.writeText(url).then(
      () => this.toast.success('نشانی خبر کپی شد.'),
      () => this.toast.error('کپی نشانی ممکن نشد.'),
    );
  }

  protected telegramShare(): string {
    return `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(this.article()?.title ?? '')}`;
  }

  protected twitterShare(): string {
    return `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(this.article()?.title ?? '')}`;
  }

  protected goHome(): void {
    window.location.href = '/';
  }

  private resetCommentForm(): void {
    this.commentText.set('');
    this.replyTo.set(null);
  }

  private applySeo(article: Article): void {
    this.seo.set({
      title: article.seo?.title || article.title,
      description: article.seo?.description || article.summary,
      keywords: article.seo?.keywords,
      image: article.cover,
      url: window.location.href,
      type: 'article',
    });
  }
}

/** Immutably updates a comment's like/dislike counters, including nested replies. */
function patchVote(
  items: CommentNode[],
  id: string,
  likes: number,
  dislikes: number,
): CommentNode[] {
  return items.map((item) => {
    if (item._id === id) return { ...item, likes, dislikes };
    if (item.replies.length) {
      return { ...item, replies: patchVote(item.replies, id, likes, dislikes) };
    }
    return item;
  });
}