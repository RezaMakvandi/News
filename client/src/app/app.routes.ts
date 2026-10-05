import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard, staffGuard } from './core/guards/auth.guard';

/**
 * Route order matters:
 *  1. `/admin/login` and `/admin` come FIRST so the public layout's `**`
 *     catch-all (inside the `path: ''` route) never swallows them.
 *  2. All public routes are children of the public layout at `path: ''`,
 *     which matches any prefix and provides header/footer/ticker chrome.
 */
export const routes: Routes = [
  {
    path: 'admin/login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/pages/login/login').then((m) => m.LoginPage),
    title: 'ورود به پنل مدیریت | زوم‌آیتی',
  },
  {
    path: 'admin',
    canActivate: [authGuard, staffGuard],
    loadComponent: () =>
      import('./features/admin/components/admin-layout/admin-layout').then(
        (m) => m.AdminLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/admin/pages/dashboard/dashboard').then((m) => m.DashboardPage),
        title: 'داشبورد | پنل مدیریت',
      },
      {
        path: 'articles',
        loadComponent: () =>
          import('./features/admin/pages/articles/articles').then((m) => m.ArticlesPage),
        title: 'مدیریت اخبار | پنل مدیریت',
      },
      {
        path: 'articles/new',
        loadComponent: () =>
          import('./features/admin/pages/article-editor/article-editor').then(
            (m) => m.ArticleEditorPage,
          ),
        title: 'خبر جدید | پنل مدیریت',
      },
      {
        path: 'articles/:id/edit',
        loadComponent: () =>
          import('./features/admin/pages/article-editor/article-editor').then(
            (m) => m.ArticleEditorPage,
          ),
        title: 'ویرایش خبر | پنل مدیریت',
      },
      {
        path: 'categories',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/pages/categories/categories').then((m) => m.CategoriesPage),
        title: 'دسته‌بندی‌ها | پنل مدیریت',
      },
      {
        path: 'tags',
        loadComponent: () => import('./features/admin/pages/tags/tags').then((m) => m.TagsPage),
        title: 'برچسب‌ها | پنل مدیریت',
      },
      {
        path: 'comments',
        loadComponent: () =>
          import('./features/admin/pages/comments/comments').then((m) => m.CommentsPage),
        title: 'مدیریت نظرات | پنل مدیریت',
      },
      {
        path: 'media',
        loadComponent: () => import('./features/admin/pages/media/media').then((m) => m.MediaPage),
        title: 'کتابخانه رسانه | پنل مدیریت',
      },
      {
        path: 'users',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/pages/users/users').then((m) => m.UsersPage),
        title: 'کاربران | پنل مدیریت',
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./features/admin/pages/messages/messages').then((m) => m.MessagesPage),
        title: 'پیام‌های تماس | پنل مدیریت',
      },
      {
        path: 'subscribers',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/pages/subscribers/subscribers').then((m) => m.SubscribersPage),
        title: 'اعضای خبرنامه | پنل مدیریت',
      },
      {
        path: 'pages',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/pages/pages/pages').then((m) => m.PagesPage),
        title: 'صفحات ثابت | پنل مدیریت',
      },
      {
        path: 'settings',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/pages/settings/settings').then((m) => m.SettingsPage),
        title: 'تنظیمات | پنل مدیریت',
      },
    ],
  },
  {
    path: '',
    loadComponent: () =>
      import('./features/public/components/public-layout/public-layout').then(
        (m) => m.PublicLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/public/pages/home/home').then((m) => m.HomePage),
        title: 'زوم‌آیتی | رسانه فناوری',
      },
      {
        path: 'category/:slug',
        loadComponent: () =>
          import('./features/public/pages/category/category').then((m) => m.CategoryPage),
      },
      {
        path: 'news/:slug',
        loadComponent: () =>
          import('./features/public/pages/article/article').then((m) => m.ArticlePage),
      },
      {
        path: 'tag/:slug',
        loadComponent: () => import('./features/public/pages/tag/tag').then((m) => m.TagPage),
      },
      {
        path: 'author/:slug',
        loadComponent: () =>
          import('./features/public/pages/author/author').then((m) => m.AuthorPage),
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./features/public/pages/search/search').then((m) => m.SearchPage),
        title: 'جستجو | زوم‌آیتی',
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./features/public/pages/contact/contact').then((m) => m.ContactPage),
        title: 'تماس با ما | زوم‌آیتی',
      },
      {
        path: 'page/:slug',
        loadComponent: () =>
          import('./features/public/pages/static-page/static-page').then((m) => m.StaticPage),
      },
      {
        path: '**',
        loadComponent: () =>
          import('./features/public/pages/not-found/not-found').then((m) => m.NotFoundPage),
        title: 'صفحه یافت نشد | زوم‌آیتی',
      },
    ],
  },
];