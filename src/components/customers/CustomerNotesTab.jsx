import React, { useEffect, useMemo, useState } from "react";
import Button from "../common/Button";
import { toast } from "react-hot-toast";
import { Plus, Trash2, Edit3, Pin } from "lucide-react";
import { customersAPI } from "../../api/customers.api";

const CustomerNotesTab = ({ customerId }) => {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState([]);

  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await customersAPI.getNotes(customerId, { page: 0, size: 50 });
      const data = res.data?.items ?? res.data;
      setNotes(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const sortedNotes = useMemo(() => {
    const arr = [...notes];
    return arr.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [notes]);

  const handleAdd = async () => {
    const v = newNote.trim();
    if (!v) return toast.error("Write a note first");

    setSaving(true);
    try {
      await customersAPI.createNote(customerId, { note: v });
      setNewNote("");
      toast.success("Note added ✅");
      fetchNotes();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to add note");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (n) => {
    setEditingId(n.id);
    setEditValue(n.note);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveEdit = async () => {
    const v = editValue.trim();
    if (!v) return toast.error("Note cannot be empty");

    try {
      await customersAPI.updateNote(editingId, { note: v });
      toast.success("Note updated ✅");
      cancelEdit();
      fetchNotes();
    } catch {
      toast.error("Failed to update note");
    }
  };

  const togglePin = async (note) => {
    // if backend doesn't have pin endpoint now -> keep UI only
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, pinned: !n.pinned } : n))
    );
  };

  const deleteNote = async (noteId) => {
    try {
      await customersAPI.deleteNote(noteId);
      toast.success("Note deleted ✅");
      fetchNotes();
    } catch {
      toast.error("Failed to delete note");
    }
  };

  return (
    <div className="space-y-5">
      {/* Add note box */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800">Add Note</h3>
          <span className="text-xs text-slate-500">Customer #{customerId}</span>
        </div>

        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          rows={4}
          placeholder="Type customer note here..."
          className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex justify-end mt-3">
          <Button type="button" onClick={handleAdd} disabled={saving}>
            <Plus size={18} className="mr-2" />
            {saving ? "Saving..." : "Add Note"}
          </Button>
        </div>
      </div>

      {/* Notes list */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Notes</h3>
          <span className="text-xs text-slate-500">{notes.length} notes</span>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading notes...</div>
        ) : sortedNotes.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No notes yet.</div>
        ) : (
          <div className="divide-y">
            {sortedNotes.map((n) => (
              <div key={n.id} className="p-5 hover:bg-slate-50 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {n.pinned && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800 font-semibold">
                          <Pin size={14} />
                          Pinned
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        {n.createdAt ? new Date(n.createdAt).toLocaleString() : "—"}
                      </span>
                    </div>

                    {editingId === n.id ? (
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex gap-2">
                          <Button type="button" onClick={saveEdit}>Save</Button>
                          <Button type="button" variant="secondary" onClick={cancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-800 whitespace-pre-wrap">
                        {n.note}
                      </p>
                    )}
                  </div>

                  {editingId !== n.id && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => togglePin(n)}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-white text-slate-700"
                        title="Pin/Unpin"
                      >
                        <Pin size={18} />
                      </button>

                      <button
                        type="button"
                        onClick={() => startEdit(n)}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-white text-blue-700"
                        title="Edit"
                      >
                        <Edit3 size={18} />
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteNote(n.id)}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-white text-red-700"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerNotesTab;
