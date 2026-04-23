"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  UserRound,
} from "lucide-react";

function OAuthButton({ provider, loadingProvider, onClick, children }) {
  const isLoading = loadingProvider === provider;

  return (
    <button
      type="button"
      onClick={() => onClick(provider)}
      disabled={Boolean(loadingProvider)}
      className="w-full flex items-center justify-center gap-2.5 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-60"
    >
      {isLoading ? (
        <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
      ) : (
        children
      )}
    </button>
  );
}

export default function ControlLoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState("");
  const [authorizingOAuth, setAuthorizingOAuth] = useState(false);
  const oauthAuthorizationStarted = useRef(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "admin") {
      if (!oauthAuthorizationStarted.current) {
        oauthAuthorizationStarted.current = true;

        void (async () => {
          setAuthorizingOAuth(true);
          setError("");

          try {
            const res = await fetch("/api/admin/auth/oauth", { method: "POST" });
            const data = await res.json();

            if (data.success) {
              router.replace("/control");
              router.refresh();
              return;
            }

            setError(data.error || "Gagal menyambungkan akses control.");
            oauthAuthorizationStarted.current = false;
          } catch {
            setError("Gagal menyambungkan akses control.");
            oauthAuthorizationStarted.current = false;
          } finally {
            setAuthorizingOAuth(false);
            setLoadingProvider("");
          }
        })();
      }

      return;
    }

    if (status === "authenticated" && session?.user?.role !== "admin") {
      setLoadingProvider("");
      setAuthorizingOAuth(false);
      setError("Akun ini sudah login, tetapi belum memiliki role admin.");
    }

    if (status === "unauthenticated") {
      oauthAuthorizationStarted.current = false;
    }
  }, [router, session?.user?.role, status]);

  const handleCredentialLogin = async (event) => {
    event.preventDefault();

    if (!identifier.trim() || !password.trim()) {
      setError("Masukkan username/email admin dan password.");
      return;
    }

    setLoadingCredentials(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (data.success) {
        router.push("/control");
        router.refresh();
        return;
      }

      setError(data.error || "Login admin gagal");
    } catch {
      setError("Terjadi kesalahan server");
    } finally {
      setLoadingCredentials(false);
    }
  };

  const handleOAuthLogin = async (provider) => {
    setError("");
    setLoadingProvider(provider);
    oauthAuthorizationStarted.current = false;

    try {
      await signIn(provider, { callbackUrl: "/control/login" });
    } catch {
      setError("Login OAuth gagal. Coba lagi.");
      setLoadingProvider("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl gradient-navy flex items-center justify-center text-white text-2xl font-extrabold mx-auto mb-4 shadow-lg">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-navy font-extrabold text-2xl">Control Panel</h1>
          <p className="text-gray-400 text-sm mt-1">
            Telko<span className="text-tred">.Store</span> akses admin
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <form onSubmit={handleCredentialLogin}>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Username / Email Admin
                </label>
                <div className="relative">
                  <UserRound
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="admin atau admin@domain.com"
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition-all"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Password Admin
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Masukkan password admin..."
                    className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label="Tampilkan password"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                  Gunakan nilai password admin yang tersimpan di server, bukan
                  nama variabel <span className="font-mono">ADMIN_LOGIN_PASSWORD</span>.
                </p>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                  Untuk admin yang dibuat manual dari halaman user, password
                  default-nya adalah{" "}
                  <span className="font-mono">telko.store@2026</span>.
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                <AlertCircle size={14} className="text-red-600 shrink-0" />
                <p className="text-red-600 text-xs">{error}</p>
              </div>
            )}

            {authorizingOAuth && (
              <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-blue-200 border-t-blue-700 animate-spin shrink-0" />
                <p className="text-blue-900 text-xs">
                  Memverifikasi akses control dari akun Google/Facebook...
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={
                loadingCredentials ||
                Boolean(loadingProvider) ||
                authorizingOAuth
              }
              className="w-full mt-4 gradient-navy text-white font-bold py-3 rounded-xl text-sm hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingCredentials ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <ShieldCheck size={16} /> Masuk ke Control
                </>
              )}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
              atau
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="space-y-3">
            <OAuthButton
              provider="google"
              loadingProvider={loadingProvider}
              onClick={handleOAuthLogin}
            >
              <>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Masuk dengan Google
              </>
            </OAuthButton>

            <OAuthButton
              provider="facebook"
              loadingProvider={loadingProvider}
              onClick={handleOAuthLogin}
            >
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Masuk dengan Facebook
              </>
            </OAuthButton>
          </div>

          <div className="mt-4 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
            <p className="text-[11px] leading-relaxed text-blue-900">
              Login Google/Facebook hanya bisa masuk ke control panel jika email
              tersebut punya role <span className="font-bold">admin</span> di
              tabel user.
            </p>
            <p className="text-[11px] leading-relaxed text-blue-900 mt-2">
              Admin yang dibuat dari halaman user juga bisa login dengan email
              adminnya sendiri memakai password admin global yang sama.
            </p>
          </div>
        </div>

        <p className="text-center text-gray-400 text-[10px] mt-6 leading-relaxed">
          Atur kredensial admin khusus di{" "}
          <span className="font-mono text-gray-500">
            ADMIN_LOGIN_USER
          </span>{" "}
          dan{" "}
          <span className="font-mono text-gray-500">
            ADMIN_LOGIN_PASSWORD
          </span>{" "}
          pada <span className="font-mono text-gray-500">.env.local</span>.
        </p>
      </div>
    </div>
  );
}
