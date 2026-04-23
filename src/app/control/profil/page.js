import {
  KeyRound,
  LockKeyhole,
  Shield,
  UserRound,
  RefreshCw,
} from "lucide-react";

const envRows = [
  {
    name: "ADMIN_LOGIN_USER",
    desc: "Username utama untuk masuk ke /control/login.",
  },
  {
    name: "ADMIN_LOGIN_EMAIL",
    desc: "Opsional. Email admin yang juga boleh dipakai untuk login kredensial.",
  },
  {
    name: "ADMIN_LOGIN_PASSWORD",
    desc: "Password khusus control panel. Jika kosong, sistem fallback ke ADMIN_SECRET.",
  },
  {
    name: "ADMIN_SECRET",
    desc: "Secret internal untuk menandatangani cookie admin_token. Buat acak dan panjang.",
  },
];

export default function ControlProfilPage() {
  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="text-navy font-extrabold text-xl md:text-2xl flex items-center gap-2">
          <Shield size={24} /> Keamanan Control
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">
          Pengaturan akses admin kini dipisahkan dari login user biasa.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl gradient-navy flex items-center justify-center shrink-0">
            <LockKeyhole size={22} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-navy text-base">Akses Panel Admin</h2>
            <p className="text-gray-500 text-sm mt-1 leading-relaxed">
              Panel admin sekarang diakses lewat{" "}
              <span className="font-mono text-navy">/control</span>. User biasa
              yang hanya login ke akun toko tetap tidak akan lolos tanpa sesi
              admin yang valid.
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <UserRound size={18} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-navy text-sm">Login Kredensial</h3>
              <p className="text-gray-400 text-xs">Khusus control panel</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Gunakan username atau email admin, lalu password khusus admin di{" "}
            <span className="font-mono text-navy">/control/login</span>.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <KeyRound size={18} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-navy text-sm">Login OAuth Admin</h3>
              <p className="text-gray-400 text-xs">Google dan Facebook</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Google atau Facebook tetap bisa dipakai, tetapi hanya untuk email
            yang memiliki role <span className="font-semibold">admin</span> di
            tabel user.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <RefreshCw size={18} className="text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-navy text-sm">
              Update dari `.env.local`
            </h3>
            <p className="text-gray-400 text-xs">
              Ubah di server lalu deploy ulang
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {envRows.map((row) => (
            <div
              key={row.name}
              className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
            >
              <p className="font-mono text-xs font-bold text-navy">{row.name}</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                {row.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
