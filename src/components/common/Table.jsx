import React from 'react';

import { Skeleton } from './Skeleton';

const Table = ({
  columns,
  data,
  onRowClick,
  getRowKey,
  compact = false,
  // While loading, hold the layout with skeleton rows instead of collapsing to
  // a spinner - the header stays, nothing shifts when the data lands.
  loading = false,
  skeletonRows = 8,
  // An empty list is where the next action gets taught. Callers say what
  // "nothing here" means for them; the default stays the old neutral line.
  emptyMessage = 'No data available',
}) => {
  return (
    <div className="app-table-wrap" aria-busy={loading || undefined}>
      <table className={`app-table min-w-full ${compact ? 'app-table-compact' : ''}`}>
        <thead className="app-table-head">
          <tr>
            {columns.map((column, index) => (
              <th
                key={column.key ?? column.accessor ?? column.header ?? index}
                className={`app-table-head-cell ${column.headerClassName || ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="app-table-body">
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, rowIndex) => (
              <tr key={`skeleton-${rowIndex}`}>
                {columns.map((column, colIndex) => (
                  <td key={column.key ?? column.accessor ?? colIndex} className="app-table-cell">
                    <Skeleton className="h-3.5 w-full" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="app-table-empty"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={getRowKey?.(row, rowIndex) ?? row.id ?? rowIndex}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'app-table-row-clickable' : ''}
              >
                {columns.map((column, colIndex) => (
                  <td key={column.key ?? column.accessor ?? column.header ?? colIndex} className={`app-table-cell text-slate-800 ${column.className || ''}`}>
                    {column.render ? column.render(row, rowIndex) : row[column.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
