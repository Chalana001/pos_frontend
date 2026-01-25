import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { purchasesAPI } from "../../api/purchases.api";
import Card from "../../components/common/Card";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { Plus } from "lucide-react";
import { formatCurrency } from "../../utils/formatters";

const PurchasesPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await purchasesAPI.list();
      setData(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { header: "Invoice No", accessor: "invoiceNo" },
    { header: "Supplier", accessor: "supplierName" },
    { header: "Branch", accessor: "branchName" },
    { header: "Date", render: (r) => new Date(r.date).toLocaleDateString() },
    { header: "Items", accessor: "totalItems" },
    { header: "Total", render: (r) => formatCurrency(r.grandTotal) },
    {
      header: "Actions",
      render: (r) => (
        <button
          onClick={() => navigate(`/purchases/${r.id}`)}
          className="text-blue-600"
        >
          View
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold">Purchases</h1>
        <Button onClick={() => navigate("/purchases/new")}>
          <Plus size={18} className="mr-2" /> Add Purchase
        </Button>
      </div>

      <Card>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <Table columns={columns} data={data} />
        )}
      </Card>
    </div>
  );
};

export default PurchasesPage;
