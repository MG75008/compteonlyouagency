import Image from "next/image";

export default function Logo() {
  return (
    <div className="overflow-hidden rounded-lg border border-brand-border">
      <Image
        src="/logo.jpg"
        alt="Onlyou Agency"
        width={634}
        height={210}
        priority
        className="h-10 w-auto sm:h-12"
      />
    </div>
  );
}
