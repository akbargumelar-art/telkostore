"use client";

import { useState, useEffect } from "react";
import { Zap, Clock } from "lucide-react";

export default function FlashSaleBanner() {
  const [timeLeft, setTimeLeft] = useState({
    hours: 5,
    minutes: 43,
    seconds: 21,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) { hours = 23; minutes = 59; seconds = 59; }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div className="gradient-red rounded-2xl px-5 py-4 flex items-center justify-between shadow-lg shadow-tred/15">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
          <Zap size={22} className="text-white" />
        </div>
        <div>
          <h3 className="text-white font-extrabold text-base leading-none">
            Flash Sale ⚡
          </h3>
          <p className="text-white/70 text-xs mt-0.5">Harga spesial terbatas!</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Clock size={14} className="text-white/70 mr-1" />
        {[pad(timeLeft.hours), pad(timeLeft.minutes), pad(timeLeft.seconds)].map(
          (unit, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-white font-bold text-sm px-2 py-1 rounded-lg min-w-[32px] text-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                {unit}
              </span>
              {i < 2 && (
                <span className="text-white font-bold text-xs">:</span>
              )}
            </span>
          )
        )}
      </div>
    </div>
  );
}
