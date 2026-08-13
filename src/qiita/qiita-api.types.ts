export interface QiitaArticle {
  id: string;
  title: string;
  url: string;
  likes_count: number;
  stocks_count: number;
  page_views_count: number | null;
  created_at: string;
}
