"use client";

import { useState, useMemo, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getProductById,
  getProductsByCategory,
  getCategoryById,
  paymentMethods,
} from "@/data/products";
import { formatRupiah, calculateDiscount, isValidTelkomselNumber } from "@/lib/utils";
import ProductCard from "@/components/ProductCard";
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
} from "lucide-react";

export default function ProductPage({ params }) {
  const { id } = use(params);

  const router = useRouter();
  const product = getProductById(id);
  const [selectedVariant, setSelectedVariant] = useState(id);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  if (!product) {
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

  const category = getCategoryById(product.categoryId);
  const relatedProducts = getProductsByCategory(product.categoryId).filter(
    (p) => p.id !== product.id
  );
  const selectedProduct = getProductById(selectedVariant) || product;
  const discount = calculateDiscount(
    selectedProduct.originalPrice,
    selectedProduct.price
  );

  const phoneValid = isValidTelkomselNumber(phoneNumber);

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    setPhoneNumber(value);
    if (value.length >= 10 && isValidTelkomselNumber(value)) {
      setCurrentStep(3);
    }
  };

  const handleSelectVariant = (variantId) => {
    setSelectedVariant(variantId);
    if (currentStep < 2) setCurrentStep(2);
  };

  const handleSelectPayment = (paymentId) => {
    setSelectedPayment(paymentId);
    setCurrentStep(4);
  };

  const handleCheckout = useCallback(async () => {
    if (isCheckingOut || currentStep < 4) return;
    setIsCheckingOut(true);
    setCheckoutError("");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedVariant,
          phoneNumber,
          paymentMethod: selectedPayment,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setCheckoutError(data.error || "Checkout gagal");
        return;
      }

      // Redirect to Midtrans payment page
      if (data.data.snapRedirectUrl) {
        window.location.href = data.data.snapRedirectUrl;
      }
    } catch (err) {
      setCheckoutError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsCheckingOut(false);
    }
  }, [isCheckingOut, currentStep, selectedVariant, phoneNumber, selectedPayment]);

  const groupedPayments = useMemo(() => {
    const groups = {};
    paymentMethods.forEach((pm) => {
      if (!groups[pm.category]) groups[pm.category] = [];
      groups[pm.category].push(pm);
    });
    return groups;
  }, []);

  const steps = [
    { num: 1, label: "Produk" },
    { num: 2, label: "No. HP" },
    { num: 3, label: "Bayar" },
    { num: 4, label: "Konfirmasi" },
  ];

  return (
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
          {category?.name}
        </Link>
        <ChevronRight size={14} />
        <span className="text-gray-700 font-medium">{product.name}</span>
      </nav>

      {/* Progress Steps (Mobile) */}
      <div className="md:hidden mb-5">
        <div className="flex items-center justify-between px-2">
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
                  className={`w-8 sm:w-12 h-0.5 mx-1 rounded-full transition-colors ${
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
                {product.gameIcon || category?.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h1 className="text-navy font-extrabold text-lg md:text-xl leading-tight">
                      {category?.name}
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
                Pilih {category?.name === "Pulsa" ? "Nominal" : "Paket"}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[product, ...relatedProducts].map((variant) => {
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
          <div className="hidden md:block mt-6">
            <h3 className="font-bold text-navy text-base mb-3">
              Produk {category?.name} Lainnya
            </h3>
            <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
              {relatedProducts.slice(0, 4).map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
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
                  Beli langsung tanpa perlu daftar akun
                </p>
              </div>

              <div className="p-5 space-y-5">
                {/* Step 2: Phone Number */}
                <div>
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
                      Nomor HP Tujuan
                    </h3>
                  </div>

                  <div className="relative">
                    <Phone
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      placeholder="0812xxxxxxxx"
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
                      Masukkan nomor Telkomsel yang valid
                    </p>
                  )}
                  {phoneValid && (
                    <p className="text-success text-[11px] mt-1.5 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      Nomor Telkomsel terverifikasi ✓
                    </p>
                  )}
                </div>

                {/* Step 3: Payment Method */}
                <div
                  className={`transition-opacity duration-300 ${
                    currentStep >= 3
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
                      {currentStep > 3 ? <Check size={12} /> : "3"}
                    </div>
                    <h3 className="font-bold text-sm text-navy">
                      Metode Pembayaran
                    </h3>
                  </div>

                  {Object.entries(groupedPayments).map(
                    ([catName, methods]) => (
                      <div key={catName} className="mb-3">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                          {catName}
                        </p>
                        <div className="space-y-1.5">
                          {methods.map((pm) => (
                            <button
                              key={pm.id}
                              onClick={() => handleSelectPayment(pm.id)}
                              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-2 text-left transition-all ${
                                selectedPayment === pm.id
                                  ? "border-tred bg-tred-50"
                                  : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                              }`}
                            >
                              <span className="text-lg">{pm.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800">
                                  {pm.name}
                                </p>
                                <p className="text-[10px] text-gray-400 truncate">
                                  {pm.description}
                                </p>
                              </div>
                              {selectedPayment === pm.id && (
                                <CheckCircle2
                                  size={18}
                                  className="text-tred shrink-0"
                                />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* Step 4: Summary */}
                <div
                  className={`transition-opacity duration-300 ${
                    currentStep >= 4
                      ? "opacity-100"
                      : "opacity-40 pointer-events-none"
                  }`}
                >
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 border border-gray-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Produk</span>
                      <span className="font-semibold text-gray-800">
                        {selectedProduct.name}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">No. Tujuan</span>
                      <span className="font-semibold text-gray-800">
                        {phoneNumber || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Pembayaran</span>
                      <span className="font-semibold text-gray-800">
                        {paymentMethods.find((p) => p.id === selectedPayment)
                          ?.name || "—"}
                      </span>
                    </div>
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

                  {checkoutError && (
                    <div className="bg-tred-50 border border-tred/20 rounded-xl p-3 flex items-start gap-2 mb-3">
                      <AlertCircle size={16} className="text-tred shrink-0 mt-0.5" />
                      <p className="text-tred text-xs">{checkoutError}</p>
                    </div>
                  )}

                  <button
                    onClick={handleCheckout}
                    disabled={currentStep < 4 || isCheckingOut}
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
                        Beli Sekarang
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 mt-3 text-gray-400">
                    <ShieldCheck size={14} />
                    <span className="text-[10px]">
                      Transaksi aman & terenkripsi
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
