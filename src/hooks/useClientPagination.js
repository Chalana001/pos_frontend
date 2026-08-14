import { useEffect, useMemo, useState } from 'react';

export default function useClientPagination(items, resetKey, initialPageSize = 25) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const totalPages = Math.ceil(items.length / pageSize);

  useEffect(() => setPage(0), [resetKey, pageSize]);
  useEffect(() => {
    if (page > Math.max(totalPages - 1, 0)) setPage(Math.max(totalPages - 1, 0));
  }, [page, totalPages]);

  const pageItems = useMemo(() => items.slice(page * pageSize, (page + 1) * pageSize), [items, page, pageSize]);
  return { page, setPage, pageSize, setPageSize, totalPages, pageItems };
}
