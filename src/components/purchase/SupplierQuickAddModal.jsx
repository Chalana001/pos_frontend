import React, { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { suppliersAPI } from "../../api/suppliers.api"; // Updated API import
import { toast } from "react-hot-toast";

const SupplierQuickAddModal = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Supplier name is required");

    setLoading(true);
    try {
      // 👇 Call the new Quick Create endpoint
      const res = await suppliersAPI.quickCreate({ 
        name, 
        phone, 
        address 
      });
      
      toast.success("Supplier added successfully!");
      onCreated(res.data); // Return the new supplier to parent
      
      // Clear form
      setName("");
      setPhone("");
      setAddress("");
      onClose();
      
    } catch (error) {
      console.error(error);
      toast.error("Failed to add supplier");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick Add Supplier">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Supplier Name *</label>
          <input 
            className="input w-full mt-1" 
            placeholder="Ex: Perera Distributors" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            autoFocus
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone (Optional)</label>
          <input 
            className="input w-full mt-1" 
            placeholder="077xxxxxxx" 
            value={phone} 
            onChange={e => setPhone(e.target.value)} 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Address (Optional)</label>
          <textarea 
            className="input w-full mt-1" 
            placeholder="Short address..." 
            value={address} 
            onChange={e => setAddress(e.target.value)} 
            rows={2}
          />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading} className="bg-blue-600">
            {loading ? "Saving..." : "Save Supplier"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SupplierQuickAddModal;