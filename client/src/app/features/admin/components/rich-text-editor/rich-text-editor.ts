import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  forwardRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { MediaPickerModalComponent } from '../media-picker-modal/media-picker-modal';
import type { MediaItem } from '../../../../core/models/media.model';

/** Insertion kinds the media picker supports. */
type PickerMode = 'image' | 'video';

interface ToolbarAction {
  command: string;
  value?: string;
  icon: string;
  label: string;
}

const FORMAT_ACTIONS: ToolbarAction[] = [
  { command: 'undo', icon: 'undo', label: 'واگرد' },
  { command: 'redo', icon: 'redo', label: 'ازنو' },
  { command: 'bold', icon: 'bold', label: 'ضخیم' },
  { command: 'italic', icon: 'italic', label: 'مورب' },
  { command: 'underline', icon: 'underline', label: 'زیرخط' },
  { command: 'strikeThrough', icon: 'strikethrough', label: 'خط‌خورده' },
  { command: 'formatBlock', value: 'h2', icon: 'heading-2', label: 'عنوان' },
  { command: 'formatBlock', value: 'p', icon: 'file', label: 'پاراگراف' },
  { command: 'insertUnorderedList', icon: 'list-ul', label: 'فهرست نقطه‌ای' },
  { command: 'insertOrderedList', icon: 'list-ol', label: 'فهرست شماره‌ای' },
  { command: 'formatBlock', value: 'blockquote', icon: 'quote', label: 'نقل‌قول' },
  { command: 'removeFormat', icon: 'remove-format', label: 'پاک کردن قالب' },
];

/**
 * Lightweight rich-text editor on contenteditable with a formatting toolbar,
 * image/video insertion (chunked upload for large videos), link, and table
 * support. Produces HTML consumed by `safeHtml` on the public side.
 */
