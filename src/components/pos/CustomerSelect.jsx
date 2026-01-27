import React, { useState, useEffect } from 'react';
import { Search, UserPlus, User } from 'lucide-react';
import { customersAPI } from '../../api/customers.api';
import { useDebounce } from '../../hooks/useDebounce';
import Modal from '../common/Modal';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';

const CustomerSelect = ({ isOpen, onClose, onSelectCustomer }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '' });

  useEffect(() => {
    if (isOpen) {
       searchQuery ? searchCustomers() : fetchCustomers();
    }
  }, [isOpen, debouncedSearch]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await customersAPI.getAll();
      setCustomers(response.data);
    } catch(e) { setCustomers([]) } finally { setLoading(false); }
  };

  const searchCustomers = async () => {
    setLoading(true);
    try {
      const response = await customersAPI.search(debouncedSearch);
      setCustomers(response.data);
    } catch(e) { setCustomers([]) } finally { setLoading(false); }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      const response = await customersAPI.create(newCustomer);
      onSelectCustomer(response.data);
      setShowAddForm(false);
      onClose();
    } catch (error) { console.error(error); }
  };

  if (showAddForm) {
    return (
      <Modal isOpen={isOpen} onClose={() => setShowAddForm(false)} title="New Customer">
        <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-slate-700">Name</label>
              <input type="text" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} className="input w-full mt-1" required />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700">Phone</label>
              <input type="text" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} className="input w-full mt-1" required />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700">Address</label>
              <textarea value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} className="input w-full mt-1" rows="3" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
             <Button variant="secondary" type="button" onClick={() => setShowAddForm(false)} className="flex-1">Cancel</Button>
             <Button type="submit" className="flex-1 bg-blue-600">Save Customer</Button>
          </div>
        </form>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Customer">
      <div className="p-4 min-h-[500px] flex flex-col">
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customers..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              autoFocus
            />
          </div>
          <Button onClick={() => setShowAddForm(true)} className="px-4 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200">
            <UserPlus size={20} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? <div className="py-10 flex justify-center"><LoadingSpinner/></div> : customers.map((customer) => (
            <button
              key={customer.id}
              onClick={() => { onSelectCustomer(customer); onClose(); }}
              className="w-full p-4 flex items-center gap-4 bg-white border border-slate-100 hover:border-blue-400 hover:bg-blue-50 rounded-xl transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-200 group-hover:text-blue-600 transition-colors">
                 <User size={20} />
              </div>
              <div>
                 <h3 className="font-bold text-slate-800">{customer.name}</h3>
                 <p className="text-sm text-slate-500 font-mono">{customer.phone}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default CustomerSelect;