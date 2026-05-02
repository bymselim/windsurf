/** Sertifika görünümüne yakın dekoratif dalgalar — mobilde hafif, metni kapatmaz. */
export function VerifyCertificateWaves() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[min(52vh,420px)] overflow-hidden"
      aria-hidden
    >
      <svg
        className="absolute -bottom-2 -left-[20%] w-[120%] max-w-[720px] opacity-[0.42] sm:opacity-[0.5]"
        viewBox="0 0 800 320"
        preserveAspectRatio="xMinYMax slice"
      >
        <defs>
          <linearGradient id="verifyWaveA" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1A4A94" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#5B3FA8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="verifyWaveB" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7D5BB2" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#1A4A94" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <path
          fill="url(#verifyWaveA)"
          d="M0,280 Q180,200 360,240 T720,200 L800,320 L0,320 Z"
        />
        <path
          fill="url(#verifyWaveB)"
          d="M0,310 Q220,260 440,290 T800,250 L800,320 L0,320 Z"
          opacity="0.65"
        />
      </svg>
      <svg
        className="absolute -bottom-2 -right-[25%] w-[110%] max-w-[640px] opacity-[0.28] sm:opacity-[0.38]"
        viewBox="0 0 700 300"
        preserveAspectRatio="xMaxYMax slice"
      >
        <defs>
          <linearGradient id="verifyWaveC" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#7D5BB2" stopOpacity="0.45" />
            <stop offset="70%" stopColor="#1A4A94" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <path
          fill="url(#verifyWaveC)"
          d="M700,260 Q520,220 360,260 T0,230 L0,300 L700,300 Z"
        />
      </svg>
    </div>
  );
}
