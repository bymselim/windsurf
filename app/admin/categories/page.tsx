"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Category {
  name: string;
  color: string;
  icon: string;
  previewImageUrl?: string;
  order?: number;
  artworkCount?: number;
}

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Add form
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [newIcon, setNewIcon] = useState("🎨");
  const [newPreviewImageUrl, setNewPreviewImageUrl] = useState("");
  const [newOrder, setNewOrder] = useState("100");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editPreviewImageUrl, setEditPreviewImageUrl] = useState("");
  const [editOrder, setEditOrder] = useState("0");
  const [editError, setEditError] = useState("");

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [reassignTo, setReassignTo] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/categories", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      const list: Category[] = Array.isArray(data) ? data : [];
      const sorted = [...list].sort((a, b) => {
        const ao = typeof a.order === "number" && Number.isFinite(a.order) ? a.order : 0;
        const bo = typeof b.order === "number" && Number.isFinite(b.order) ? b.order : 0;
        if (ao !== bo) return ao - bo;
        return String(a.name).localeCompare(String(b.name));
      });
      setCategories(sorted);
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved =
      typeof window !== "undefined" && localStorage.getItem("admin-authenticated");
    setIsAuthenticated(saved === "true");
  }, []);

  useEffect(() => {
    if (isAuthenticated === false) {
      router.replace("/admin/access-logs");
      return;
    }
    if (isAuthenticated) loadCategories();
  }, [isAuthenticated, loadCategories, router]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    const name = newName.trim();
    if (!name) {
      setAddError("Category name is required");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          color: newColor,
          icon: newIcon,
          previewImageUrl: newPreviewImageUrl.trim() || undefined,
          order: Number(newOrder),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to add");
      setCategories((prev) => [...prev, { ...data, artworkCount: 0 }]);
      setNewName("");
      setNewColor("#3b82f6");
      setNewIcon("🎨");
      setNewPreviewImageUrl("");
      setNewOrder("100");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add category");
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingName(cat.name);
    setEditName(cat.name);
    setEditColor(cat.color);
    setEditIcon(cat.icon);
    setEditPreviewImageUrl(cat.previewImageUrl ?? "");
    setEditOrder(String(typeof cat.order === "number" && Number.isFinite(cat.order) ? cat.order : 0));
    setEditError("");
  };

  const cancelEdit = () => {
    setEditingName(null);
  };

  const saveEdit = async () => {
    if (!editingName) return;
    setEditError("");
    const name = editName.trim();
    if (!name) {
      setEditError("Name is required");
      return;
    }
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          oldName: editingName,
          name,
          color: editColor,
          icon: editIcon,
          previewImageUrl: editPreviewImageUrl.trim() || "",
          order: Number(editOrder),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to update");
      setCategories((prev) =>
        prev.map((c) => (c.name === editingName ? { ...c, ...data } : c))
      );
      setEditingName(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !reassignTo) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: deleteTarget, reassignTo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to delete");
      setCategories((prev) => prev.filter((c) => c.name !== deleteTarget));
      setDeleteTarget(null);
      setReassignTo("");
      await loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/admin"
            className="text-sm text-zinc-400 hover:text-amber-500 transition"
          >
            ← Dashboard
          </Link>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-2">Categories</h1>
        <p className="text-zinc-400 mb-8">
          Manage categories. Artworks use these for filtering.
        </p>

        {/* Add category form */}
        <form
          onSubmit={handleAdd}
          className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 mb-8"
        >
          <h2 className="text-lg font-semibold mb-4">Add new category</h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-zinc-400 text-sm mb-1">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Abstract"
                className="w-full min-w-[160px] p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-zinc-400 text-sm mb-1">Preview image URL (optional)</label>
              <input
                type="text"
                value={newPreviewImageUrl}
                onChange={(e) => setNewPreviewImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full min-w-[220px] p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-zinc-400 text-sm mb-1">Order</label>
              <input
                type="number"
                value={newOrder}
                onChange={(e) => setNewOrder(e.target.value)}
                className="w-28 p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-zinc-400 text-sm mb-1">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-zinc-700"
                />
                <input
                  type="text"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="w-24 p-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-zinc-400 text-sm mb-1">Icon (emoji)</label>
              <input
                type="text"
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                placeholder="🎨"
                className="w-20 p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-center text-xl focus:border-amber-500/50 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="px-5 py-3 bg-amber-500 hover:bg-amber-600 rounded-lg font-semibold text-zinc-950 disabled:opacity-50 transition"
            >
              {adding ? "Adding..." : "Add"}
            </button>
          </div>
          {addError ? <p className="mt-3 text-sm text-red-400">{addError}</p> : null}
        </form>

        {/* List */}
        {loading ? (
          <p className="text-zinc-400">Loading categories...</p>
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full">
              <thead className="bg-zinc-900">
                <tr>
                  <th className="p-4 text-left text-sm font-semibold text-zinc-300">
                    Order
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-zinc-300">
                    Name
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-zinc-300">
                    Preview
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-zinc-300">
                    Color
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-zinc-300">
                    Icon
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-zinc-300">
                    Artwork count
                  </th>
                  <th className="p-4 text-left text-sm font-semibold text-zinc-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr
                    key={cat.name}
                    className="border-t border-zinc-800 hover:bg-zinc-900/30"
                  >
                    <td className="p-4 text-zinc-400 font-mono text-sm">
                      {typeof cat.order === "number" && Number.isFinite(cat.order) ? cat.order : 0}
                    </td>
                    <td className="p-4 font-medium">{cat.name}</td>
                    <td className="p-4">
                      {cat.previewImageUrl ? (
                        <Image
                          src={cat.previewImageUrl}
                          alt=""
                          width={64}
                          height={48}
                          unoptimized
                          className="h-12 w-16 rounded-lg object-cover border border-zinc-700"
                        />
                      ) : (
                        <span className="text-zinc-600 text-sm">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded border border-zinc-600"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-zinc-400 font-mono text-sm">
                          {cat.color}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-2xl">{cat.icon}</td>
                    <td className="p-4 text-zinc-400">{cat.artworkCount ?? 0}</td>
                    <td className="p-4">
                      {editingName === cat.name ? (
                        <div className="flex flex-wrap gap-2 items-center">
                          <input
                            type="number"
                            value={editOrder}
                            onChange={(e) => setEditOrder(e.target.value)}
                            placeholder="0"
                            className="w-20 p-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm"
                          />
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Name"
                            className="w-28 p-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm"
                          />
                          <input
                            type="color"
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={editIcon}
                            onChange={(e) => setEditIcon(e.target.value)}
                            placeholder="🎨"
                            className="w-14 p-1.5 bg-zinc-800 border border-zinc-700 rounded text-center text-lg"
                          />
                          <input
                            type="text"
                            value={editPreviewImageUrl}
                            onChange={(e) => setEditPreviewImageUrl(e.target.value)}
                            placeholder="Preview URL"
                            className="w-48 p-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm"
                          />
                          <button
                            type="button"
                            onClick={saveEdit}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 rounded text-sm text-zinc-950"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-sm"
                          >
                            Cancel
                          </button>
                          {editError && (
                            <span className="text-red-400 text-sm">{editError}</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(cat)}
                            className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-sm"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteTarget(cat.name);
                              setReassignTo(
                                categories.find((c) => c.name !== cat.name)?.name ?? ""
                              );
                            }}
                            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {categories.length === 0 && !loading && (
          <p className="text-zinc-500 py-8">No categories yet. Add one above.</p>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">Delete category &quot;{deleteTarget}&quot;?</h3>
            <p className="text-zinc-400 text-sm mb-4">
              Artworks in this category must be reassigned to another category.
            </p>
            <label className="block text-zinc-300 text-sm mb-2">
              Reassign artworks to:
            </label>
            <select
              value={reassignTo}
              onChange={(e) => setReassignTo(e.target.value)}
              className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 mb-4"
            >
              <option value="">Select category</option>
              {categories
                .filter((c) => c.name !== deleteTarget)
                .map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.icon} {c.name}
                  </option>
                ))}
            </select>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setReassignTo("");
                }}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={!reassignTo || deleting}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete & reassign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
