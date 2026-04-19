interface FireBlazesProps {
  count?: number;
}

const FLAMES = [
  { w: 38, h: 72, color: "hsl(14 100% 40%)",  inner: "hsl(28 100% 58%)",  core: "hsl(45 100% 72%)" },
  { w: 26, h: 52, color: "hsl(10 95% 36%)",   inner: "hsl(24 100% 52%)",  core: "hsl(42 100% 68%)" },
  { w: 18, h: 38, color: "hsl(18 100% 44%)",  inner: "hsl(34 100% 60%)",  core: "hsl(50 100% 76%)" },
];

export function FireBlazes({ count = 18 }: FireBlazesProps) {
  const blazes = Array.from({ length: count }, (_, i) => {
    const left       = 2 + (i * 97 / count) + ((i % 3) * 1.4);
    const dur        = 2.2 + (i % 7) * 0.55;
    const delay      = (i * 0.37) % dur;
    const swayA      = ((i % 2 === 0 ? 1 : -1) * (8 + (i % 5) * 5));
    const swayB      = -swayA * 0.6;
    const flame      = FLAMES[i % FLAMES.length];
    const scale      = 0.55 + (i % 4) * 0.22;
    const w          = Math.round(flame.w * scale);
    const h          = Math.round(flame.h * scale);
    const isEmber    = i % 4 === 3;

    if (isEmber) {
      const eDrift = ((i % 2 === 0 ? 1 : -1) * (12 + (i % 6) * 8));
      return (
        <span
          key={i}
          className="lp-ember"
          aria-hidden
          style={{
            left: `${left}%`,
            bottom: `${4 + (i * 3) % 18}%`,
            animationDuration: `${dur + 1.5}s`,
            animationDelay: `${delay}s`,
            ["--ember-drift" as string]: `${eDrift}px`,
          }}
        />
      );
    }

    return (
      <div
        key={i}
        className="fire-blaze"
        aria-hidden
        style={{
          left: `${left}%`,
          width:  w,
          height: h,
          animationDuration: `${dur}s`,
          animationDelay:    `${delay}s`,
          ["--fire-sway-a" as string]: `${swayA}px`,
          ["--fire-sway-b" as string]: `${swayB}px`,
          background: `radial-gradient(ellipse 55% 45% at 50% 85%, ${flame.core} 0%, ${flame.inner} 35%, ${flame.color} 68%, transparent 100%)`,
          filter: `blur(${Math.round(1 + (i % 3))}px) drop-shadow(0 0 ${4 + (i % 4) * 3}px ${flame.inner})`,
        }}
      />
    );
  });

  return <>{blazes}</>;
}
