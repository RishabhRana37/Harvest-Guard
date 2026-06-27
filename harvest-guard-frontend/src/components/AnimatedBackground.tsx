import React, { useEffect, useState } from 'react';

export const AnimatedBackground: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check mobile screen width (< 768px)
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Check system prefers-reduced-motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(motionQuery.matches);
    
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    checkViewport();
    window.addEventListener('resize', checkViewport);
    motionQuery.addEventListener('change', handleMotionChange);

    return () => {
      window.removeEventListener('resize', checkViewport);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  // Generate static random values for particles to avoid server/client hydration mismatch or excessive re-renders
  const particles = React.useMemo(() => {
    if (isMobile || prefersReducedMotion) return [];
    return Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      cx: Math.random() * 100,
      cy: Math.random() * 100,
      r: 1 + Math.random() * 1.5,
      // Random movement paths
      dx: (Math.random() - 0.5) * 40,
      dy: (Math.random() - 0.5) * 40,
      duration: 15 + Math.random() * 15,
      delay: -Math.random() * 20,
    }));
  }, [isMobile, prefersReducedMotion]);

  return (
    <div 
      className="fixed inset-0 w-full h-full -z-50 select-none overflow-hidden bg-bg-base pointer-events-none"
      style={{
        backgroundImage: `
          radial-gradient(ellipse at 20% 40%, var(--bg-gradient-1), transparent 60%),
          radial-gradient(ellipse at 80% 70%, var(--bg-gradient-2), transparent 65%)
        `,
        backgroundSize: '200% 200%',
        animation: prefersReducedMotion ? 'none' : 'bgPulse 12s ease-in-out infinite alternate',
      }}
    >
      {/* Layer 2: SVG Particle Field (Desktop/Tablet only) */}
      {!isMobile && !prefersReducedMotion && (
        <svg className="absolute inset-0 w-full h-full opacity-60" xmlns="http://www.w3.org/2000/svg">
          {particles.map((p) => (
            <circle
              key={p.id}
              cx={`${p.cx}%`}
              cy={`${p.cy}%`}
              r={p.r}
              fill="var(--green-neon)"
              className="opacity-20"
              style={{
                transform: `translate(${p.dx}px, ${p.dy}px)`,
                transition: `transform ${p.duration}s linear infinite alternate`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </svg>
      )}

      {/* Layer 3: Satellite Grid Overlay (Desktop/Tablet only) */}
      {!isMobile && (
        <div 
          className="absolute inset-0 w-full h-full opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(var(--border) 1px, transparent 1px),
              linear-gradient(90deg, var(--border) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      )}
    </div>
  );
};
