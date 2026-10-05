import { Pipe, PipeTransform } from '@angular/core';
import { faDate, faDateTime, faNumber, faRelativeTime, faShortDate, toPersianDigits } from '../../core/utils/format';

@Pipe({ name: 'faNumber' })
export class FaNumberPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return faNumber(value);
  }
}

@Pipe({ name: 'faDate' })
export class FaDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined, mode: 'full' | 'short' | 'datetime' | 'relative' = 'full'): string {
    switch (mode) {
      case 'short':
        return faShortDate(value);
      case 'datetime':
        return faDateTime(value);
      case 'relative':
        return faRelativeTime(value);
      default:
        return faDate(value);
    }
  }
}

@Pipe({ name: 'faDigits' })
export class FaDigitsPipe implements PipeTransform {
  transform(value: string | number | null | undefined): string {
    return value === null || value === undefined ? '' : toPersianDigits(value);
  }
}