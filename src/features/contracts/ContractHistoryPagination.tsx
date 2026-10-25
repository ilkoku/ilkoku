import Link from "next/link";

export function parseContractPage(raw: string | undefined): number {
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : 1;
}

export function ContractHistoryPagination({
  path,
  page,
  total,
  pageSize,
  totalPages,
  pageParam = "sayfa",
  preservedParams = {},
  label,
}: {
  path: string;
  page: number;
  total: number;
  pageSize: number;
  totalPages: number;
  pageParam?: string;
  preservedParams?: Record<string, string | undefined>;
  label: string;
}) {
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(total, page * pageSize);
  function href(nextPage: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(preservedParams)) {
      if (value) params.set(key, value);
    }
    if (nextPage !== 1) params.set(pageParam, String(nextPage));
    const query = params.toString();
    return query ? `${path}?${query}` : path;
  }

  return (
    <nav className="contract-history-pagination" aria-label={label}>
      <span>
        <strong>{total}</strong> toplam kayıt · {start}–{end} gösteriliyor ·
        Sayfa {page}/{totalPages}
      </span>
      <div>
        {page > 1 ? <Link href={href(page - 1)}>← Önceki</Link> : <span>← Önceki</span>}
        {page < totalPages ? <Link href={href(page + 1)}>Sonraki →</Link> : <span>Sonraki →</span>}
      </div>
    </nav>
  );
}
