import React from 'react';

const Table = ({ columns, data, onRowClick }) => {
  return (
    <div className="app-table-wrap">
      <table className="app-table min-w-full">
        <thead className="app-table-head">
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                className="app-table-head-cell"
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
                key={rowIndex}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'app-table-row-clickable' : ''}
              >
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="app-table-cell whitespace-nowrap text-slate-900">
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
