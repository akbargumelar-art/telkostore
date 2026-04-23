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
  ShieldCheck,
  UserCog,
  UserPlus,
  X,
  Phone,
  Clock,
  Package,
  Eye,
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
  manual: "bg-emerald-50 text-emerald-700",
};

const statusConfig = {
  pending: { bg: "bg-yellow-50", text: "text-yellow-700", icon: Clock, label: "Menunggu" },
  paid: { bg: "bg-blue-50", text: "text-blue-700", icon: CheckCircle2, label: "Dibayar" },
  processing: { bg: "bg-orange-50", text: "text-orange-700", icon: Package, label: "Proses" },
  completed: { bg: "bg-green-50", text: "text-green-700", icon: CheckCircle2, label: "Selesai" },
  failed: { bg: "bg-red-50", text: "text-red-700", icon: AlertCircle, label: "Gagal" },
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingRole, setTogglingRole] = useState(null);
  const [updatingOrder, setUpdatingOrder] = useState(null);

  // Create user modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", phone: "", role: "admin" });

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); };
  const showError = (msg) => { setError(msg); setTimeout(() => setError(""), 4000); };

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
    if (selectedUser?.id === user.id) { setSelectedUser(null); return; }
    setSelectedUser(user);
    setLoadingOrders(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`);
      const data = await res.json();
      if (data.success) setUserOrders(data.data.orders || []);
    } catch (err) { console.error(err); }
    finally { setLoadingOrders(false); }
  };

  const handleDelete = async (userId) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showSuccess("User berhasil dihapus");
        setDeleteConfirm(null);
        setSelectedUser(null);
        setLoading(true);
        fetchUsers();
      }
    } catch (err) { console.error(err); }
    finally { setDeleting(false); }
  };

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    setTogglingRole(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(`Role diubah menjadi ${newRole}`);
        setLoading(true);
        fetchUsers();
      }
    } catch (err) { console.error(err); }
    finally { setTogglingRole(null); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(data.message);
        setShowCreateModal(false);
        setNewUser({ name: "", email: "", phone: "", role: "admin" });
        setLoading(true);
        fetchUsers();
      } else {
        showError(data.error || "Gagal membuat user");
      }
    } catch (err) { showError("Terjadi kesalahan"); }
    finally { setCreating(false); }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    setUpdatingOrder(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(`Pesanan ${orderId} → ${newStatus}`);
        if (selectedUser) {
          const r = await fetch(`/api/admin/users/${selectedUser.id}`);
          const d = await r.json();
          if (d.success) setUserOrders(d.data.orders || []);
        }
      }
    } catch (err) { console.error(err); }
    finally { setUpdatingOrder(null); }
  };

  const filteredUsers = filterRole === "all" ? users : users.filter((u) => (u.role || "user") === filterRole);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-navy font-extrabold text-xl md:text-2xl flex items-center gap-2">
            <Users size={24} /> Manajemen User
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {filteredUsers.length} user terdaftar{filterRole !== "all" ? ` (${filterRole})` : ""}
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-navy text-white text-sm font-bold hover:opacity-90 shadow-md transition-all"
          >
            <UserPlus size={14} /> Tambah Admin
          </button>
          <button
            onClick={() => { setLoading(true); fetchUsers(); }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={14} className="text-green-600" />
          <p className="text-green-700 text-sm font-medium">{success}</p>
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 animate-fade-in">
          <AlertCircle size={14} className="text-red-600" />
          <p className="text-red-600 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
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
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy bg-white">
          <option value="all">Semua Role</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-navy animate-spin"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="text-gray-200 mx-auto mb-3" size={40} />
            <p className="text-gray-400 text-sm">Belum ada user terdaftar</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredUsers.map((user) => {
              const isExpanded = selectedUser?.id === user.id;
              const userRole = user.role || "user";
              return (
                <div key={user.id}>
                  <button
                    onClick={() => handleSelectUser(user)}
                    className="w-full text-left px-4 md:px-5 py-3 md:py-4 flex items-center gap-3 md:gap-4 hover:bg-gray-50 transition-colors"
                  >
                    {user.image ? (
                      <img src={user.image} alt={user.name} className="w-10 h-10 rounded-full border border-gray-200 shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${userRole === "admin" ? "bg-purple-100" : "bg-gray-100"}`}>
                        {userRole === "admin" ? <ShieldCheck size={16} className="text-purple-600" /> : <Users size={16} className="text-gray-400" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-gray-800 truncate">{user.name || "—"}</p>
                        {userRole === "admin" && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 flex items-center gap-0.5">
                            <ShieldCheck size={8} /> Admin
                          </span>
                        )}
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
                    <ChevronRight size={16} className={`text-gray-300 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
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

                        {/* User Orders with Action */}
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
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                              {userOrders.map((order) => {
                                const sc = statusConfig[order.status] || statusConfig.pending;
                                const StatusIcon = sc.icon;
                                const isUpdating = updatingOrder === order.id;
                                return (
                                  <div key={order.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-xs text-gray-800 truncate">{order.productName}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className="text-[10px] text-gray-400 font-mono">{order.id}</span>
                                          <span className="text-gray-300">•</span>
                                          <span className="text-[10px] text-gray-400">{formatDate(order.createdAt)}</span>
                                        </div>
                                      </div>
                                      <div className="text-right shrink-0 ml-2">
                                        <p className="font-bold text-xs text-navy">{formatRupiah(order.productPrice)}</p>
                                        <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                                          <StatusIcon size={8} /> {sc.label}
                                        </span>
                                      </div>
                                    </div>
                                    {/* Order details */}
                                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                                      <div className="flex items-center gap-1 text-gray-500">
                                        <Phone size={9} /> {order.guestPhone}
                                      </div>
                                      <div className="flex items-center gap-1 text-gray-500">
                                        <Eye size={9} /> {order.targetData || "—"}
                                      </div>
                                    </div>
                                    {/* Status action buttons */}
                                    <div className="flex flex-wrap gap-1 pt-1 border-t border-gray-200/60">
                                      {["paid", "processing", "completed", "failed"].map((s) => {
                                        const cfg = statusConfig[s];
                                        const isCurrent = order.status === s;
                                        return (
                                          <button
                                            key={s}
                                            onClick={() => !isCurrent && handleUpdateOrderStatus(order.id, s)}
                                            disabled={isCurrent || isUpdating}
                                            className={`text-[9px] font-bold px-2 py-1 rounded-md transition-all ${
                                              isCurrent
                                                ? `${cfg.bg} ${cfg.text} ring-1 ring-current/30`
                                                : "bg-white text-gray-400 hover:bg-gray-100 border border-gray-200"
                                            } disabled:opacity-50`}
                                          >
                                            {isUpdating && !isCurrent ? "..." : cfg.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => handleToggleRole(user.id, userRole)}
                            disabled={togglingRole === user.id}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                              userRole === "admin"
                                ? "bg-purple-50 text-purple-700 hover:bg-purple-100"
                                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                            }`}
                          >
                            {togglingRole === user.id ? (
                              <div className="w-3 h-3 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                            ) : (
                              <UserCog size={12} />
                            )}
                            {userRole === "admin" ? "Set ke User" : "Set ke Admin"}
                          </button>
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

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl relative">
            <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl gradient-navy flex items-center justify-center">
                <UserPlus size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-navy text-base">Tambah User Baru</h3>
                <p className="text-gray-400 text-xs">Buat akun admin atau user manual</p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Nama Lengkap *</label>
                <input
                  type="text" required value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Nama lengkap"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Email *</label>
                <input
                  type="email" required value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="email@contoh.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">No. HP</label>
                <input
                  type="tel" value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Role</label>
                <div className="flex gap-2">
                  {[
                    { value: "admin", label: "Admin", icon: ShieldCheck, color: "purple" },
                    { value: "user", label: "User", icon: Users, color: "blue" },
                  ].map((opt) => (
                    <button
                      key={opt.value} type="button"
                      onClick={() => setNewUser({ ...newUser, role: opt.value })}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                        newUser.role === opt.value
                          ? opt.color === "purple"
                            ? "border-purple-400 bg-purple-50 text-purple-700"
                            : "border-blue-400 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      <opt.icon size={14} /> {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {newUser.role === "admin" && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-start gap-2">
                  <ShieldCheck size={14} className="text-purple-600 mt-0.5 shrink-0" />
                  <p className="text-purple-700 text-xs">
                    Admin dapat mengakses dashboard, melihat semua pesanan, dan mengubah status pesanan.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit" disabled={creating}
                  className="flex-1 py-2.5 gradient-navy text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div> Membuat...</>
                  ) : (
                    <><UserPlus size={14} /> Buat User</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
