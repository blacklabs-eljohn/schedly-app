import React, { useEffect, useRef } from 'react';
import lottie, { type AnimationItem } from 'lottie-web';

interface LottieAnimationProps {
  animationData: any;
  loop?: boolean;
  autoplay?: boolean;
  width?: number | string;
  height?: number | string;
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
  onComplete?: () => void;
}

export const LottieAnimation: React.FC<LottieAnimationProps> = ({
  animationData,
  loop = true,
  autoplay = true,
  width = '100%',
  height = '100%',
  speed = 1,
  className,
  style,
  onComplete
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    if (!containerRef.current || !animationData) return;

    try {
      // Clear previous animation if any
      if (animRef.current) {
        animRef.current.destroy();
      }

      const anim = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop,
        autoplay,
        animationData,
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid meet',
          progressiveLoad: true,
          hideOnTransparent: true
        }
      });

      anim.setSpeed(speed);

      if (onComplete) {
        anim.addEventListener('complete', onComplete);
      }

      animRef.current = anim;
    } catch (err) {
      console.warn('Failed to initialize Lottie animation:', err);
    }

    return () => {
      if (animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }
    };
  }, [animationData, loop, autoplay, speed, onComplete]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        pointerEvents: 'none',
        ...style
      }}
      aria-hidden="true"
    />
  );
};
