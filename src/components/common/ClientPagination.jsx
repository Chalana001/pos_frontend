import Button from './Button';

export default function ClientPagination({ page, pageSize, totalItems, totalPages, onPageChange, onPageSizeChange }) {
  if (totalItems === 0) return null;
  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalItems);
  return <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row">
    <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-600 sm:justify-start"><span>Showing {from}–{to} of {totalItems}</span><label className="flex items-center gap-2">Rows<select className="h-8 rounded-lg border border-slate-300 bg-white px-2" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label></div>
    <div className="flex items-center gap-2"><Button variant="secondary" className="px-3 py-1 text-sm" disabled={page===0} onClick={()=>onPageChange(page-1)}>Prev</Button><span className="min-w-20 text-center text-xs font-bold text-slate-600">Page {page+1} of {Math.max(totalPages,1)}</span><Button variant="secondary" className="px-3 py-1 text-sm" disabled={page>=totalPages-1} onClick={()=>onPageChange(page+1)}>Next</Button></div>
  </div>;
}
