import { Building2 } from "lucide-react";
import { useState } from "react";

const LOGO_CANDIDATES = ["/agency-logo.png", "/agency-logo.svg"];

export function AgencyLogo({ className = "size-11", imgClassName = "size-full" }: { className?: string; imgClassName?: string }) {
  const [logoIndex, setLogoIndex] = useState(0);
  const [fallback, setFallback] = useState(false);

  return (
    <div className={`${className} rounded-xl bg-gradient-to-br from-gold/25 to-gold/10 ring-1 ring-gold/40 flex items-center justify-center overflow-hidden shadow-[0_2px_12px_-2px_oklch(0.74_0.12_88_/_0.4)]`}>
      {!fallback ? (
        <img
          src={LOGO_CANDIDATES[logoIndex]}
          alt="ตราหน่วยงานเทศบาลนครนครสวรรค์"
          className={`${imgClassName} object-contain`}
          onError={() => {
            if (logoIndex < LOGO_CANDIDATES.length - 1) setLogoIndex((i) => i + 1);
            else setFallback(true);
          }}
        />
      ) : (
        <Building2 className="size-5 text-gold" strokeWidth={1.5} />
      )}
    </div>
  );
}
