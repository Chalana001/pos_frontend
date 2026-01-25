import React, { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { suppliersAPI } from "../../api/suppliers.api";
import { toast } from "react-hot-toast";

const SupplierQuickAddModal = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Supplier name required");

    setLoading(true);
    try {
      const res = await suppliersAPI.create({ name, phone, address });
      toast.success("Supplier added");
      onCreated(res.data); // return new supplier
      onClose();
    } catch {
      toast.error("Failed to save supplier");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Supplier">
      <div className="space-y-4">
        <input className="input" placeholder="Supplier Name *" value={name} onChange={e => setName(e.target.value)} />
        <input className="input" placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
        <textarea className="input" placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} />

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SupplierQuickAddModal;
