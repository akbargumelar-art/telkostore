"use client";

import { useState, useEffect, use, useCallback, useRef } from "react";
import Link from "next/link";
import {
  VOUCHER_REGION_APPROVAL_TEXT,
  calculateDiscount,
  formatRupiah,
  getOperatorName,
  getVoucherInternetRequirement,
  isValidIndonesianNumber,
  validateVoucherInternetCheckout,
} from "@/lib/utils";
import ProductCard from "@/components/ProductCard";
import CategoryIcon from "@/components/CategoryIcon";
import { openDuitkuPopup } from "@/lib/duitku-client";
import {
  ChevronLeft,
  Check,
  Phone,
  ShieldCheck,
  Zap,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Lock,
  Gamepad2,
  User,
  Server,
  Globe,
} from "lucide-react";

const MOBILE_SCROLL_OFFSET = 88;
const MIN_PHONE_LENGTH = 10;
const AUTO_SCROLL_LENGTH = 12;

// Game ID field configuration per game
const GAME_ID_CONFIG = {
  "Mobile Legends": {
    fields: [
      { key: "userId", label: "User ID", placeholder: "Contoh: 123456789", type: "number", icon: User },
      { key: "serverId", label: "Server ID", placeholder: "Contoh: 8123", type: "number", icon: Server },
    ],
    hint: "Buka game → Profile → di bawah username tertera User ID dan Server ID (Zone ID).",
  },
  "Free Fire": {
    fields: [
      { key: "playerId", label: "Player ID", placeholder: "Contoh: 1234567890", type: "number", icon: User },
    ],
    hint: "Buka game → Profile → ID tertera di kanan atas nama kamu.",
  },
  "PUBG Mobile": {
    fields: [
      { key: "playerId", label: "Player ID", placeholder: "Contoh: 51234567890", type: "number", icon: User },
    ],
    hint: "Buka game → Setting → Basic → Character ID.",
  },
  "Genshin Impact": {
    fields: [
      { key: "uid", label: "UID", placeholder: "Contoh: 8123456789", type: "number", icon: User },
      {
        key: "server", label: "Server", type: "select", icon: Globe,
        options: [
          { value: "", label: "Pilih Server" },
          { value: "Asia", label: "Asia" },
          { value: "America", label: "America" },
          { value: "Europe", label: "Europe" },
          { value: "TW/HK/MO", label: "TW, HK, MO" },
        ],
      },
    ],
    hint: "Buka game → Paimon Menu → Settings → Account → UID tertera di kanan bawah.",
  },
};

// Default config for unknown games
const DEFAULT_GAME_CONFIG = {
  fields: [
    { key: "gameId", label: "Game ID", placeholder: "Masukkan ID akun game kamu", type: "text", icon: User },
  ],
  hint: "Masukkan ID akun game yang tertera di profil game kamu.",
};

