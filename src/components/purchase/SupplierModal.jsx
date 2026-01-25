import React, { useState } from "react";
import Card from "../common/Card";
import Button from "../common/Button";
import { supplierAPI } from "../../api/supplier.api";

export default function SupplierModal({ open, onClose, onSaved }) {
  const [name, setName] = useState("");

  if (!open) return null;

  const save = async () => {
    const res = await supplierAPI.create({ name });
    onSaved(res.data);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
      <Card className="p-5 w-96 space-y-3">
        <h2 className="text-lg font-semibold">Add Supplier</h2>
        <input
          placeholder="Supplier Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border rounded px-3 py-2 w-full"
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </div>
      </Card>
    </div>
  );
}
