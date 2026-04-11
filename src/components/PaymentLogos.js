// ==============================
// Payment Method Logo Components
// Inline SVG logos for each payment provider
// ==============================

export function QrisLogo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#E31837"/>
      <rect x="8" y="8" width="12" height="12" rx="2" fill="white"/>
      <rect x="10" y="10" width="8" height="8" rx="1" fill="#E31837"/>
      <rect x="12" y="12" width="4" height="4" fill="white"/>
      <rect x="28" y="8" width="12" height="12" rx="2" fill="white"/>
      <rect x="30" y="10" width="8" height="8" rx="1" fill="#E31837"/>
      <rect x="32" y="12" width="4" height="4" fill="white"/>
      <rect x="8" y="28" width="12" height="12" rx="2" fill="white"/>
      <rect x="10" y="30" width="8" height="8" rx="1" fill="#E31837"/>
      <rect x="12" y="32" width="4" height="4" fill="white"/>
      <rect x="22" y="8" width="4" height="4" fill="white"/>
      <rect x="22" y="14" width="4" height="4" fill="white"/>
      <rect x="8" y="22" width="4" height="4" fill="white"/>
      <rect x="14" y="22" width="4" height="4" fill="white"/>
      <rect x="22" y="22" width="4" height="4" fill="white"/>
      <rect x="28" y="22" width="4" height="4" fill="white"/>
      <rect x="28" y="28" width="4" height="4" fill="white"/>
      <rect x="34" y="28" width="4" height="4" fill="white"/>
      <rect x="34" y="34" width="4" height="4" fill="white"/>
      <rect x="28" y="34" width="4" height="4" fill="white"/>
      <rect x="22" y="28" width="4" height="4" fill="white"/>
      <rect x="36" y="22" width="4" height="4" fill="white"/>
    </svg>
  );
}

export function GopayLogo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#00AED6"/>
      <path d="M14 24c0-5.52 4.48-10 10-10s10 4.48 10 10-4.48 10-10 10" stroke="white" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      <circle cx="24" cy="24" r="4" fill="white"/>
      <path d="M14 24h4" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
    </svg>
  );
}

export function OvoLogo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#4C2A86"/>
      <ellipse cx="24" cy="24" rx="12" ry="10" fill="none" stroke="white" strokeWidth="3"/>
      <ellipse cx="24" cy="24" rx="6" ry="5" fill="white"/>
    </svg>
  );
}

export function DanaLogo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#108EE9"/>
      <path d="M14 32V16h6c5.52 0 10 3.58 10 8s-4.48 8-10 8h-6z" fill="white"/>
      <path d="M18 28V20h2c3.31 0 6 1.79 6 4s-2.69 4-6 4h-2z" fill="#108EE9"/>
    </svg>
  );
}

export function ShopeePayLogo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#EE4D2D"/>
      <path d="M24 10c-3.5 0-6.5 2-8 5" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M32 15c-1.5-3-4.5-5-8-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M13 18h22c1.1 0 2 .9 2 2v14c0 2.2-1.8 4-4 4H15c-2.2 0-4-1.8-4-4V20c0-1.1.9-2 2-2z" fill="white"/>
      <path d="M20 25c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="#EE4D2D" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M21 28s1.2 3 3 3 3-3 3-3" stroke="#EE4D2D" strokeWidth="2" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

export function BcaLogo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#003D79"/>
      <text x="24" y="29" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="14" fill="white">BCA</text>
    </svg>
  );
}

export function BniLogo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#EC6726"/>
      <text x="24" y="29" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="14" fill="white">BNI</text>
    </svg>
  );
}

export function BriLogo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#00529C"/>
      <text x="24" y="29" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="14" fill="white">BRI</text>
    </svg>
  );
}

export function MandiriLogo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#003876"/>
      <rect x="8" y="20" width="32" height="3" rx="1.5" fill="#FFCC00"/>
      <text x="24" y="38" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="9" fill="white">mandiri</text>
    </svg>
  );
}

// Map payment IDs to their logo components
export const paymentLogoMap = {
  qris: QrisLogo,
  gopay: GopayLogo,
  ovo: OvoLogo,
  dana: DanaLogo,
  shopeepay: ShopeePayLogo,
  "va-bca": BcaLogo,
  "va-bni": BniLogo,
  "va-bri": BriLogo,
  "va-mandiri": MandiriLogo,
};

export function PaymentLogo({ paymentId, size = 28 }) {
  const LogoComponent = paymentLogoMap[paymentId];
  if (!LogoComponent) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500"
      >
        ?
      </div>
    );
  }
  return <LogoComponent size={size} />;
}