export default function ProductPage({ params }) {
  const { id } = use(params);

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedVariant, setSelectedVariant] = useState(id);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gameIdData, setGameIdData] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [activeGatewayLabel, setActiveGatewayLabel] = useState("");
  const [voucherRegionApproved, setVoucherRegionApproved] = useState(false);

  // Refs for auto-scroll
  const phoneRef = useRef(null);
  const summaryRef = useRef(null);
  const phoneAutoScrolledRef = useRef(false);

  // Auto-scroll helper (only on mobile)
  const scrollToRef = useCallback((ref) => {
    if (ref.current && window.innerWidth < 768) {
      setTimeout(() => {
        const targetTop =
          ref.current.getBoundingClientRect().top +
          window.scrollY -
          MOBILE_SCROLL_OFFSET;
        window.scrollTo({
          top: Math.max(targetTop, 0),
          behavior: "smooth",
        });
      }, 200);
    }
  }, []);

  // Fetch product data from API
  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/${id}`);
        const data = await res.json();

        if (!data.success) {
          setError("Produk tidak ditemukan");
          setLoading(false);
          return;
        }

        setProduct(data.data);

        // Fetch related products
        const relRes = await fetch(`/api/products?category=${data.data.categoryId}`);
        const relData = await relRes.json();
        if (relData.success) {
          setRelatedProducts(relData.data.filter((p) => p.id !== id));
        }
      } catch (err) {
        setError("Gagal memuat produk");
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [id]);

  // Fetch active gateway label for display
  useEffect(() => {
    async function fetchGateway() {
      try {
        const res = await fetch("/api/gateway/status");
        if (res.ok) {
          const data = await res.json();
          setActiveGatewayLabel(data.label || "Midtrans");
        }
      } catch {
        setActiveGatewayLabel("Midtrans");
      }
    }
    fetchGateway();
  }, []);

  // 3-step checkout: Produk → No. HP / Game ID → Konfirmasi
  const steps = [
    { num: 1, label: "Produk" },
    { num: 2, label: product?.categoryId === "voucher-game" ? "Akun Game" : "No. HP" },
    { num: 3, label: "Konfirmasi" },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <div className="bg-white rounded-2xl p-5 mb-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl"></div>
                <div className="flex-1">
                  <div className="h-5 bg-gray-100 rounded w-1/3 mb-2"></div>
                  <div className="h-4 bg-gray-100 rounded w-2/3"></div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 animate-pulse">
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-xl"></div>
                ))}
              </div>
            </div>
          </div>
          <div className="md:w-[380px]">
            <div className="bg-white rounded-2xl p-5 animate-pulse">
              <div className="h-12 bg-gray-100 rounded-xl mb-4"></div>
              <div className="h-40 bg-gray-100 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-20 text-center">
        <div className="text-6xl mb-4">😕</div>
        <h1 className="text-xl font-bold text-navy mb-2">
          Produk tidak ditemukan
        </h1>
        <p className="text-gray-400 text-sm mb-6">
          Produk yang kamu cari tidak tersedia.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 gradient-red text-white px-6 py-2.5 rounded-xl font-semibold text-sm"
        >
          <ChevronLeft size={16} /> Kembali ke Beranda
        </Link>
      </div>
    );
  }

  // Find selected product from related + current
  const allVariants = [product, ...relatedProducts];
  const selectedProduct = allVariants.find((p) => p.id === selectedVariant) || product;

  // Determine if this is a game voucher product
  const isGameVoucher = selectedProduct.categoryId === "voucher-game";
  const isVoucherInternet = selectedProduct.categoryId === "voucher-internet";
  const gameConfig = isGameVoucher
    ? (GAME_ID_CONFIG[selectedProduct.gameName] || DEFAULT_GAME_CONFIG)
    : null;

  // Compute category info from product
  const categoryName = product.categoryId === "pulsa" ? "Pulsa"
    : product.categoryId === "paket-data" ? "Paket Data"
    : product.categoryId === "voucher-internet" ? "Voucher Internet"
    : product.categoryId === "voucher-game" ? "Voucher Game"
    : product.categoryId;

  const categoryIcon = product.categoryId === "pulsa" ? "📱"
    : product.categoryId === "paket-data" ? "📶"
    : product.categoryId === "voucher-internet" ? "🌐"
    : product.categoryId === "voucher-game" ? "🎮"
    : "📦";

  const discount = calculateDiscount(
    selectedProduct.originalPrice,
    selectedProduct.price
  );

  const phoneValid = isValidIndonesianNumber(phoneNumber);
  const phoneReadyForPayment =
    phoneNumber.length >= MIN_PHONE_LENGTH && phoneValid;
  const detectedOperator = phoneReadyForPayment
    ? getOperatorName(phoneNumber)
    : null;
  const voucherRequirement = getVoucherInternetRequirement(selectedProduct);
  const voucherValidation = validateVoucherInternetCheckout(
    selectedProduct,
    phoneNumber
  );
  const voucherValidationMessage =
    isVoucherInternet &&
    phoneNumber.length >= MIN_PHONE_LENGTH &&
    !voucherValidation.valid
      ? voucherValidation.message
      : "";
  const requiresVoucherRegionApproval =
    isVoucherInternet && voucherRequirement.requiresRegionApproval;
  const isCheckoutBlockedByVoucherRules =
    Boolean(voucherValidationMessage) ||
    (requiresVoucherRegionApproval && !voucherRegionApproved);

  // Check if game ID fields are all filled
  const isGameIdValid = () => {
    if (!isGameVoucher || !gameConfig) return true;
    return gameConfig.fields.every((field) => {
      const val = gameIdData[field.key];
      return val && val.toString().trim().length > 0;
    });
  };

  // Determine if step 2 is complete (ready for step 3)
  const isStep2Complete = isGameVoucher
    ? (isGameIdValid() && phoneReadyForPayment)
    : phoneReadyForPayment;
  const canCheckout = isStep2Complete && !isCheckoutBlockedByVoucherRules;

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    setPhoneNumber(value);
    setCheckoutError("");
    if (isVoucherInternet) {
      setVoucherRegionApproved(false);
    }

    if (isGameVoucher) {
      // For game vouchers, phone is secondary — check game ID + phone
      const nextReady = value.length >= MIN_PHONE_LENGTH && isValidIndonesianNumber(value) && isGameIdValid();
      if (!nextReady) {
        phoneAutoScrolledRef.current = false;
        setCurrentStep((step) => (step > 2 ? 2 : step));
        return;
      }
      if (!phoneAutoScrolledRef.current) {
        phoneAutoScrolledRef.current = true;
        setCurrentStep(3);
        scrollToRef(summaryRef);
      }
    } else {
      // For non-game products
      const nextPhoneReady =
        value.length >= MIN_PHONE_LENGTH && isValidIndonesianNumber(value);

      if (!nextPhoneReady) {
        phoneAutoScrolledRef.current = false;
        setCurrentStep((step) => (step > 2 ? 2 : step));
        return;
      }

      // Enable step 3 when phone is valid (min 10 digit)
      if (currentStep < 3) {
        setCurrentStep(3);
      }

      // Auto-scroll only when phone reaches 12 digits
      if (value.length >= AUTO_SCROLL_LENGTH && !phoneAutoScrolledRef.current) {
        phoneAutoScrolledRef.current = true;
        scrollToRef(summaryRef);
      }
    }
  };

  const handleGameIdChange = (key, value) => {
    const newData = { ...gameIdData, [key]: value };
    setGameIdData(newData);
    setCheckoutError("");

    // Check if all game fields valid + phone valid
    const allFieldsFilled = gameConfig.fields.every((field) => {
      const v = field.key === key ? value : newData[field.key];
      return v && v.toString().trim().length > 0;
    });
    const phoneReady = phoneNumber.length >= MIN_PHONE_LENGTH && isValidIndonesianNumber(phoneNumber);

    if (allFieldsFilled && phoneReady && !phoneAutoScrolledRef.current) {
      phoneAutoScrolledRef.current = true;
      setCurrentStep(3);
      scrollToRef(summaryRef);
    } else if (!allFieldsFilled || !phoneReady) {
      phoneAutoScrolledRef.current = false;
      setCurrentStep((step) => (step > 2 ? 2 : step));
    }
  };

  const handleSelectVariant = (variantId) => {
    setSelectedVariant(variantId);
    setCheckoutError("");
    setVoucherRegionApproved(false);
    // Reset game ID data when switching variant (different game may need different fields)
    const newProduct = allVariants.find((p) => p.id === variantId);
    if (newProduct && newProduct.gameName !== selectedProduct.gameName) {
      setGameIdData({});
      phoneAutoScrolledRef.current = false;
    }
    if (currentStep < 2) setCurrentStep(2);
    scrollToRef(phoneRef);
  };

  // Format game data for targetData
  const formatGameTargetData = () => {
    if (!isGameVoucher) return phoneNumber;
    const parts = gameConfig.fields.map((f) => `${f.label}: ${gameIdData[f.key] || ""}`);
    return parts.join(" | ");
  };

  // [FIX 4.3] Show confirmation dialog before checkout
  const handleCheckoutClick = () => {
    if (!isStep2Complete) return;
    if (voucherValidationMessage) {
      setCheckoutError(voucherValidationMessage);
      return;
    }
    if (requiresVoucherRegionApproval && !voucherRegionApproved) {
      setCheckoutError(`${VOUCHER_REGION_APPROVAL_TEXT} Centang persetujuan untuk lanjut ke checkout.`);
      return;
    }
    setCheckoutError("");
    setShowConfirm(true);
  };

  const handleCheckout = async () => {
    if (isCheckingOut || !canCheckout) return;
    setShowConfirm(false);

    setIsCheckingOut(true);
    setCheckoutError("");

    try {
      const bodyData = {
        productId: selectedVariant,
        phoneNumber,
      };

      if (isVoucherInternet) {
        bodyData.voucherRegionApproved = voucherRegionApproved;
      }

      // Include game data if it's a game voucher
      if (isGameVoucher) {
        bodyData.gameData = {
          gameName: selectedProduct.gameName,
          ...gameIdData,
        };
        bodyData.targetData = formatGameTargetData();
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();

      if (!data.success) {
        setCheckoutError(data.error || "Checkout gagal");
        return;
      }

      if (data.data.gateway === "duitku") {
        try {
          const buildFinishUrl = (status, result = {}) => {
            const finishUrl = new URL("/payment/finish", window.location.origin);
            finishUrl.searchParams.set(
              "order_id",
              data.data.midtransOrderId || data.data.orderId || ""
            );
            finishUrl.searchParams.set("token", data.data.guestToken || "");
            finishUrl.searchParams.set("gateway", "duitku");

            if (status) {
              finishUrl.searchParams.set("status", status);
            }

            if (result?.resultCode) {
              finishUrl.searchParams.set("resultCode", result.resultCode);
            }

            return finishUrl.toString();
          };

          await openDuitkuPopup({
            reference: data.data.duitkuReference,
            paymentUrl: data.data.snapRedirectUrl,
            onSuccess(result) {
              window.location.href = buildFinishUrl("", result);
            },
            onPending(result) {
              window.location.href = buildFinishUrl("", result);
            },
            onError(result) {
              window.location.href = buildFinishUrl("error", result);
            },
            onClose(result) {
              window.location.href = buildFinishUrl("unfinish", result);
            },
          });
          return;
        } catch (duitkuError) {
          console.error("Duitku popup failed, falling back to redirect:", duitkuError);
        }
      }

      if (data.data.snapRedirectUrl) {
        window.location.href = data.data.snapRedirectUrl;
      }
    } catch (err) {
      setCheckoutError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <>
    {/* [FIX 4.3] Confirmation Modal */}
    {showConfirm && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-fade-in">
        <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-scale-in">
          <h3 className="text-lg font-extrabold text-navy mb-1">Konfirmasi Pesanan</h3>
          <p className="text-gray-400 text-xs mb-4">Pastikan data di bawah sudah benar sebelum melanjutkan.</p>

          <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Produk</span>
              <span className="font-semibold text-gray-800 text-right">{selectedProduct.name}</span>
            </div>
            {isGameVoucher && selectedProduct.gameName && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Game</span>
                <span className="font-semibold text-gray-800">{selectedProduct.gameName}</span>
              </div>
            )}
            {isGameVoucher && gameConfig && gameConfig.fields.map((field) => (
              gameIdData[field.key] && (
                <div key={field.key} className="flex justify-between text-sm">
                  <span className="text-gray-500">{field.label}</span>
                  <span className="font-semibold text-gray-800">{gameIdData[field.key]}</span>
                </div>
              )
            ))}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{isGameVoucher ? "No. HP" : "No. Tujuan"}</span>
              <span className="font-semibold text-gray-800">{phoneNumber}</span>
            </div>
            {isVoucherInternet && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Jenis Voucher</span>
                  <span className="font-semibold text-gray-800">
                    {voucherRequirement.label || "Telkomsel atau byU"}
                  </span>
                </div>
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2">
                  <p className="text-[11px] text-yellow-800">
                    {VOUCHER_REGION_APPROVAL_TEXT}
                  </p>
                </div>
              </>
            )}
            <div className="border-t border-gray-200 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-navy">Total</span>
                <span className="text-lg font-extrabold text-tred">{formatRupiah(selectedProduct.price)}</span>
              </div>
            </div>

            {/* Active gateway info */}
            {activeGatewayLabel && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Pembayaran via</span>
                <span className="font-semibold text-gray-800">
                  {activeGatewayLabel}
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
            >
              Batal
            </button>
            <button
              onClick={handleCheckout}
              className="flex-1 py-3 gradient-red text-white rounded-xl text-sm font-bold shadow-lg shadow-tred/20 hover:opacity-95 transition-opacity"
            >
              Ya, Bayar Sekarang
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Full-screen loading overlay during Midtrans redirect */}
    {isCheckingOut && (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm">
        <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-tred animate-spin mb-4"></div>
        <p className="text-navy font-bold text-lg">Mempersiapkan Pembayaran...</p>
        <p className="text-gray-400 text-sm mt-1">Kamu akan diarahkan ke halaman pembayaran</p>
      </div>
    )}

    <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
      {/* Breadcrumb (Desktop) */}
      <nav className="hidden md:flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/" className="hover:text-tred transition-colors">
          Beranda
        </Link>
        <ChevronRight size={14} />
        <Link
          href={`/?category=${product.categoryId}`}
          className="hover:text-tred transition-colors"
        >
          {categoryName}
        </Link>
        <ChevronRight size={14} />
        <span className="text-gray-700 font-medium">{product.name}</span>
      </nav>

      {/* Progress Steps (Mobile) */}
      <div className="md:hidden mb-5">
        <div className="flex items-center justify-between px-4">
          {steps.map((step, i) => (
            <div key={step.num} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    currentStep >= step.num
                      ? "gradient-red text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {currentStep > step.num ? <Check size={14} /> : step.num}
                </div>
                <span
                  className={`text-[9px] mt-1 font-medium ${
                    currentStep >= step.num ? "text-tred" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-12 sm:w-16 h-0.5 mx-1 rounded-full transition-colors ${
                    currentStep > step.num ? "bg-tred" : "bg-gray-200"
                  }`}
                ></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Column: Product & Variants */}
        <div className="flex-1 min-w-0">
          {/* Product Header */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6 mb-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl md:text-4xl shrink-0 border border-gray-100">
                {product.gameIcon ? (
                  product.gameIcon
                ) : (
                  <CategoryIcon
                    categoryId={product.categoryId}
                    icon={categoryIcon}
                    alt={categoryName}
                    size={44}
                    fallbackClassName="text-3xl md:text-4xl"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h1 className="text-navy font-extrabold text-lg md:text-xl leading-tight">
                      {categoryName}
                    </h1>
                    {product.gameName && (
                      <p className="text-gray-500 text-sm">{product.gameName}</p>
                    )}
                  </div>
                  {product.isFlashSale && (
                    <span className="shrink-0 flex items-center gap-1 gradient-red text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                      <Zap size={10} /> FLASH SALE
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-xs md:text-sm mt-1 line-clamp-2">
                  {product.description}
                </p>
              </div>
            </div>
          </div>

          {/* Step 1: Select Variant */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full gradient-red flex items-center justify-center text-white text-xs font-bold">
                1
              </div>
              <h2 className="font-bold text-sm text-navy">
                Pilih {categoryName === "Pulsa" ? "Nominal" : "Paket"}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {allVariants.map((variant) => {
                const isSelected = selectedVariant === variant.id;
                const varDiscount = calculateDiscount(
                  variant.originalPrice,
                  variant.price
                );
                return (
                  <button
                    key={variant.id}
                    onClick={() => handleSelectVariant(variant.id)}
                    className={`relative text-left p-3 md:p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-tred bg-tred-50"
                        : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full gradient-red flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                    {varDiscount > 0 && (
                      <span className="inline-block bg-success text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full mb-1.5">
                        -{varDiscount}%
                      </span>
                    )}
                    <p
                      className={`font-bold text-sm ${
                        isSelected ? "text-tred" : "text-gray-800"
                      }`}
                    >
                      {variant.name}
                    </p>
                    {variant.validity && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {variant.quota} • {variant.validity}
                      </p>
                    )}
                    <div className="mt-1.5">
                      {variant.originalPrice > variant.price && (
                        <p className="text-[10px] text-gray-400 line-through">
                          {formatRupiah(variant.originalPrice)}
                        </p>
                      )}
                      <p
                        className={`font-extrabold text-sm ${
                          isSelected ? "text-tred" : "text-gray-800"
                        }`}
                      >
                        {formatRupiah(variant.price)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Related Products (Desktop) */}
          {relatedProducts.length > 0 && (
            <div className="hidden md:block mt-6">
              <h3 className="font-bold text-navy text-base mb-3">
                Produk {categoryName} Lainnya
              </h3>
              <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
                {relatedProducts.slice(0, 4).map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Checkout Form */}
        <div className="md:w-[380px] lg:w-[420px] shrink-0">
          <div className="md:sticky md:top-[7.5rem]">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="gradient-navy px-5 py-4">
                <h2 className="text-white font-bold text-base flex items-center gap-2">
                  <ShieldCheck size={18} /> Express Checkout
                </h2>
                <p className="text-white/60 text-xs mt-0.5">
                  Beli langsung — pilih metode bayar di halaman pembayaran
                </p>
              </div>

              <div className="p-5 space-y-5">
                {/* Step 2: Game ID (for game vouchers) + Phone Number */}
                <div ref={phoneRef}>
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        currentStep >= 2
                          ? "gradient-red text-white"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {currentStep > 2 ? <Check size={12} /> : "2"}
                    </div>
                    <h3 className="font-bold text-sm text-navy">
                      {isGameVoucher ? "Data Akun Game" : "Nomor HP Tujuan"}
                    </h3>
                  </div>

                  {/* Game ID Fields (only for game vouchers) */}
                  {isGameVoucher && gameConfig && (
                    <div className="mb-4 space-y-3">
                      {/* Game name badge */}
                      <div className="flex items-center gap-2 bg-navy/5 rounded-lg px-3 py-2">
                        <Gamepad2 size={14} className="text-navy" />
                        <span className="text-xs font-semibold text-navy">{selectedProduct.gameName}</span>
                      </div>

                      {gameConfig.fields.map((field) => {
                        const FieldIcon = field.icon;
                        if (field.type === "select") {
                          return (
                            <div key={field.key}>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">{field.label}</label>
                              <div className="relative">
                                <FieldIcon
                                  size={16}
                                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                                />
                                <select
                                  value={gameIdData[field.key] || ""}
                                  onChange={(e) => handleGameIdChange(field.key, e.target.value)}
                                  className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl text-sm font-medium transition-all focus:outline-none appearance-none bg-white ${
                                    !gameIdData[field.key]
                                      ? "border-gray-200 focus:border-tred focus:ring-2 focus:ring-tred/10"
                                      : "border-success bg-success-light/40 focus:ring-2 focus:ring-success/20"
                                  }`}
                                >
                                  {field.options.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div key={field.key}>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">{field.label}</label>
                            <div className="relative">
                              <FieldIcon
                                size={16}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                              />
                              <input
                                type={field.type === "number" ? "tel" : "text"}
                                value={gameIdData[field.key] || ""}
                                onChange={(e) => {
                                  const val = field.type === "number"
                                    ? e.target.value.replace(/\D/g, "")
                                    : e.target.value;
                                  handleGameIdChange(field.key, val);
                                }}
                                placeholder={field.placeholder}
                                className={`w-full pl-10 pr-10 py-3 border-2 rounded-xl text-sm font-medium transition-all focus:outline-none ${
                                  !gameIdData[field.key]
                                    ? "border-gray-200 focus:border-tred focus:ring-2 focus:ring-tred/10"
                                    : "border-success bg-success-light/40 focus:ring-2 focus:ring-success/20"
                                }`}
                              />
                              {gameIdData[field.key] && (
                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                                  <CheckCircle2 size={18} className="text-success" />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Game ID hint */}
                      <div className="bg-gold-light/60 border border-gold/30 rounded-lg p-2.5">
                        <p className="text-[11px] text-yellow-800 leading-relaxed">
                          💡 {gameConfig.hint}
                        </p>
                      </div>

                      {/* Divider */}
                      <div className="flex items-center gap-3 pt-1">
                        <div className="flex-1 h-px bg-gray-200"></div>
                        <span className="text-[10px] text-gray-400 font-medium">Nomor HP untuk Notifikasi</span>
                        <div className="flex-1 h-px bg-gray-200"></div>
                      </div>
                    </div>
                  )}

                  {/* Phone Number Input */}
                  <div className="relative">
                    <Phone
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      placeholder="08xxxxxxxxxx"
                      maxLength={13}
                      className={`w-full pl-10 pr-10 py-3 border-2 rounded-xl text-sm font-medium transition-all focus:outline-none ${
                        phoneNumber.length === 0
                          ? "border-gray-200 focus:border-tred focus:ring-2 focus:ring-tred/10"
                          : phoneValid
                          ? "border-success bg-success-light/40 focus:ring-2 focus:ring-success/20"
                          : "border-tred/50 bg-tred-50 focus:ring-2 focus:ring-tred/10"
                      }`}
                    />
                    {phoneNumber.length > 0 && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                        {phoneValid ? (
                          <CheckCircle2 size={18} className="text-success" />
                        ) : (
                          <AlertCircle size={18} className="text-tred/50" />
                        )}
                      </div>
                    )}
                  </div>

                  {phoneNumber.length > 0 && !phoneValid && (
                    <p className="text-tred text-[11px] mt-1.5 flex items-center gap-1">
                      <AlertCircle size={12} />
                      Masukkan nomor HP Indonesia yang valid (10-13 digit)
                    </p>
                  )}
                  {phoneValid && detectedOperator && (
                    <p className="text-success text-[11px] mt-1.5 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      Provider: {detectedOperator} terverifikasi
                    </p>
                  )}
                  {isGameVoucher && (
                    <p className="text-gray-400 text-[10px] mt-1.5">
                      Nomor HP digunakan untuk notifikasi status pesanan via WhatsApp.
                    </p>
                  )}
                  {isVoucherInternet && (
                    <div className="mt-3 space-y-2.5">
                      <div
                        className={`rounded-xl border px-3 py-3 ${
                          voucherValidationMessage
                            ? "border-tred/20 bg-tred-50"
                            : "border-blue-200 bg-blue-50"
                        }`}
                      >
                        <p
                          className={`text-xs font-bold ${
                            voucherValidationMessage ? "text-tred" : "text-navy"
                          }`}
                        >
                          Ketentuan voucher internet
                        </p>
                        <p
                          className={`text-[11px] mt-1 leading-relaxed ${
                            voucherValidationMessage ? "text-tred" : "text-gray-600"
                          }`}
                        >
                          {voucherRequirement.hint}
                        </p>
                        {voucherValidationMessage ? (
                          <p className="text-[11px] mt-2 flex items-center gap-1 text-tred">
                            <AlertCircle size={12} />
                            {voucherValidationMessage}
                          </p>
                        ) : (
                          phoneReadyForPayment && (
                            <p className="text-[11px] mt-2 flex items-center gap-1 text-success">
                              <CheckCircle2 size={12} />
                              Nomor sesuai dengan ketentuan produk voucher internet ini.
                            </p>
                          )
                        )}
                      </div>

                      <label className="flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={voucherRegionApproved}
                          onChange={(e) => {
                            setVoucherRegionApproved(e.target.checked);
                            setCheckoutError("");
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-yellow-300 text-tred focus:ring-tred"
                        />
                        <span className="text-[11px] leading-relaxed text-yellow-800">
                          Saya setuju dan memahami bahwa {VOUCHER_REGION_APPROVAL_TEXT}
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Step 3: Summary & Checkout */}
                <div
                  ref={summaryRef}
                  className={`transition-opacity duration-300 ${
                    currentStep >= 3 && isStep2Complete
                      ? "opacity-100"
                      : "opacity-40 pointer-events-none"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        currentStep >= 3
                          ? "gradient-red text-white"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      3
                    </div>
                    <h3 className="font-bold text-sm text-navy">
                      Konfirmasi & Bayar
                    </h3>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 border border-gray-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Produk</span>
                      <span className="font-semibold text-gray-800">
                        {selectedProduct.name}
                      </span>
                    </div>
                    {isGameVoucher && selectedProduct.gameName && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Game</span>
                        <span className="font-semibold text-gray-800">
                          {selectedProduct.gameName}
                        </span>
                      </div>
                    )}
                    {/* Show game ID data in summary */}
                    {isGameVoucher && gameConfig && gameConfig.fields.map((field) => (
                      gameIdData[field.key] && (
                        <div key={field.key} className="flex justify-between text-sm">
                          <span className="text-gray-500">{field.label}</span>
                          <span className="font-semibold text-gray-800">
                            {gameIdData[field.key]}
                          </span>
                        </div>
                      )
                    ))}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{isGameVoucher ? "No. HP (notif)" : "No. Tujuan"}</span>
                      <span className="font-semibold text-gray-800">
                        {phoneNumber || "—"}
                      </span>
                    </div>
                    {detectedOperator && !isGameVoucher && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Operator</span>
                        <span className="font-semibold text-gray-800">
                          {detectedOperator}
                        </span>
                      </div>
                    )}
                    {isVoucherInternet && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Jenis Voucher</span>
                          <span className="font-semibold text-gray-800">
                            {voucherRequirement.label || "Telkomsel atau byU"}
                          </span>
                        </div>
                        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2">
                          <p className="text-[11px] text-yellow-800">
                            {VOUCHER_REGION_APPROVAL_TEXT}
                          </p>
                          <p
                            className={`text-[11px] mt-1 ${
                              voucherRegionApproved ? "text-green-700" : "text-yellow-800"
                            }`}
                          >
                            {voucherRegionApproved
                              ? "Persetujuan area sudah diberikan."
                              : "Setujui ketentuan area sebelum checkout."}
                          </p>
                        </div>
                      </>
                    )}
                    <div className="border-t border-gray-200 pt-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-navy">
                          Total Bayar
                        </span>
                        <span className="text-lg font-extrabold text-tred">
                          {formatRupiah(selectedProduct.price)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-400 text-[10px] mt-2 text-center">
                    {isVoucherInternet && !voucherRegionApproved
                      ? "Setujui ketentuan area voucher internet untuk lanjut ke pembayaran"
                      : "Kamu akan memilih metode pembayaran di halaman berikutnya"}
                  </p>

                  {checkoutError && (
                    <div className="bg-tred-50 border border-tred/20 rounded-xl p-3 flex items-start gap-2 mt-3">
                      <AlertCircle size={16} className="text-tred shrink-0 mt-0.5" />
                      <p className="text-tred text-xs">{checkoutError}</p>
                    </div>
                  )}

                  <button
                    onClick={handleCheckoutClick}
                    disabled={
                      currentStep < 3 ||
                      !canCheckout ||
                      isCheckingOut
                    }
                    className="w-full mt-4 gradient-red text-white font-bold text-base py-3.5 rounded-xl shadow-lg shadow-tred/20 hover:opacity-95 transition-opacity btn-ripple disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isCheckingOut ? (
                      <>
                        <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                        Memproses...
                      </>
                    ) : (
                      <>
                        <Lock size={16} />
                        Bayar Sekarang
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 mt-3 text-gray-400">
                    <ShieldCheck size={14} />
                    <span className="text-[10px]">
                      Transaksi aman & terenkripsi{activeGatewayLabel ? ` via ${activeGatewayLabel}` : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </>
  );
}
