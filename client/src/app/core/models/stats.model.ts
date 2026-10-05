export interface StatsOverview {
  articles: { total: number; published: number; drafts: number; pending: number };
  users: number;
  comments: { total: number; pending: number };
  subscribers: number;
  messages: { unread: number };
  media: number;
  views: number;
  likes: number;
}

export interface ChartSeriesPoint {
  date: string;
  label: string;
  views: number;
  published: number;
  created: number;
  comments: number;
}

export interface TopArticle {
  _id: string;
  title: string;
  slug: string;
  views: number;
  likes: number;
  commentsCount: number;
  cover?: string;
  publishedAt?: string;
  category?: { _id: string; name: string; slug: string; color?: string };
}

export interface CategoryStat {
  _id: string;
  count: number;
  views: number;
  category?: { _id: string; name: string; slug: string; color?: string };
}

export interface AuthorStat {
  _id: string;
  count: number;
  views: number;
  author?: { name: string; slug?: string; avatar?: string };
}

export interface StatsCharts {
  series: ChartSeriesPoint[];
  topArticles: TopArticle[];
  categoryStats: CategoryStat[];
  topAuthors: AuthorStat[];
}

export interface RecentActivity {
  articles: {
    _id: string;
    title: string;
    slug: string;
    status: string;
    createdAt: string;
    views: number;
    cover?: string;
    author?: { name: string; avatar?: string };
    category?: { name: string; color?: string; slug: string };
  }[];
  comments: {
    _id: string;
    authorName: string;
    content: string;
    status: string;
    createdAt: string;
    article?: { title: string; slug: string };
  }[];
  messages: { _id: string; name: string; subject: string; status: string; createdAt: string }[];
}