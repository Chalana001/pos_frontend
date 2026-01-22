import React, { useState, useEffect } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { customersAPI } from '../../api/customers.api';
import { useDebounce } from '../../hooks/useDebounce';
import Modal from '../common/Modal';
import Button from '../common/Button';

const CustomerSelect = ({ isOpen, onClose, onSelectCustomer }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (debouncedSearch) {
      searchCustomers();
    } else {
      fetchCustomers();
    }
  }, [debouncedSearch]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await customersAPI.getAll();
      setCustomers(response.data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchCustomers = async () => {
    setLoading(true);
    try {
      const response = await customersAPI.search(debouncedSearch);
      setCustomers(response.data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      const response = await customersAPI.create(newCustomer);
      onSelectCustomer(response.data);
      setShowAddForm(false);
      setNewCustomer({ name: '', phone: '', address: '' });
      onClose();
    } catch (error) {
      console.error('Failed to add customer:', error);
    }
  };

  if (showAddForm) {
    return (
      <Modal isOpen={isOpen} onClose={() => setShowAddForm(false)} title="Add New Customer">
        <form onSubmit={handleAddCustomer} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input
              type="text"
              value={newCustomer.name}
              onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
            <input
              type="text"
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <textarea
              value={newCustomer.address}
              onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
              className="input"
              rows="3"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">Add Customer</Button>
            <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Customer" size="lg">
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <Button onClick={() => setShowAddForm(true)} variant="success">
            <UserPlus size={20} />
          </Button>
        </div>

        <div className="max-h-96 overflow-y-auto space-y-2">
          {customers.map((customer) => (
            <button
              key={customer.id}
              onClick={() => {
                onSelectCustomer(customer);
                onClose();
              }}
              className="w-full p-4 bg-slate-50 hover:bg-blue-50 rounded-lg transition-colors text-left border border-slate-200 hover:border-blue-300"
            >
              <h3 className="font-semibold text-slate-800">{customer.name}</h3>
              <p className="text-sm text-slate-500">{customer.phone}</p>
              {customer.address && (
                <p className="text-xs text-slate-400 mt-1">{customer.address}</p>
              )}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default CustomerSelect;