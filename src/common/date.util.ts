// 集計期間（開始日）の変換処理
export function parseJstDateStart(dateStr: string): Date {
  // 日本時間で渡ってくるため、+09:00:00をつけて日本時間として変換
  return new Date(`${dateStr}T00:00:00+09:00`);
}

// 集計期間（終了日）の変換処理
export function parseJstDateExclusiveEnd(dateStr: string): Date {
  const date = new Date(`${dateStr}T00:00:00+09:00`);
  // setUTCDate()を使っている理由としては、ローカル版のsetDate()だと実行環境のタイムゾーンに影響するため
  // 1日進めている理由は、集計期間で x < 終了日+1 のように比較するため
  date.setUTCDate(date.getUTCDate() + 1);

  return date;
}
