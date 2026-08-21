import React, { useState, useEffect } from 'react';
import { triggerLightHaptic } from '../services/hapticsService';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState<1 | 2 | 3>(1);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Step 2: Slide 2 (Grayscale Campus + Yellow Banner) at 850ms
    const t1 = setTimeout(() => {
      triggerLightHaptic();
      setCurrentSlide(2);
    }, 850);

    // Step 3: Slide 3 (Grayscale Campus + Yellow + Blue Developer Banner) at 1800ms
    const t2 = setTimeout(() => {
      triggerLightHaptic();
      setCurrentSlide(3);
    }, 1800);

    // Step 4: Fade out exit at 2850ms
    const t3 = setTimeout(() => {
      setIsFadingOut(true);
    }, 2850);

    // Complete at 3200ms
    const t4 = setTimeout(() => {
      onComplete();
    }, 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 220);
  };

  return (
    <div 
      onClick={handleSkip}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#0F172A',
        zIndex: 99999,
        overflow: 'hidden',
        cursor: 'pointer',
        userSelect: 'none',
        opacity: isFadingOut ? 0 : 1,
        transform: isFadingOut ? 'scale(1.02)' : 'scale(1)',
        transition: 'opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'opacity, transform'
      }}
    >
      {/* Slide 1: S1v.png */}
      <img 
        src="/splash-1.png" 
        alt="Schedly Splash 1" 
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          opacity: currentSlide === 1 ? 1 : 0,
          transition: 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'none'
        }}
      />

      {/* Slide 2: S3vv.png */}
      <img 
        src="/splash-2.png" 
        alt="Schedly Splash 2" 
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          opacity: currentSlide === 2 ? 1 : 0,
          transition: 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'none'
        }}
      />

      {/* Slide 3: S3v.png */}
      <img 
        src="/splash-3.png" 
        alt="Schedly Splash 3" 
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          opacity: currentSlide === 3 ? 1 : 0,
          transition: 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
};

export default SplashScreen;
