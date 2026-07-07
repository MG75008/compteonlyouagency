export default function Logo() {
  return (
    <div className="flex flex-col items-start leading-none select-none">
      <span className="font-serif text-2xl font-bold tracking-[0.08em] text-brand-text">
        Onlyou
      </span>
      <span className="mt-1 flex items-center gap-2 text-[10px] tracking-[0.35em] text-brand-gold">
        <span className="h-px w-4 bg-brand-gold/60" />
        Agency
        <span className="h-px w-4 bg-brand-gold/60" />
      </span>
    </div>
  );
}
