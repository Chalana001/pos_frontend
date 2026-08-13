import { useMemo, useState } from "react";
import { AlertCircle, ShieldAlert } from "lucide-react";
import Card from "../common/Card";
import Table from "../common/Table";
import { formatCurrency } from "../../utils/formatters";

export default function ExceptionCenterView({ data }) {
  const [severity,setSeverity]=useState("ALL");
  const rows=useMemo(()=>Array.isArray(data?.items)?data.items:[],[data]);
  const filtered=severity==="ALL"?rows:rows.filter(r=>r.severity===severity);
  const open=r=>window.location.assign(r.path);
  return <div className="space-y-6"><div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-xl border p-4"><p className="text-xs font-bold uppercase text-slate-500">Total Exceptions</p><p className="mt-2 text-2xl font-black">{data?.totalExceptions||0}</p></div><div className="rounded-xl border border-red-200 bg-red-50 p-4"><p className="text-xs font-bold uppercase text-red-600">Critical</p><p className="mt-2 text-2xl font-black text-red-700">{data?.criticalExceptions||0}</p></div><div className="rounded-xl border p-4"><p className="text-xs font-bold uppercase text-slate-500">High</p><p className="mt-2 text-2xl font-black text-amber-700">{rows.filter(r=>r.severity==="HIGH").length}</p></div></div>
  <Card className="admin-panel-card overflow-hidden p-0" title="Business Exceptions"><div className="flex gap-2 border-b p-4">{["ALL","CRITICAL","HIGH"].map(s=><button key={s} onClick={()=>setSeverity(s)} className={`rounded-full px-3 py-2 text-xs font-bold ${severity===s?"bg-red-600 text-white":"bg-slate-100"}`}>{s}</button>)}</div><div className="space-y-3 p-4 md:hidden">{filtered.map((r,i)=><button key={`${r.type}-${r.title}-${i}`} onClick={()=>open(r)} className="w-full rounded-xl border p-4 text-left"><div className="flex justify-between"><p className="font-black">{r.title}</p>{r.severity==="CRITICAL"?<ShieldAlert className="text-red-600" size={20}/>:<AlertCircle className="text-amber-600" size={20}/>}</div><p className="mt-1 text-xs text-slate-500">{r.detail}</p><p className="mt-3 font-bold">{formatCurrency(r.amount)}</p></button>)}</div><div className="hidden md:block"><Table columns={[{header:"Severity",accessor:"severity"},{header:"Type",accessor:"type"},{header:"Entity",accessor:"title"},{header:"Detail",accessor:"detail"},{header:"Amount / Value",render:r=>formatCurrency(r.amount)}]} data={filtered} onRowClick={open}/></div></Card></div>;
}