@Component({
  selector: 'app-rich-text-editor',
  imports: [IconComponent, MediaPickerModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true,
    },
  ],
  template: `
    <div class="rte" [class.is-disabled]="disabled()">
      <div class="rte-toolbar" role="toolbar" aria-label="ابزارهای ویرایش متن">
        @for (action of formatActions; track action.command + (action.value ?? '')) {
          <button
            type="button"
            class="rte-btn"
            [attr.title]="action.label"
            [attr.aria-label]="action.label"
            (mousedown)="$event.preventDefault()"
            (click)="exec(action.command, action.value)"
          >
            <app-icon [name]="action.icon" [size]="15" />
          </button>
        }

        <span class="rte-sep"></span>

        <button type="button" class="rte-btn" title="لینک" (click)="insertLink()">
          <app-icon name="link2" [size]="15" />
        </button>
        <button type="button" class="rte-btn" title="جدول" (click)="insertTable()">
          <app-icon name="table" [size]="15" />
        </button>
        <button
          type="button"
          class="rte-btn"
          title="خط جداکننده"
          (click)="exec('insertHorizontalRule')"
        >
          <app-icon name="minus" [size]="15" />
        </button>

        <span class="rte-sep"></span>

        <button
          type="button"
          class="rte-btn"
          title="افزودن تصویر از کتابخانه"
          (click)="pickMedia('image')"
        >
          <app-icon name="image" [size]="15" />
        </button>
        <button
          type="button"
          class="rte-btn"
          title="افزودن ویدیو از کتابخانه"
          (click)="pickMedia('video')"
        >
          <app-icon name="video-plus" [size]="15" />
        </button>
      </div>

      <div class="rte-area-wrap">
        <div
          #editor
          class="rte-area"
          contenteditable="true"
          dir="auto"
          [attr.data-placeholder]="placeholder()"
          (input)="onInput()"
          (blur)="markTouched()"
          (click)="onEditorClick($event)"
          (keydown)="onEditorKeydown($event)"
          (mousedown)="onEditorMousedown($event)"
          (scroll)="updateMediaMenuPos()"
        ></div>

        @if (dropIndicator(); as pos) {
          <span class="rte-drop-line" [style.top.px]="pos.top" [style.left.px]="pos.left"></span>
        }

        @if (selectedMedia()) {
          <button
            type="button"
            class="rte-media-menu"
            title="حذف رسانه انتخاب‌شده"
            [style.top.px]="mediaMenuPos()?.top"
            [style.left.px]="mediaMenuPos()?.left"
            (click)="removeSelectedMedia()"
          >
            <app-icon name="trash" [size]="13" />
          </button>
        }
      </div>

      @if (upload()) {
        <div class="rte-upload">
          <span class="rte-upload-label">{{ upload()!.label }}</span>
          <span class="rte-upload-bar"
            ><span class="rte-upload-fill" [style.width.%]="upload()!.percent"></span
          ></span>
          <span class="rte-upload-percent">{{ upload()!.percent }}٪</span>
        </div>
      }
    </div>

    <app-media-picker-modal
      [open]="pickerOpen()"
      [mode]="pickerMode()"
      title="انتخاب از کتابخانه رسانه"
      (picked)="onMediaPicked($event)"
      (closed)="closePicker()"
    />
  `,
  styles: `
    .rte {
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
      overflow: hidden;
      transition: border-color var(--transition-fast);
    }

    .rte:focus-within {
      border-color: var(--accent);
    }

    .rte.is-disabled {
      opacity: 0.6;
      pointer-events: none;
    }

    .rte-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 2px;
      padding: 6px;
      border-bottom: 1px solid var(--border);
      background: var(--surface-2);
    }

    .rte-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border: 0;
      border-radius: var(--radius-xs);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      transition:
        background var(--transition-fast),
        color var(--transition-fast);
    }

    .rte-btn:hover,
    .rte-btn:focus-visible {
      background: var(--bg-hover);
      color: var(--text);
    }

    .rte-sep {
      width: 1px;
      height: 18px;
      margin: 0 4px;
      background: var(--border);
    }

    .rte-area-wrap {
      position: relative;
    }

    .rte-area:empty::before {
      content: attr(data-placeholder);
      color: var(--text-faint);
      pointer-events: none;
    }

    /*
     * Media is inserted at runtime via execCommand/innerHTML, so it never
     * receives the component's _ngcontent attribute — these rules must be
     * ::ng-deep to reach it (keeps high-res videos inside the editor box).
     */
    :host ::ng-deep .rte-area {
      overflow-wrap: break-word;

      img,
      video {
        display: block;
        max-width: 100%;
        height: auto;
        border-radius: var(--radius-xs);
        margin: var(--space-2) 0;
      }

      video {
        width: 100%;
        background: #000;
      }

      figure.video-embed {
        margin: var(--space-2) 0;
        max-width: 100%;
        overflow: hidden;
      }

      table {
        width: 100%;
        max-width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      td,
      th {
        border: 1px solid var(--border);
        padding: 6px 10px;
        overflow-wrap: break-word;
      }

      blockquote {
        margin: var(--space-3) 0;
        padding: var(--space-2) var(--space-3);
        border-inline-start: 3px solid var(--accent);
        background: var(--surface-2);
        color: var(--text-muted);
      }

      .is-media-selected {
        outline: 2px solid var(--accent);
        outline-offset: 3px;
      }

      figure:empty {
        display: none;
      }
    }

    .rte-area {
      min-height: 360px;
      max-height: 70vh;
      overflow-y: auto;
      padding: var(--space-4);
      font-size: 0.95rem;
      line-height: 2;
      outline: none;
    }

    .rte-media-menu {
      position: absolute;
      z-index: 5;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: 0;
      border-radius: var(--radius-xs);
      background: var(--danger);
      color: #fff;
      cursor: pointer;
      box-shadow: var(--shadow-md);
      transition: background var(--transition-fast);
    }

    .rte-media-menu:hover,
    .rte-media-menu:focus-visible {
      background: color-mix(in srgb, var(--danger) 80%, #000);
    }

    .rte-drop-line {
      position: absolute;
      z-index: 5;
      height: 3px;
      width: calc(100% - 16px);
      border-radius: var(--radius-full);
      background: var(--accent);
      pointer-events: none;
    }

    .rte-drag-ghost {
      position: fixed;
      z-index: 1000;
      max-width: 320px;
      margin: 0;
      opacity: 0.85;
      pointer-events: none;
      transform: rotate(2deg);
      box-shadow: var(--shadow-lg);
      border-radius: var(--radius-sm);
      overflow: hidden;
      background: var(--surface);
    }

    .rte-drag-ghost video {
      display: block;
      width: 100%;
    }

    :host-context(body.is-rte-dragging) .rte-area {
      cursor: grabbing;
    }

    .rte-upload {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: 8px 12px;
      border-top: 1px solid var(--border);
      background: var(--accent-softer);
      font-size: 0.8rem;
    }

    .rte-upload-label {
      color: var(--text-muted);
      white-space: nowrap;
    }

    .rte-upload-bar {
      flex: 1;
      height: 6px;
      border-radius: var(--radius-full);
      background: var(--bg-inset);
      overflow: hidden;
    }

    .rte-upload-fill {
      display: block;
      height: 100%;
      border-radius: var(--radius-full);
      background: var(--accent);
      transition: width var(--transition-fast);
    }

    .rte-upload-percent {
      min-width: 38px;
      text-align: left;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class RichTextEditorComponent implements ControlValueAccessor {
  readonly placeholder = input('متن خبر را اینجا بنویسید…');

  private readonly editorRef = viewChild.required<ElementRef<HTMLDivElement>>('editor');

  protected readonly formatActions = FORMAT_ACTIONS;
  protected readonly upload = signal<{ label: string; percent: number } | null>(null);
  protected readonly disabled = signal(false);
  protected readonly pickerOpen = signal(false);
  protected readonly pickerMode = signal<PickerMode>('image');
  protected readonly selectedMedia = signal<HTMLElement | null>(null);
  protected readonly mediaMenuPos = signal<{ top: number; left: number } | null>(null);
  protected readonly dropIndicator = signal<{ top: number; left: number } | null>(null);

  /** Selection saved when the modal opens, restored before inserting. */
  private savedRange: Range | null = null;

  /** Custom (non-HTML5) drag state for moving videos. */
  private dragState: {
    figure: HTMLElement;
    pointerId: number;
    startX: number;
    startY: number;
    active: boolean;
    ghost: HTMLElement | null;
  } | null = null;
  private activeDragCleanup: (() => void) | null = null;

  /** Auto-scroll bookkeeping for the active drag. */
  private autoScroll = { speed: 0, lastY: 0, rafId: 0 };

  private value = '';
  private lastEmitted: string | null = null;

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    // Push external form values into the contenteditable only when they
    // differ from what the editor is already showing.
    effect(() => {
      const element = this.editorRef().nativeElement;
      if (this.value !== this.lastEmitted && element.innerHTML !== this.value) {
        element.innerHTML = this.value;
        this.lastEmitted = this.value;
      }
    });
  }

  writeValue(value: string): void {
    this.value = value ?? '';
    const element = this.editorRef()?.nativeElement;
    if (element && element.innerHTML !== this.value) {
      element.innerHTML = this.value;
      this.lastEmitted = this.value;
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected exec(command: string, value?: string): void {
    this.focusEditor();
    document.execCommand(command, false, value);
    this.onInput();
  }

  protected onInput(): void {
    const element = this.editorRef().nativeElement;
    // Selection highlight is UI-only — never let it leak into the value.
    const selected = this.selectedMedia();
    selected?.classList.remove('is-media-selected');
    // A drag-move may relocate just the <video>, leaving an empty wrapper.
    element.querySelectorAll('figure.video-embed').forEach((figure) => {
      if (!figure.querySelector('video')) figure.remove();
    });
    // Normalise empty content to '' so validation and saving stay simple.
    this.value = element.innerHTML === '<br>' ? '' : element.innerHTML;
    selected?.classList.add('is-media-selected');
    this.lastEmitted = this.value;
    this.onChange(this.value);
  }

  protected markTouched(): void {
    this.onTouched();
  }

  protected insertLink(): void {
    const url = window.prompt('نشانی لینک را وارد کنید (https://…)');
    if (!url) return;
    const safe = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    this.focusEditor();
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      document.execCommand('createLink', false, safe);
    } else {
      document.execCommand(
        'insertHTML',
        false,
        `<a href="${this.escapeAttr(safe)}" target="_blank" rel="noopener">${safe}</a>`,
      );
    }
    this.onInput();
  }

  protected insertTable(): void {
    const rows = Number(window.prompt('تعداد ردیف‌ها؟', '3'));
    const cols = Number(window.prompt('تعداد ستون‌ها؟', '3'));
    if (
      !Number.isFinite(rows) ||
      !Number.isFinite(cols) ||
      rows < 1 ||
      cols < 1 ||
      rows > 20 ||
      cols > 10
    )
      return;

    let html = '<table><tbody>';
    for (let r = 0; r < rows; r += 1) {
      html += '<tr>';
      for (let c = 0; c < cols; c += 1) html += '<td>&nbsp;</td>';
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';

    this.focusEditor();
    document.execCommand('insertHTML', false, html);
    this.onInput();
  }

  /**
   * Opens the media-library modal. Remembers where the caret was so the
   * inserted media lands in the right place after the modal steals focus.
   */
  protected pickMedia(mode: PickerMode): void {
    const selection = window.getSelection();
    const element = this.editorRef().nativeElement;
    this.savedRange =
      selection && selection.rangeCount > 0 && element.contains(selection.anchorNode)
        ? selection.getRangeAt(0).cloneRange()
        : null;
    this.pickerMode.set(mode);
    this.pickerOpen.set(true);
  }

  protected closePicker(): void {
    this.pickerOpen.set(false);
  }

  /** Click on the editor area: select media elements, clear elsewhere. */
  protected onEditorClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const media = target.closest<HTMLElement>('img, video, figure.video-embed');
    if (media && this.editorRef().nativeElement.contains(media)) {
      this.selectMedia(media);
    } else {
      this.clearMediaSelection();
    }
  }

  /**
   * Custom mouse-based dragging for videos. Native HTML5 dragging cannot
   * work here: the video player's controls swallow the gesture, so instead we
   * track the pointer ourselves — a ghost follows the cursor, a drop line
   * shows the target position, and release moves the figure there.
   */
  protected onEditorMousedown(event: MouseEvent): void {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    const area = this.editorRef().nativeElement;

    const video = target.closest<HTMLElement>('figure.video-embed')?.querySelector('video');
    if (!video || !area.contains(video)) return;

    const figure = video.closest<HTMLElement>('figure.video-embed');
    if (!figure) return;

    this.selectMedia(figure.querySelector('video') ?? figure);

    const state = {
      figure,
      pointerId: event.clientX,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      ghost: null as HTMLElement | null,
    };
    this.dragState = state;

    const onMove = (moveEvent: MouseEvent) => this.onDragMove(moveEvent, state);
    const onUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      this.onDragEnd(upEvent, state);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    this.activeDragCleanup = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }

  private onDragMove(event: MouseEvent, state: NonNullable<typeof this.dragState>): void {
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;

    // Small movements are just clicks — don't turn them into drags.
    if (!state.active && Math.hypot(dx, dy) < 6) return;

    if (!state.active) {
      state.active = true;
      document.body.classList.add('is-rte-dragging');
      this.createDragGhost(state.figure);
      this.startAutoScrollLoop();
    }

    this.autoScroll.lastY = event.clientY;
    this.updateAutoScrollSpeed();
    this.moveDragGhost(event.clientX, event.clientY);
    this.updateDropIndicator(event.clientY);
    event.preventDefault();
  }

  private onDragEnd(event: MouseEvent, state: NonNullable<typeof this.dragState>): void {
    this.activeDragCleanup = null;
    this.stopAutoScroll();
    if (!state.active) return; // plain click, nothing to do

    document.body.classList.remove('is-rte-dragging');
    this.removeDragGhost();
    this.dropIndicator.set(null);

    const area = this.editorRef().nativeElement;
    const dropTop = this.resolveDropPosition(event.clientY);

    if (dropTop && dropTop !== state.figure) {
      // Re-insert at the resolved position (before / after the target).
      const targetBox = dropTop.getBoundingClientRect();
      const insertBefore = event.clientY < targetBox.top + targetBox.height / 2;
      area.insertBefore(state.figure, insertBefore ? dropTop : dropTop.nextSibling);
      this.onInput();
    }
    // Keep the video selected so the delete button stays useful.
    if (state.figure.isConnected) this.updateMediaMenuPos();
  }

  /**
   * Finds the top-level block (p, figure, …) nearest to the pointer's Y for
   * the drop, returning null when the pointer is outside the editor.
   */
  private resolveDropPosition(clientY: number): HTMLElement | null {
    const area = this.editorRef().nativeElement;
    const areaBox = area.getBoundingClientRect();
    if (clientY < areaBox.top || clientY > areaBox.bottom) return null;

    const blocks = Array.from(area.children).filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement &&
        !(el.classList.contains('video-embed') && el === this.dragState?.figure),
    );
    let closest: HTMLElement | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const block of blocks) {
      const box = block.getBoundingClientRect();
      const center = box.top + box.height / 2;
      const distance = Math.abs(clientY - center);
      if (distance < bestDistance) {
        bestDistance = distance;
        closest = block;
        if (clientY < center) break;
      }
    }
    return closest;
  }

  private createDragGhost(figure: HTMLElement): void {
    this.removeDragGhost();
    const ghost = figure.cloneNode(true) as HTMLElement;
    ghost.classList.add('rte-drag-ghost');
    ghost
      .querySelectorAll('.is-media-selected')
      .forEach((el) => el.classList.remove('is-media-selected'));
    ghost.querySelector('video')?.removeAttribute('controls');
    document.body.appendChild(ghost);
    this.dragState = this.dragState ? { ...this.dragState, ghost } : null;
  }
  private moveDragGhost(clientX: number, clientY: number): void {
    const ghost = this.dragState?.ghost;
    if (!ghost) return;
    ghost.style.left = `${clientX + 12}px`;
    ghost.style.top = `${clientY + 12}px`;
  }

  private removeDragGhost(): void {
    const ghost = this.dragState?.ghost;
    ghost?.remove();
    if (this.dragState) this.dragState.ghost = null;
  }

  /** Shows the insertion line above/below the nearest block. */
  private updateDropIndicator(clientY: number): void {
    const target = this.resolveDropPosition(clientY);
    if (!target) {
      this.dropIndicator.set(null);
      return;
    }
    const area = this.editorRef().nativeElement;
    const targetBox = target.getBoundingClientRect();
    const areaBox = area.getBoundingClientRect();
    const before = clientY < targetBox.top + targetBox.height / 2;

    // Y relative to the (non-scrolling) wrap; clamp so the line stays visible
    // inside the editor box even near its edges.
    const top = (before ? targetBox.top : targetBox.bottom) - areaBox.top - 2;
    const clampedTop = Math.max(2, Math.min(top, areaBox.height - 2));
    this.dropIndicator.set({ top: clampedTop, left: 8 });
  }

  /**
   * Scrolls the editor while dragging near its top/bottom edge so blocks
   * beyond the visible area can be reached as drop targets.
   */
  private startAutoScrollLoop(): void {
    this.stopAutoScroll();
    const step = () => {
      const area = this.editorRef().nativeElement;
      if (this.autoScroll.speed !== 0) {
        area.scrollTop += this.autoScroll.speed;
        // Keep ghost + indicator aligned with the scrolled content.
        this.updateDropIndicator(this.autoScroll.lastY);
      }
      this.autoScroll.rafId = requestAnimationFrame(step);
    };
    this.autoScroll.rafId = requestAnimationFrame(step);
  }

  /** Sets scroll speed from pointer distance to the editor's edges. */
  private updateAutoScrollSpeed(): void {
    const EDGE = 48;
    const MAX_SPEED = 14;
    const area = this.editorRef().nativeElement;
    const areaBox = area.getBoundingClientRect();
    const y = this.autoScroll.lastY;

    if (y < areaBox.top + EDGE) {
      const ratio = Math.min(1, (areaBox.top + EDGE - y) / EDGE);
      this.autoScroll.speed = -Math.ceil(ratio * MAX_SPEED);
    } else if (y > areaBox.bottom - EDGE) {
      const ratio = Math.min(1, (y - (areaBox.bottom - EDGE)) / EDGE);
      this.autoScroll.speed = Math.ceil(ratio * MAX_SPEED);
    } else {
      this.autoScroll.speed = 0;
    }
  }

  private stopAutoScroll(): void {
    if (this.autoScroll.rafId) cancelAnimationFrame(this.autoScroll.rafId);
    this.autoScroll = { speed: 0, lastY: 0, rafId: 0 };
  }

  /** Delete / Backspace removes the currently selected media element. */
  protected onEditorKeydown(event: KeyboardEvent): void {
    const media = this.selectedMedia();
    if (!media) return;
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;

    event.preventDefault();
    this.removeSelectedMedia();
  }

  protected removeSelectedMedia(): void {
    const media = this.selectedMedia();
    if (!media) return;
    this.clearMediaSelection();
    // Videos live inside a <figure class="video-embed"> wrapper — remove the
    // whole wrapper so no empty figure leaks into the saved HTML.
    const wrapper = media.closest('figure');
    (wrapper ?? media).remove();
    this.onInput();
  }

  private selectMedia(media: HTMLElement): void {
    this.clearMediaSelection();
    media.classList.add('is-media-selected');
    this.selectedMedia.set(media);
    // Drop the caret outside the media so typing continues cleanly after it.
    const range = document.createRange();
    const selection = window.getSelection();
    try {
      range.setStartAfter(media);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
    } catch {
      /* detached node — ignore */
    }
    this.updateMediaMenuPos();
  }

  private clearMediaSelection(): void {
    const media = this.selectedMedia();
    media?.classList.remove('is-media-selected');
    this.selectedMedia.set(null);
    this.mediaMenuPos.set(null);
  }

  /** Positions the floating delete button over the selected media. */
  protected updateMediaMenuPos(): void {
    const media = this.selectedMedia();
    if (!media) return;
    const area = this.editorRef().nativeElement;
    const mediaBox = media.getBoundingClientRect();
    const areaBox = area.getBoundingClientRect();
    // getBoundingClientRect already accounts for scroll — just clamp the
    // result into the visible editor box.
    const top = mediaBox.top - areaBox.top + 6;
    const left = mediaBox.left - areaBox.left + area.scrollLeft + mediaBox.width - 30;
    this.mediaMenuPos.set({
      top: Math.max(6, Math.min(top, areaBox.height - 30)),
      left: Math.max(6, Math.min(left, area.clientWidth - 30)),
    });
  }

  /** Inserts the picked item at the saved caret position. */
  protected onMediaPicked(items: MediaItem[]): void {
    const item = items[0];
    if (!item) return;

    const isVideo = item.mimeType.startsWith('video/');
    const html = isVideo
      ? `<figure class="video-embed"><video src="${this.escapeAttr(item.url)}" controls preload="metadata" playsinline></video></figure><p><br></p>`
      : `<img src="${this.escapeAttr(item.url)}" alt="${this.escapeAttr(item.alt || '')}" />`;

    this.insertMediaHtml(html);
  }

  /** Inserts HTML at the saved caret (or editor end) and re-emits the value. */
  private insertMediaHtml(html: string): void {
    this.focusEditor();
    const selection = window.getSelection();
    if (this.savedRange && selection) {
      selection.removeAllRanges();
      selection.addRange(this.savedRange);
    }
    document.execCommand('insertHTML', false, html);
    this.savedRange = null;
    this.onInput();
  }

  private focusEditor(): void {
    const element = this.editorRef().nativeElement;
    if (document.activeElement !== element) {
      element.focus();
      // Place the caret at the end when there is no active selection.
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }

  private escapeAttr(value: string): string {
    const amp = '\u0026';
    return value
      .replaceAll(amp, `${amp}amp;`)
      .replaceAll('"', `${amp}quot;`)
      .replaceAll('<', `${amp}lt;`)
      .replaceAll('>', `${amp}gt;`);
  }
}
