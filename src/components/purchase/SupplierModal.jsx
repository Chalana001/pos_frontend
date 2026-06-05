import React, { useState } from "react";
import Button from "../common/Button";
import Modal from "../common/Modal";
import { suppliersAPI } from "../../api/suppliers.api";

export default function SupplierModal({ open, onClose, onSaved }) {
  const [name, setName] = useState("");

  const save = async () => {
    const res = await suppliersAPI.create({ name });
    onSaved(res.data);
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Add Supplier" size="sm">
      <div className="space-y-4">
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
      </div>
    </Modal>
  );
}
