import { useEffect, useState } from "preact/hooks";
import { BarList } from "./charts";

export function usePaged<T>(items: T[], size: number) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(page, pages - 1);
  return {
    slice: items.slice(current * size, current * size + size),
    page: current,
    pages,
    total: items.length,
    from: items.length ? current * size + 1 : 0,
    to: Math.min(items.length, current * size + size),
    setPage,
  };
}

type PagerProps = {
  page: number;
  pages: number;
  from: number;
  to: number;
  total: number;
  setPage: (n: number) => void;
};

export function Pager({ page, pages, from, to, total, setPage }: PagerProps) {
  if (pages < 2) return null;
  return (
    <div class="pager">
      <span class="muted">
        {from}-{to} из {total}
      </span>
      <span class="sp" />
      <button type="button" class="btn" disabled={page === 0} onClick={() => setPage(page - 1)}>
        Назад
      </button>
      <span class="muted">
        {page + 1} / {pages}
      </span>
      <button type="button" class="btn" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
        Вперёд
      </button>
    </div>
  );
}

type Row = [string, number];

export function BarTable({ items, size = 8 }: { items: Row[]; size?: number }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"count" | "name">("count");
  const total = items.reduce((a, r) => a + r[1], 0);
  const q = query.trim().toLowerCase();
  const rows = items
    .filter(([name]) => !q || name.toLowerCase().includes(q))
    .sort((a, b) => (sort === "count" ? b[1] - a[1] : a[0].localeCompare(b[0])));
  const paged = usePaged(rows, size);
  const max = Math.max(1, ...items.map((r) => r[1]));

  useEffect(() => paged.setPage(0), [query, sort]);

  if (!items.length) return <p class="muted">Пока нет данных</p>;

  return (
    <div class="bt">
      {items.length > size && (
        <div class="bt-tools">
          <input
            value={query}
            placeholder="Фильтр"
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          />
          <select
            aria-label="Сортировка"
            value={sort}
            onChange={(e) => setSort((e.target as HTMLSelectElement).value as "count" | "name")}
          >
            <option value="count">По числу</option>
            <option value="name">По названию</option>
          </select>
        </div>
      )}
      <BarList items={paged.slice} total={total} max={max} />
      {!rows.length && <p class="muted">Ничего не найдено</p>}
      <Pager {...paged} />
    </div>
  );
}
