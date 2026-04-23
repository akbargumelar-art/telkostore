import Image from "next/image";

const SPECIAL_CATEGORY_ICONS = {
  "voucher-internet": {
    src: "/icons/voucher-internet.svg",
    width: 22,
    height: 16,
  },
};

export default function CategoryIcon({
  categoryId,
  icon,
  alt,
  size = 22,
  className = "",
  fallbackClassName = "",
}) {
  const specialIcon = SPECIAL_CATEGORY_ICONS[categoryId];

  if (specialIcon) {
    const height = Math.max(1, Math.round((specialIcon.height / specialIcon.width) * size));

    return (
      <span className={`inline-flex items-center justify-center ${className}`.trim()}>
        <Image
          src={specialIcon.src}
          alt={alt || "Voucher Internet"}
          width={size}
          height={height}
          className="h-auto w-auto"
        />
      </span>
    );
  }

  return (
    <span className={fallbackClassName || className} aria-hidden="true">
      {icon}
    </span>
  );
}
