import React from 'react';

const Table = ({ columns, data, onRowClick, getRowKey, compact = false }) => {
  return (
    <div className="app-table-wrap">
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
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="app-table-empty"
              >
                No data available
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
