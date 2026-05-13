import React from "react";
import { CalendarDays, CheckCircle2, GitBranch, History, Tag } from "lucide-react";
import { APP_VERSION, VERSION_HISTORY } from "../data/versionHistory";

const sectionTone = {
  Added: "border-blue-200 bg-blue-50 text-blue-700",
  Improved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Changed: "border-violet-200 bg-violet-50 text-violet-700",
  Fixed: "border-amber-200 bg-amber-50 text-amber-700",
};

const VersionHistoryPage = () => {
  return (
    <div className="page-enter mx-auto max-w-5xl space-y-6">
      <div className="page-section-enter flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" style={{ animationDelay: "40ms" }}>
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold uppercase text-white">
            <History size={14} />
            Version History
          </div>
          <h1 className="mt-4 text-3xl font-bold text-slate-900">System changelog</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Release notes are saved here version by version. Current version is v{APP_VERSION}.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-500">Current Version</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">v{APP_VERSION}</div>
        </div>
      </div>

      <div className="space-y-5">
        {VERSION_HISTORY.map((release, index) => (
          <article
            key={release.version}
            className="admin-panel-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            style={{ animationDelay: `${90 + Math.min(index, 6) * 45}ms` }}
          >
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-bold text-white">
                    <Tag size={15} />
                    v{release.version}
                  </span>
                  {index === 0 && (
                    <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700">
                      Latest
                    </span>
                  )}
                </div>
                <h2 className="mt-3 text-xl font-bold text-slate-900">{release.title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{release.summary}</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <CalendarDays size={16} />
                {release.releaseDate}
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {release.sections.map((section) => (
                <section key={`${release.version}-${section.label}`} className="rounded-lg border border-slate-200 p-4">
                  <h3
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase ${
                      sectionTone[section.label] || "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    {section.label}
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {section.items.map((item) => (
                      <li key={item} className="flex gap-2 text-sm leading-5 text-slate-700">
                        <CheckCircle2 className="mt-0.5 shrink-0 text-slate-400" size={16} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            {Array.isArray(release.flowMap) && release.flowMap.length > 0 && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold uppercase text-white">
                    <GitBranch size={14} />
                    Updated Flow Map
                  </span>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {release.flowMap.map((flow) => (
                    <section key={`${release.version}-${flow.title}`} className="rounded-lg border border-slate-200 bg-white p-4">
                      <h3 className="text-sm font-bold text-slate-900">{flow.title}</h3>
                      <ol className="mt-3 space-y-2">
                        {flow.steps.map((step, stepIndex) => (
                          <li key={step} className="flex gap-3 text-sm leading-5 text-slate-700">
                            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                              {stepIndex + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </section>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
};

export default VersionHistoryPage;
