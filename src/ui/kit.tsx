// Базові елементи інтерфейсу в стилі iOS (Human Interface Guidelines).
import type { ReactNode } from "react";

export function LargeTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="px-5 pt-14 pb-3 flex items-end justify-between">
      <div>
        <h1 className="text-[34px] leading-[41px] font-bold tracking-tight text-black">{title}</h1>
        {subtitle && <p className="text-[15px] text-[#8E8E93] mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

/** Згрупований список з округленими кутами (inset grouped). */
export function Group({ header, footer, children }: { header?: string; footer?: string; children: ReactNode }) {
  return (
    <section className="mx-4 mb-6">
      {header && <p className="px-4 pb-1.5 text-[13px] uppercase tracking-wide text-[#6D6D72]">{header}</p>}
      <div className="bg-white rounded-[12px] overflow-hidden divide-y divide-[#E5E5EA]">{children}</div>
      {footer && <p className="px-4 pt-1.5 text-[13px] text-[#6D6D72]">{footer}</p>}
    </section>
  );
}

export function Row({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`min-h-[44px] px-4 py-2.5 flex items-center gap-3 text-[17px] ${onClick ? "active:bg-[#E5E5EA] cursor-pointer" : ""}`}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  onClick,
  kind = "filled",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: "filled" | "tinted" | "plain" | "green";
  disabled?: boolean;
}) {
  const styles = {
    filled: "bg-[#007AFF] text-white",
    green: "bg-[#34C759] text-white",
    tinted: "bg-[#007AFF]/10 text-[#007AFF]",
    plain: "bg-transparent text-[#007AFF]",
  }[kind];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full h-[50px] rounded-[14px] text-[17px] font-semibold transition active:opacity-70 disabled:opacity-40 ${styles}`}
    >
      {children}
    </button>
  );
}

export function Spinner() {
  return <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin align-[-2px]" />;
}

/** Нижній аркуш (bottom sheet). */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-[430px] bg-[#F2F2F7] rounded-t-[14px] pb-8 sheet-up">
        <div className="flex justify-center pt-2">
          <span className="w-9 h-[5px] rounded-full bg-[#C7C7CC]" />
        </div>
        <div className="flex items-center justify-between px-4 pt-2 pb-3">
          <span className="w-16" />
          <h3 className="text-[17px] font-semibold">{title}</h3>
          <button onClick={onClose} className="w-16 text-right text-[17px] text-[#007AFF]">
            Закрити
          </button>
        </div>
        <div className="px-4 space-y-3">{children}</div>
      </div>
    </div>
  );
}

export function MasteryDots({ level }: { level: number }) {
  return (
    <span className="inline-flex gap-[3px]">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={`w-[6px] h-[6px] rounded-full ${i < level ? "bg-[#34C759]" : "bg-[#D1D1D6]"}`} />
      ))}
    </span>
  );
}
