import Button from './Button';
import CustomSelect from './CustomSelect';

const PAGE_SIZE_OPTIONS = [25, 50, 100].map((n) => ({ value: n, label: String(n) }));

export default function ClientPagination({ page, pageSize, totalItems, totalPages, onPageChange, onPageSizeChange }) {
  if (totalItems === 0) return null;
  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalItems);
  return <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row">
    <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-600 sm:justify-start"><span>Showing {from} {to} of {totalItems}</span><label className="flex items-center gap-2">Rows<CustomSelect value={pageSize} onChange={(v) => onPageSizeChange(Number(v))} options={PAGE_SIZE_OPTIONS} className="w-[72px]" buttonClassName="h-8 py-0 px-2" /></label></div>
    <div className="flex items-center gap-2"><Button variant="secondary" className="px-3 py-1 text-sm" disabled={page===0} onClick={()=>onPageChange(page-1)}>Prev</Button><span className="min-w-20 text-center text-xs font-bold text-slate-600">Page {page+1} of {Math.max(totalPages,1)}</span><Button variant="secondary" className="px-3 py-1 text-sm" disabled={page>=totalPages-1} onClick={()=>onPageChange(page+1)}>Next</Button></div>
  </div>;
}
