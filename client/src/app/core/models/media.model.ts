export interface MediaItem {
  _id: string;
  filename: string;
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  alt?: string;
  folder: string;
  uploadedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaQuery {
  page?: number;
  limit?: number;
  q?: string;
  folder?: string;
  type?: 'image' | 'video' | '';
}

/** Readable file size for the media library grid. */
export const formatFileSize = (bytes: number): string => {
  if (!bytes) return '۰ بایت';
  const units = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};