"use client";

import { useState, useEffect } from "react";
import {
  Settings, Save, CheckCircle2, AlertCircle, Shield, MessageCircle,
  CreditCard, ToggleLeft, ToggleRight, Users, HelpCircle, Wallet, Landmark, QrCode,
} from "lucide-react";

export default function AdminPengaturanPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [midtrans, setMidtrans] = useState({ serverKey: "", clientKey: "", isProduction: false, isActive: true });
  const [pakasir, setPakasir] = useState({ serverKey: "", clientKey: "", apiUrl: "https://app.pakasir.com", isProduction: false, isActive: false });
  const [doku, setDoku] = useState({ serverKey: "", clientKey: "", isProduction: false, isActive: false });
  const [duitku, setDuitku] = useState({ serverKey: "", clientKey: "", isProduction: false, isActive: false });
  const [waha, setWaha] = useState({ apiUrl: "", serverKey: "", clientKey: "", sessionName: "", isActive: true });

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.success) {
        const mt = data.data.find((s) => s.providerName === "midtrans");
        const pk = data.data.find((s) => s.providerName === "pakasir");
        const dk = data.data.find((s) => s.providerName === "doku");
        const du = data.data.find((s) => s.providerName === "duitku");
        const wa = data.data.find((s) => s.providerName === "waha");
        if (mt) setMidtrans({ serverKey: mt.serverKey || "", clientKey: mt.clientKey || "", isProduction: mt.isProduction || false, isActive: mt.isActive ?? true });
        if (pk) setPakasir({ serverKey: pk.serverKey || "", clientKey: pk.clientKey || "", apiUrl: pk.apiUrl || "https://app.pakasir.com", isProduction: pk.isProduction || false, isActive: pk.isActive ?? false });
        if (dk) setDoku({ serverKey: dk.serverKey || "", clientKey: dk.clientKey || "", isProduction: dk.isProduction || false, isActive: dk.isActive ?? false });
        if (du) setDuitku({ serverKey: du.serverKey || "", clientKey: du.clientKey || "", isProduction: du.isProduction || false, isActive: du.isActive ?? false });
        if (wa) setWaha({ apiUrl: wa.apiUrl || "", serverKey: wa.serverKey || "", clientKey: wa.clientKey || "", sessionName: wa.sessionName || "", isActive: wa.isActive ?? true });
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSettings(); }, []);

  // Only one payment gateway can be active at a time
  const activateGateway = (name) => {
    setMidtrans(prev => ({ ...prev, isActive: name === "midtrans" }));
    setPakasir(prev => ({ ...prev, isActive: name === "pakasir" }));
    setDoku(prev => ({ ...prev, isActive: name === "doku" }));
    setDuitku(prev => ({ ...prev, isActive: name === "duitku" }));
  };

  const activeGw = midtrans.isActive
    ? "midtrans"
    : pakasir.isActive
      ? "pakasir"
      : doku.isActive
        ? "doku"
        : duitku.isActive
          ? "duitku"
          : "midtrans";
  const activeGwLabel = activeGw === "midtrans"
    ? "Midtrans"
    : activeGw === "pakasir"
      ? "Pakasir"
      : activeGw === "doku"
        ? "DOKU"
        : "Duitku POP";

  const handleSave = async (providerName, data) => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerName, ...data }),
      });
      const result = await res.json();
      if (result.success) { setSuccess(result.message); setTimeout(() => setSuccess(""), 3000); }
      else setError(result.error || "Gagal menyimpan");
    } catch { setError("Terjadi kesalahan"); }
    finally { setSaving(false); }
  };

  const handleSavePaymentGateway = async (providerName, data) => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerName, ...data }),
      });
      const result = await res.json();
      if (result.success) { setSuccess(result.message || `${providerName} berhasil disimpan`); setTimeout(() => setSuccess(""), 3000); }
      else setError(result.error || "Gagal menyimpan");
    } catch { setError("Terjadi kesalahan"); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-navy animate-spin"></div>
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-navy font-extrabold text-xl md:text-2xl flex items-center gap-2">
          <Settings size={24} /> Pengaturan
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Konfigurasi payment gateway dan notifikasi</p>
      </div>

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

      {/* Active Gateway Banner */}
      <div className="mb-4 bg-gradient-to-r from-navy to-navy/80 rounded-2xl p-4 text-white">
        <p className="text-white/60 text-[11px] font-medium mb-1">PAYMENT GATEWAY AKTIF</p>
        <p className="text-lg font-extrabold">{activeGwLabel}</p>
        <p className="text-white/50 text-xs mt-0.5">Pelanggan akan otomatis diarahkan ke gateway ini saat checkout. Hanya 1 gateway yang bisa aktif.</p>
      </div>

      <div className="space-y-4">
        {/* ===== MIDTRANS ===== */}
        <GatewayCard
          icon={<CreditCard size={20} className="text-blue-600" />}
          iconBg="bg-blue-50"
          title="Midtrans Payment Gateway"
          subtitle="Konfigurasi API key untuk pembayaran"
          isActive={midtrans.isActive}
          onToggle={() => activateGateway("midtrans")}
        >
          <InputField label="Server Key" value={midtrans.serverKey} onChange={v => setMidtrans({...midtrans, serverKey: v})} placeholder="Mid-server-xxxxx" mono />
          <InputField label="Client Key" value={midtrans.clientKey} onChange={v => setMidtrans({...midtrans, clientKey: v})} placeholder="Mid-client-xxxxx" mono />
          <ProductionToggle checked={midtrans.isProduction} onChange={v => setMidtrans({...midtrans, isProduction: v})} />
          <SaveButton label="Simpan Midtrans" saving={saving} onClick={() => handleSavePaymentGateway("midtrans", midtrans)} />
        </GatewayCard>

        {/* ===== PAKASIR ===== */}
        <GatewayCard
          icon={<Wallet size={20} className="text-purple-600" />}
          iconBg="bg-purple-50"
          title="Pakasir Payment Gateway"
          subtitle={<>Konfigurasi API untuk pembayaran via <a href="https://pakasir.com" target="_blank" rel="noopener" className="text-purple-500 underline">pakasir.com</a></>}
          isActive={pakasir.isActive}
          onToggle={() => activateGateway("pakasir")}
        >
          <InputField label="API Key" value={pakasir.serverKey} onChange={v => setPakasir({...pakasir, serverKey: v})} placeholder="pakasir-api-key-xxxxx" mono hint="API Key dari dashboard Pakasir." />
          <InputField label="Project Slug" value={pakasir.clientKey} onChange={v => setPakasir({...pakasir, clientKey: v})} placeholder="nama-proyek-slug" mono hint="Slug proyek Pakasir." />
          <InputField label="API URL" value={pakasir.apiUrl} onChange={v => setPakasir({...pakasir, apiUrl: v})} placeholder="https://app.pakasir.com" mono />
          <ProductionToggle checked={pakasir.isProduction} onChange={v => setPakasir({...pakasir, isProduction: v})} />
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
            <p className="text-[11px] font-semibold text-purple-700 mb-1">📌 Webhook URL (atur di dashboard Pakasir)</p>
            <code className="text-[11px] text-purple-600 bg-white px-2 py-1 rounded block break-all">
              {typeof window !== "undefined" ? window.location.origin : "https://telko.store"}/api/webhook/pakasir
            </code>
          </div>
          <SaveButton label="Simpan Pakasir" saving={saving} onClick={() => handleSavePaymentGateway("pakasir", { serverKey: pakasir.serverKey, clientKey: pakasir.clientKey, apiUrl: pakasir.apiUrl, isProduction: pakasir.isProduction, isActive: pakasir.isActive })} />
        </GatewayCard>

        {/* ===== DOKU ===== */}
        <GatewayCard
          icon={<Landmark size={20} className="text-orange-600" />}
          iconBg="bg-orange-50"
          title="DOKU Payment Gateway"
          subtitle={<>Konfigurasi API untuk pembayaran via <a href="https://www.doku.com" target="_blank" rel="noopener" className="text-orange-500 underline">doku.com</a></>}
          isActive={doku.isActive}
          onToggle={() => activateGateway("doku")}
        >
          <InputField label="Client ID" value={doku.clientKey} onChange={v => setDoku({...doku, clientKey: v})} placeholder="MCH-XXXX-XXXXXXXXXXXX" mono hint="Client ID dari DOKU Back Office." />
          <InputField label="Secret Key" value={doku.serverKey} onChange={v => setDoku({...doku, serverKey: v})} placeholder="SK-XXXXXXXXXXXXXXXX" mono hint="Secret Key dari DOKU Back Office." />
          <ProductionToggle checked={doku.isProduction} onChange={v => setDoku({...doku, isProduction: v})} />
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
            <p className="text-[11px] font-semibold text-orange-700 mb-1">📌 Notification URL (atur di DOKU Back Office)</p>
            <code className="text-[11px] text-orange-600 bg-white px-2 py-1 rounded block break-all">
              {typeof window !== "undefined" ? window.location.origin : "https://telko.store"}/api/webhook/doku
            </code>
          </div>
          <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-3">
            <p className="text-[11px] text-orange-700 leading-relaxed">
              💡 DOKU menggunakan <strong>HMAC-SHA256</strong> signature untuk keamanan. Pastikan Client ID dan Secret Key sesuai dengan yang ada di DOKU Back Office.
              Sandbox: <code className="text-navy bg-navy/5 px-1 rounded">api-sandbox.doku.com</code> | Production: <code className="text-navy bg-navy/5 px-1 rounded">api.doku.com</code>
            </p>
          </div>
          <SaveButton label="Simpan DOKU" saving={saving} onClick={() => handleSavePaymentGateway("doku", { serverKey: doku.serverKey, clientKey: doku.clientKey, isProduction: doku.isProduction, isActive: doku.isActive })} />
        </GatewayCard>

        {/* ===== DUITKU ===== */}
        <GatewayCard
          icon={<QrCode size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-50"
          title="Duitku POP"
          subtitle={<>Konfigurasi payment gateway POP via <a href="https://docs.duitku.com/pop/id/" target="_blank" rel="noopener" className="text-emerald-600 underline">docs.duitku.com</a></>}
          isActive={duitku.isActive}
          onToggle={() => activateGateway("duitku")}
        >
          <InputField label="Merchant Code" value={duitku.clientKey} onChange={v => setDuitku({...duitku, clientKey: v})} placeholder="DXXXX" mono hint="Merchant Code dari project Duitku." />
          <InputField label="API Key" value={duitku.serverKey} onChange={v => setDuitku({...duitku, serverKey: v})} placeholder="duitku-api-key" mono hint="API Key untuk header signature Create Invoice." />
          <ProductionToggle checked={duitku.isProduction} onChange={v => setDuitku({...duitku, isProduction: v})} />
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
            <p className="text-[11px] font-semibold text-emerald-700 mb-1">Callback URL (atur di dashboard Duitku)</p>
            <code className="text-[11px] text-emerald-700 bg-white px-2 py-1 rounded block break-all">
              {typeof window !== "undefined" ? window.location.origin : "https://telko.store"}/api/webhook/duitku
            </code>
          </div>
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3">
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Duitku POP memakai callback server-to-server sebagai source of truth. Signature callback diverifikasi dengan formula MD5 dan redirect pelanggan hanya dipakai untuk landing UX.
            </p>
          </div>
          <SaveButton label="Simpan Duitku POP" saving={saving} onClick={() => handleSavePaymentGateway("duitku", { serverKey: duitku.serverKey, clientKey: duitku.clientKey, isProduction: duitku.isProduction, isActive: duitku.isActive })} />
        </GatewayCard>

        {/* ===== WAHA ===== */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <MessageCircle size={20} className="text-green-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-sm text-navy">WAHA WhatsApp API</h2>
              <p className="text-[11px] text-gray-400">Konfigurasi API untuk notifikasi WhatsApp</p>
            </div>
            <button onClick={() => setWaha({...waha, isActive: !waha.isActive})}
              className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${waha.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {waha.isActive ? <><ToggleRight size={14} /> Aktif</> : <><ToggleLeft size={14} /> Nonaktif</>}
            </button>
          </div>
          <div className="p-5 space-y-4">
            <InputField label="API URL" value={waha.apiUrl} onChange={v => setWaha({...waha, apiUrl: v})} placeholder="http://localhost:3002" mono />
            <InputField label="API Key (opsional)" value={waha.serverKey} onChange={v => setWaha({...waha, serverKey: v})} placeholder="waha-api-key" mono />
            <InputField label="Session Name" value={waha.sessionName} onChange={v => setWaha({...waha, sessionName: v})} placeholder="default" mono hint={<>Nama session WAHA. Default: <code className="text-navy bg-navy/5 px-1 rounded">default</code></>} />
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Users size={14} className="text-green-600" />
                <label className="text-xs font-semibold text-gray-600">WhatsApp Group ID (Notifikasi Internal)</label>
              </div>
              <input type="text" value={waha.clientKey} onChange={(e) => setWaha({...waha, clientKey: e.target.value})}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy font-mono" placeholder="120363xxxxxxxxxxxx@g.us" />
              <div className="flex items-start gap-1.5 mt-1.5">
                <HelpCircle size={11} className="text-gray-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-gray-400">Group ID untuk menerima notifikasi pesanan baru, pembayaran, dan pesan pelanggan.</p>
              </div>
            </div>
            <SaveButton label="Simpan WAHA" saving={saving} onClick={() => handleSave("waha", { apiUrl: waha.apiUrl, serverKey: waha.serverKey, clientKey: waha.clientKey, sessionName: waha.sessionName, isActive: waha.isActive })} />
          </div>
        </div>

        {/* Env Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <Shield size={18} className="text-navy" />
            <h2 className="font-bold text-sm text-navy">Info Lingkungan</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Environment</span><span className="font-medium text-gray-800">{process.env.NODE_ENV || "development"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Database</span><span className="font-medium text-gray-800">MySQL (InnoDB)</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Framework</span><span className="font-medium text-gray-800">Next.js 15</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Payment Gateways</span><span className="font-medium text-gray-800">Midtrans + Pakasir + DOKU + Duitku POP</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Gateway Aktif</span><span className="font-bold text-green-600">{activeGwLabel}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Reusable Components =====

function GatewayCard({ icon, iconBg, title, subtitle, isActive, onToggle, children }) {
  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all ${isActive ? "border-green-200 ring-2 ring-green-100" : "border-gray-100"}`}>
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>{icon}</div>
        <div className="flex-1">
          <h2 className="font-bold text-sm text-navy flex items-center gap-2">
            {title}
            {isActive && <span className="text-[9px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">AKTIF</span>}
          </h2>
          <p className="text-[11px] text-gray-400">{subtitle}</p>
        </div>
        <button onClick={onToggle}
          className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {isActive ? <><ToggleRight size={14} /> Aktif</> : <><ToggleLeft size={14} /> Nonaktif</>}
        </button>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, mono, hint }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 mb-1 block">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy ${mono ? "font-mono" : ""}`}
        placeholder={placeholder} />
      {hint && (
        <div className="flex items-start gap-1.5 mt-1.5">
          <HelpCircle size={11} className="text-gray-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-gray-400">{hint}</p>
        </div>
      )}
    </div>
  );
}

function ProductionToggle({ checked, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded" />
        <span className="text-gray-600 font-medium">Mode Production</span>
      </label>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${checked ? "bg-red-50 text-red-600" : "bg-yellow-50 text-yellow-700"}`}>
        {checked ? "🔴 PRODUCTION" : "🟡 SANDBOX"}
      </span>
    </div>
  );
}

function SaveButton({ label, saving, onClick }) {
  return (
    <button onClick={onClick} disabled={saving}
      className="gradient-navy text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-95 disabled:opacity-50 flex items-center gap-2">
      <Save size={14} /> {label}
    </button>
  );
}
