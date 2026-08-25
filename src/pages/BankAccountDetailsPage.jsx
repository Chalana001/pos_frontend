import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { Landmark } from "lucide-react";

import { bankAccountsAPI } from "../api/bankAccounts.api";
import { cashDropsAPI } from "../api/cashDrops.api";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import LoadingSpinner from "../components/common/LoadingSpinner";
import TablePagination from "../components/common/TablePagination";
import { formatCurrency, formatDateTime } from "../utils/formatters";

const PAGE_SIZE = 15;

/**
 * A bank account's own profile page — same shape as CustomerViewPage:
 * identity + at-a-glance stats up top, transaction history below.
 * "History" here is every cash drop (in-shift or outside-shift) that named
 * this account, reusing the same /cash-drops list the main Cash Drops page
 * uses, just filtered to this one bankAccountId.
 */
const BankAccountDetailsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [summary, setSummary] = useState({ totalAmount: 0, dropCount: 0, averageAmount: 0 });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [drops, setDrops] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    const loadAccount = async () => {
      setLoading(true);
      try {
        const response = await bankAccountsAPI.getById(id);
        setAccount(response.data);
      } catch (error) {
        console.error("Failed to load bank account", error);
        toast.error("Failed to load bank account");
        navigate("/cash-drops/bank-accounts");
      } finally {
        setLoading(false);
      }
    };

    loadAccount();
  }, [id, navigate]);

  useEffect(() => {
    const loadSummary = async () => {
      setSummaryLoading(true);
      try {
        const response = await cashDropsAPI.getSummary({ bankAccountId: id });
        setSummary({
          totalAmount: response.data?.totalAmount || 0,
          dropCount: response.data?.dropCount || 0,
          averageAmount: response.data?.averageAmount || 0,
        });
      } catch (error) {
        console.error("Failed to load bank account summary", error);
      } finally {
        setSummaryLoading(false);
      }
    };

    loadSummary();
  }, [id]);

  useEffect(() => {
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const response = await cashDropsAPI.getAll({ bankAccountId: id, page, size: PAGE_SIZE });
        const content = response.data?.content || [];
        setDrops(content);
        setTotalPages(response.data?.totalPages || 0);
        setTotalElements(response.data?.totalElements || content.length);
      } catch (error) {
        console.error("Failed to load bank account history", error);
        setDrops([]);
        setTotalPages(0);
        setTotalElements(0);
      } finally {
        setHistoryLoading(false);
      }
    };

    loadHistory();
  }, [id, page]);

  useEffect(() => {
    setPageInput(String(page + 1));
  }, [page]);

  const goToPage = () => {
    const requestedPage = Number(pageInput);
    if (!Number.isInteger(requestedPage)) {
      setPageInput(String(page + 1));
      return;
    }
    const maxPage = totalPages > 0 ? totalPages : 1;
    setPage(Math.min(Math.max(requestedPage, 1), maxPage) - 1);
  };

  return (
    <div className="page-enter space-y-6">
      <div className="page-section-enter flex items-center justify-between" style={{ animationDelay: "40ms" }}>
        <h1 className="text-3xl font-bold text-slate-800">Bank Account Profile</h1>
        <Button variant="secondary" onClick={() => navigate("/cash-drops/bank-accounts")}>
          Back
        </Button>
      </div>

      <Card className="sales-panel-enter" style={{ animationDelay: "90ms" }}>
        {loading ? (
          <div className="py-12 text-slate-600">
            <LoadingSpinner size="lg" text="Loading bank account..." />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="w-full lg:w-56">
                <div
                  className="profile-detail-card shell-panel shell-panel-hover flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                  style={{ animationDelay: "130ms" }}
                >
                  <Landmark size={56} className="text-blue-600" />
                </div>
              </div>

              <div className="page-section-enter flex-1" style={{ animationDelay: "170ms" }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-500">Account ID: {id}</div>
                    <div className="mt-1 text-2xl font-bold text-slate-800">{account?.name || "—"}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {account?.bankName || "—"}
                      {account?.accountNumber ? ` · ${account.accountNumber}` : ""}
                    </div>
                  </div>

                  <div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        account?.active ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {account?.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div
                    className="profile-stat-card shell-panel shell-panel-hover rounded-xl border border-slate-200 bg-white p-4"
                    style={{ animationDelay: "210ms" }}
                  >
                    <div className="text-xs text-slate-500">Total Deposited</div>
                    <div className="mt-1 text-xl font-bold text-emerald-700">
                      {summaryLoading ? formatCurrency(0) : formatCurrency(summary.totalAmount)}
                    </div>
                  </div>

                  <div
                    className="profile-stat-card shell-panel shell-panel-hover rounded-xl border border-slate-200 bg-white p-4"
                    style={{ animationDelay: "250ms" }}
                  >
                    <div className="text-xs text-slate-500">Number of Drops</div>
                    <div className="mt-1 text-xl font-bold text-slate-800">
                      {summaryLoading ? "0" : summary.dropCount}
                    </div>
                  </div>

                  <div
                    className="profile-stat-card shell-panel shell-panel-hover rounded-xl border border-slate-200 bg-white p-4"
                    style={{ animationDelay: "290ms" }}
                  >
                    <div className="text-xs text-slate-500">Average Drop</div>
                    <div className="mt-1 text-xl font-bold text-slate-800">
                      {summaryLoading ? formatCurrency(0) : formatCurrency(summary.averageAmount)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <h2 className="mb-4 text-lg font-bold text-slate-800">History</h2>

              <div className="sales-panel-enter overflow-hidden rounded-xl border border-slate-200 bg-white" style={{ animationDelay: "110ms" }}>
                {historyLoading ? (
                  <div className="py-12">
                    <LoadingSpinner size="lg" text="Loading history..." />
                  </div>
                ) : drops.length === 0 ? (
                  <div className="p-6 text-sm text-slate-500">No deposits recorded to this account yet.</div>
                ) : (
                  <div className="app-table-wrap">
                    <table className="app-table">
                      <thead className="app-table-head">
                        <tr>
                          <th className="app-table-head-cell !px-4">Date & Time</th>
                          <th className="app-table-head-cell !px-4">Reason</th>
                          <th className="app-table-head-cell !px-4">Recorded By</th>
                          <th className="app-table-head-cell !px-4 text-center">Shift</th>
                          <th className="app-table-head-cell !px-4 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="app-table-body">
                        {drops.map((drop) => (
                          <tr key={drop.id} className="border-b last:border-0">
                            <td className="app-table-cell !px-4 text-slate-600">{formatDateTime(drop.createdAt)}</td>
                            <td className="app-table-cell !px-4">
                              <span className="block max-w-[280px] truncate" title={drop.reason}>
                                {drop.reason}
                              </span>
                            </td>
                            <td className="app-table-cell !px-4 text-slate-600">{drop.cashierName}</td>
                            <td className="app-table-cell !px-4 text-center">
                              {drop.outsideShift || !drop.shiftId ? (
                                <span className="px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-700">
                                  Outside Shift
                                </span>
                              ) : (
                                <span className="text-slate-500">#{drop.shiftId}</span>
                              )}
                            </td>
                            <td className="app-table-cell !px-4 text-right font-semibold text-blue-600">
                              {formatCurrency(drop.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <TablePagination
                  summary={`Showing ${drops.length} of ${totalElements} deposits. Page ${page + 1} of ${totalPages === 0 ? 1 : totalPages}`}
                  page={page}
                  pageInput={pageInput}
                  totalPages={totalPages}
                  loading={historyLoading}
                  onPageChange={setPage}
                  onPageInputChange={setPageInput}
                  onGoToPage={goToPage}
                />
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default BankAccountDetailsPage;
