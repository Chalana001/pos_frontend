import React from "react";
import Button from "../common/Button";

const ItemForm = ({ formData, setFormData, onSubmit, onCancel, submitting }) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4 mt-6">
      {/* Item Name */}
      <div>
        <label htmlFor="itemform-item-name" className="block text-sm font-medium text-slate-700 mb-1">
          Item Name *
        </label>
        <input id="itemform-item-name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="input"
          required
        />
      </div>

      {/* Barcode */}
      <div>
        <label htmlFor="itemform-barcode" className="block text-sm font-medium text-slate-700 mb-1">
          Barcode *
        </label>
        <input id="itemform-barcode"
          type="text"
          value={formData.barcode}
          onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
          className="input"
          required
        />
      </div>

      {/* Category */}
      <div>
        <label htmlFor="itemform-category" className="block text-sm font-medium text-slate-700 mb-1">
          Category
        </label>
        <input id="itemform-category"
          type="text"
          value={formData.category}
          onChange={(e) =>
            setFormData({ ...formData, category: e.target.value })
          }
          className="input"
        />
      </div>

      {/* Prices */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="itemform-cost-price" className="block text-sm font-medium text-slate-700 mb-1">
            Cost Price *
          </label>
          <input id="itemform-cost-price"
            type="number"
            min="0"
            step="0.01"
            value={formData.costPrice}
            onChange={(e) =>
              setFormData({ ...formData, costPrice: e.target.value })
            }
            className="input"
            required
          />
        </div>

        <div>
          <label htmlFor="itemform-selling-price" className="block text-sm font-medium text-slate-700 mb-1">
            Selling Price *
          </label>
          <input id="itemform-selling-price"
            type="number"
            min="0"
            step="0.01"
            value={formData.sellingPrice}
            onChange={(e) =>
              setFormData({ ...formData, sellingPrice: e.target.value })
            }
            className="input"
            required
          />
        </div>
      </div>

      {/* Reorder */}
      <div>
        <label htmlFor="itemform-reorder-level" className="block text-sm font-medium text-slate-700 mb-1">
          Reorder Level
        </label>
        <input id="itemform-reorder-level"
          type="number"
          min="0"
          value={formData.reorderLevel}
          onChange={(e) =>
            setFormData({ ...formData, reorderLevel: e.target.value })
          }
          className="input"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1" disabled={submitting}>
          {submitting ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default ItemForm;
