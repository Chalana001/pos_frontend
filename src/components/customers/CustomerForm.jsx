import React, { useState } from "react";
import Button from "../common/Button";
import { Image as ImageIcon } from "lucide-react";

const CustomerForm = ({ formData, setFormData, onSubmit, onCancel, submitting }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* ✅ Layout: left image + right fields */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Image */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden h-full">
            <div className="px-5 py-4 bg-slate-50 border-b">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <ImageIcon size={18} />
                Customer Image
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Paste image URL to preview
              </p>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Image URL
                </label>
                <input
                  type="text"
                  value={formData.imageUrl || ""}
                  onChange={(e) => {
                    setFormData({ ...formData, imageUrl: e.target.value });
                    setImgError(false);
                  }}
                  className="input"
                  placeholder="https://..."
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
                  {formData.imageUrl && !imgError ? (
                    <img
                      src={formData.imageUrl}
                      alt="preview"
                      className="w-full h-full object-cover"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div className="text-center text-slate-500 text-sm px-4">
                      {imgError ? "Invalid image URL" : "Image preview will appear here"}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
                  disabled
                >
                  Replace
                </button>
                <button
                  type="button"
                  className="text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
                  disabled
                >
                  Remove
                </button>
              </div>

              <button
                type="button"
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
                disabled
              >
                + Add Another Image
              </button>
            </div>
          </div>
        </div>

        {/* Right Fields */}
        <div className="lg:col-span-2 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Phone Number *
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
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
        </div>
      </div>
    </form>
  );
};

export default CustomerForm;
