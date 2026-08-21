import React, { useState, useEffect } from 'react';
import { triggerLightHaptic } from '../services/hapticsService';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Step 2: Top layer slides up by 105px to reveal yellow layer (800ms)
    const t1 = setTimeout(() => {
      triggerLightHaptic();
      setStep(2);
    }, 800);

    // Step 3: Yellow & Top layers slide up further to reveal blue layer (1750ms)
    const t2 = setTimeout(() => {
      triggerLightHaptic();
      setStep(3);
    }, 1750);

    // Step 4: Fade out exit (2750ms)
    const t3 = setTimeout(() => {
      setIsFadingOut(true);
    }, 2750);

    // Complete (3100ms)
    const t4 = setTimeout(() => {
      onComplete();
    }, 3100);

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

  // GPU offsets matching the curve proportions
  const getTopLayerOffset = () => {
    if (step === 3) return -185; // Reveals yellow (105px) + blue (80px)
    if (step === 2) return -105; // Reveals yellow (105px)
    return 0;                    // Covers full screen
  };

  const getYellowOffset = () => {
    if (step === 3) return -80;  // Slides up 80px to reveal blue
    return 0;                    // Sits at bottom
  };

  return (
    <div 
      onClick={handleSkip}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#2563EB', // Blue foundation
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
      {/* 1. Base Layer (Blue - Slide 3): Fixed at bottom */}
      <div 
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          backgroundColor: '#2563EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: '#FFFFFF',
          fontSize: 16,
          fontWeight: 800,
          letterSpacing: '-0.01em',
          zIndex: 1
        }}
      >
        Developed by Ethan Sienes
      </div>

      {/* 2. Middle Layer (Yellow - Slide 2 & 3): Slides up to reveal blue */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#FFEA00',
          borderBottomLeftRadius: 52,
          borderBottomRightRadius: 52,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          textAlign: 'center',
          color: '#000000',
          fontSize: 16.5,
          fontWeight: 800,
          letterSpacing: '-0.01em',
          paddingBottom: 34,
          zIndex: 2,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
          transform: `translate3d(0, ${getYellowOffset()}px, 0)`,
          transition: 'transform 0.65s cubic-bezier(0.32, 0.72, 0, 1)',
          willChange: 'transform'
        }}
      >
        Your Schedule, Simplified
      </div>

      {/* 3. Top Layer (Grayscale Campus + Schedly Graphic): Slides up to reveal yellow */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#1E293B',
          borderBottomLeftRadius: 52,
          borderBottomRightRadius: 52,
          overflow: 'hidden',
          zIndex: 3,
          boxShadow: '0 14px 44px rgba(0, 0, 0, 0.65)',
          transform: `translate3d(0, ${getTopLayerOffset()}px, 0)`,
          transition: 'transform 0.65s cubic-bezier(0.32, 0.72, 0, 1)',
          willChange: 'transform'
        }}
      >
        <img 
          src="/splash-1.png" 
          alt="Schedly Splash" 
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center'
          }}
        />
      </div>
    </div>
  );
};

export default SplashScreen;
