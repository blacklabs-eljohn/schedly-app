import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Step 2: Black layer slides up by 120px to reveal yellow layer (800ms)
    const t1 = setTimeout(() => {
      setStep(2);
    }, 800);

    // Step 3: Yellow & Black layers slide up further to reveal blue layer (1700ms)
    const t2 = setTimeout(() => {
      setStep(3);
    }, 1700);

    // Step 4: Fade out exit (2700ms)
    const t3 = setTimeout(() => {
      setIsFadingOut(true);
    }, 2700);

    // Complete (3050ms)
    const t4 = setTimeout(() => {
      onComplete();
    }, 3050);

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
    }, 250);
  };

  // Independent GPU offsets
  const getBlackOffset = () => {
    if (step === 3) return -205; // Reveals yellow (115px) + blue (90px)
    if (step === 2) return -115; // Reveals yellow (115px)
    return 0;                    // Covers full screen
  };

  const getYellowOffset = () => {
    if (step === 3) return -90;  // Slides up 90px to reveal blue
    return 0;                    // Sits at bottom
  };

  return (
    <div 
      onClick={handleSkip}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#2B59FF', // Bottom foundation
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
      {/* 1. Base Layer (Blue - Slide 3): Fixed at very bottom */}
      <div 
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 90,
          backgroundColor: '#2B59FF',
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
          borderBottomLeftRadius: 60,
          borderBottomRightRadius: 60,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          textAlign: 'center',
          color: '#000000',
          fontSize: 16.5,
          fontWeight: 800,
          letterSpacing: '-0.01em',
          paddingBottom: 38,
          zIndex: 2,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
          transform: `translate3d(0, ${getYellowOffset()}px, 0)`,
          transition: 'transform 0.65s cubic-bezier(0.32, 0.72, 0, 1)',
          willChange: 'transform'
        }}
      >
        Your Schedule, Simplified
      </div>

      {/* 3. Top Layer (Black - Slide 1, 2, 3): Slides up to reveal yellow */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#000000',
          borderBottomLeftRadius: 60,
          borderBottomRightRadius: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3,
          boxShadow: '0 14px 40px rgba(0, 0, 0, 0.6)',
          transform: `translate3d(0, ${getBlackOffset()}px, 0)`,
          transition: 'transform 0.65s cubic-bezier(0.32, 0.72, 0, 1)',
          willChange: 'transform'
        }}
      >
        {/* Centered Schedly Icon */}
        <div style={{
          transform: `translate3d(0, ${-getBlackOffset() / 2.5}px, 0)`,
          transition: 'transform 0.65s cubic-bezier(0.32, 0.72, 0, 1)',
          willChange: 'transform'
        }}>
          <img 
            src="/schedly-icon.png" 
            alt="Schedly" 
            style={{ 
              width: 136, 
              height: 136, 
              borderRadius: 30, 
              objectFit: 'cover',
              boxShadow: '0 24px 50px rgba(0, 0, 0, 0.85)'
            }} 
          />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
