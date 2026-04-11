"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Trash2,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Mail,
  Calendar,
} from "lucide-react";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatRupiah(n) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 0,
  }).format(n);
}

const providerBadge = {
  google: "bg-blue-50 text-blue-700",
  facebook: "bg-indigo-50 text-indigo-700",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [success, setSuccess] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
    fetchUsers();
  };

  const handleSelectUser = async (user) => {
    if (selectedUser?.id === user.id) {
      setSelectedUser(null);
      return;
    }
    setSelectedUser(user);
    setLoadingOrders(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`);
      const data = await res.json();
      if (data.success) {
        setUserOrders(data.data.orders || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleDelete = async (userId) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setSuccess("User berhasil dihapus");
        setTimeout(() => setSuccess(""), 3000);
        setDeleteConfirm(null);
        setSelectedUser(null);
        setLoading(true);
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-navy font-extrabold text-xl md:text-2xl flex items-center gap-2">
            <Users size={24} /> Manajemen User
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {users.length} user terdaftar via OAuth
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchUsers(); }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 self-start"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Success */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-green-600" />
          <p className="text-green-700 text-sm font-medium">{success}</p>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau email..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10"
            />
          </div>
          <button type="submit" className="px-4 py-2.5 bg-navy text-white rounded-xl text-sm font-semibold hover:opacity-90 shrink-0">Cari</button>
        </form>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-navy animate-spin"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="text-gray-200 mx-auto mb-3" size={40} />
            <p className="text-gray-400 text-sm">Belum ada user terdaftar</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {users.map((user) => {
              const isExpanded = selectedUser?.id === user.id;
              return (
                <div key={user.id}>
                  <button
                    onClick={() => handleSelectUser(user)}
                    className="w-full text-left px-4 md:px-5 py-3 md:py-4 flex items-center gap-3 md:gap-4 hover:bg-gray-50 transition-colors"
                  >
                    {user.image ? (
                      <img
                        src={user.image}
                        alt={user.name}
                        className="w-10 h-10 rounded-full border border-gray-200 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <Users size={16} className="text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-gray-800 truncate">{user.name || "—"}</p>
                        {user.provider && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize ${providerBadge[user.provider] || "bg-gray-100 text-gray-600"}`}>
                            {user.provider}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Mail size={11} className="text-gray-400" />
                        <span className="text-[11px] text-gray-400 truncate">{user.email}</span>
                        <span className="text-gray-300 hidden md:inline">•</span>
                        <Calendar size={11} className="text-gray-400 hidden md:inline" />
                        <span className="text-[11px] text-gray-400 hidden md:inline">{formatDate(user.createdAt)}</span>
                      </div>
                    </div>
                    <ChevronRight
                      size={16}
                      className={`text-gray-300 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    />
                  </button>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="px-4 md:px-5 pb-4 border-t border-gray-50 animate-slide-down">
                      <div className="pt-3 space-y-3">
                        {/* User Info */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500 text-xs">ID</span>
                            <p className="font-mono text-xs text-gray-800">{user.id}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">Provider</span>
                            <p className="font-medium text-gray-800 capitalize">{user.provider || "—"}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">HP</span>
                            <p className="font-medium text-gray-800">{user.phone || "—"}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">Terdaftar</span>
                            <p className="font-medium text-gray-800">{formatDate(user.createdAt)}</p>
                          </div>
                        </div>

                        {/* User Orders */}
                        <div className="border-t border-gray-100 pt-3">
                          <h4 className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                            <ShoppingBag size={12} /> Pesanan ({userOrders.length})
                          </h4>
                          {loadingOrders ? (
                            <div className="flex justify-center py-4">
                              <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-navy animate-spin"></div>
                            </div>
                          ) : userOrders.length === 0 ? (
                            <p className="text-gray-400 text-xs text-center py-4">Belum ada pesanan</p>
                          ) : (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                              {userOrders.map((order) => (
                                <div key={order.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                                  <div>
                                    <p className="font-medium text-gray-800">{order.productName}</p>
                                    <p className="text-gray-400">{order.id}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-navy">{formatRupiah(order.productPrice)}</p>
                                    <p className="text-gray-400 capitalize">{order.status}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => setDeleteConfirm(user.id)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-100 transition-all"
                          >
                            <Trash2 size={12} /> Hapus User
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <AlertCircle size={32} className="text-red-500 mx-auto mb-3" />
            <h3 className="font-bold text-navy text-base text-center mb-2">Hapus User?</h3>
            <p className="text-gray-400 text-sm text-center mb-5">
              User akan dihapus permanen. Pesanan miliknya tetap tersimpan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
