"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Shield,
  MessageCircle,
  CreditCard,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

export default function AdminPengaturanPage() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Form states for each provider
  const [midtrans, setMidtrans] = useState({
    serverKey: "", clientKey: "", isProduction: false, isActive: true,
  });
  const [waha, setWaha] = useState({
    apiUrl: "", serverKey: "", isActive: true,
  });

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
        // Populate forms
        const mtSetting = data.data.find((s) => s.providerName === "midtrans");
        const wahaSetting = data.data.find((s) => s.providerName === "waha");
        if (mtSetting) {
          setMidtrans({
            serverKey: mtSetting.serverKey || "",
            clientKey: mtSetting.clientKey || "",
            isProduction: mtSetting.isProduction || false,
            isActive: mtSetting.isActive ?? true,
          });
        }
        if (wahaSetting) {
          setWaha({
            apiUrl: wahaSetting.apiUrl || "",
            serverKey: wahaSetting.serverKey || "",
            isActive: wahaSetting.isActive ?? true,
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async (providerName, data) => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerName, ...data }),
      });
      const result = await res.json();
      if (result.success) {
        setSuccess(result.message);
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(result.error || "Gagal menyimpan");
      }
    } catch (err) {
      setError("Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-navy animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-navy font-extrabold text-xl md:text-2xl flex items-center gap-2">
          <Settings size={24} /> Pengaturan
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">
          Konfigurasi payment gateway dan notifikasi
        </p>
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

      <div className="space-y-4">
        {/* Midtrans Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <CreditCard size={20} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-sm text-navy">Midtrans Payment Gateway</h2>
              <p className="text-[11px] text-gray-400">Konfigurasi API key untuk pembayaran</p>
            </div>
            <button
              onClick={() => setMidtrans({...midtrans, isActive: !midtrans.isActive})}
              className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                midtrans.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {midtrans.isActive ? <><ToggleRight size={14} /> Aktif</> : <><ToggleLeft size={14} /> Nonaktif</>}
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Server Key</label>
              <input
                type="text" value={midtrans.serverKey}
                onChange={(e) => setMidtrans({...midtrans, serverKey: e.target.value})}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy font-mono"
                placeholder="Mid-server-xxxxx"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Client Key</label>
              <input
                type="text" value={midtrans.clientKey}
                onChange={(e) => setMidtrans({...midtrans, clientKey: e.target.value})}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy font-mono"
                placeholder="Mid-client-xxxxx"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox" checked={midtrans.isProduction}
                  onChange={(e) => setMidtrans({...midtrans, isProduction: e.target.checked})}
                  className="rounded"
                />
                <span className="text-gray-600 font-medium">Mode Production</span>
              </label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                midtrans.isProduction ? "bg-red-50 text-red-600" : "bg-yellow-50 text-yellow-700"
              }`}>
                {midtrans.isProduction ? "🔴 PRODUCTION" : "🟡 SANDBOX"}
              </span>
            </div>
            <button
              onClick={() => handleSave("midtrans", midtrans)}
              disabled={saving}
              className="gradient-navy text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-95 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={14} /> Simpan Midtrans
            </button>
          </div>
        </div>

        {/* WAHA Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <MessageCircle size={20} className="text-green-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-sm text-navy">WAHA WhatsApp API</h2>
              <p className="text-[11px] text-gray-400">Konfigurasi API untuk notifikasi WhatsApp</p>
            </div>
            <button
              onClick={() => setWaha({...waha, isActive: !waha.isActive})}
              className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                waha.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {waha.isActive ? <><ToggleRight size={14} /> Aktif</> : <><ToggleLeft size={14} /> Nonaktif</>}
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">API URL</label>
              <input
                type="text" value={waha.apiUrl}
                onChange={(e) => setWaha({...waha, apiUrl: e.target.value})}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy font-mono"
                placeholder="http://localhost:3002"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">API Key (opsional)</label>
              <input
                type="text" value={waha.serverKey}
                onChange={(e) => setWaha({...waha, serverKey: e.target.value})}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy font-mono"
                placeholder="waha-api-key"
              />
            </div>
            <button
              onClick={() => handleSave("waha", { apiUrl: waha.apiUrl, serverKey: waha.serverKey, isActive: waha.isActive })}
              disabled={saving}
              className="gradient-navy text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-95 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={14} /> Simpan WAHA
            </button>
          </div>
        </div>

        {/* Env Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <Shield size={18} className="text-navy" />
            <h2 className="font-bold text-sm text-navy">Info Lingkungan</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Environment</span>
              <span className="font-medium text-gray-800">{process.env.NODE_ENV || "development"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Database</span>
              <span className="font-medium text-gray-800">SQLite (WAL mode)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Framework</span>
              <span className="font-medium text-gray-800">Next.js 15</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
