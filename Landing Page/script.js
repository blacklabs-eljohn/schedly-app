/**
 * Schedly Landing Page Interactive Scripts
 * Dynamic Mockup Switchers, 3D Perspective Tilt, Auto-Sync Feature Carousel, Theme Toggle & Smooth Scrolls
 */

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initNavbar();
  initHeroMockupTabs();
  initFeatureSyncShowcase();
  initFaqAccordion();
  initScrollReveal();
  initScrollTop();
  initLiveCountdown();
  init3DCardTilt();
});

/* --------------------------------------------------------------------------
   1. Theme Toggle (Dark / Light Mode)
   -------------------------------------------------------------------------- */
function initThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  const html = document.documentElement;

  // Check saved theme or system preference
  const savedTheme = localStorage.getItem('schedly_theme') || 'dark';
  html.setAttribute('data-theme', savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = html.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('schedly_theme', newTheme);
    });
  }
}

/* --------------------------------------------------------------------------
   2. Navbar Scroll Effects & Mobile Menu
   -------------------------------------------------------------------------- */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileLinks = document.querySelectorAll('.mobile-link');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar?.classList.add('scrolled');
    } else {
      navbar?.classList.remove('scrolled');
    }
  }, { passive: true });

  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
      });
    });
  }
}

/* --------------------------------------------------------------------------
   3. Hero Mockup Interactive Tab Switcher
   -------------------------------------------------------------------------- */
function initHeroMockupTabs() {
  const tabButtons = document.querySelectorAll('#heroMockupTabs .mockup-tab-btn');
  const phoneViews = document.querySelectorAll('.phone-view');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-mockup-target');

      // Update button active states
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Switch screen view
      phoneViews.forEach(view => {
        if (view.id === `view-${target}`) {
          view.classList.add('active');
        } else {
          view.classList.remove('active');
        }
      });
    });
  });
}

/* --------------------------------------------------------------------------
   4. Folderly-Style Synchronized Feature Showcase Carousel
   -------------------------------------------------------------------------- */
function initFeatureSyncShowcase() {
  const featureCards = document.querySelectorAll('.feature-interactive-card');
  const slides = [
    document.getElementById('feat-slide-1'),
    document.getElementById('feat-slide-2'),
    document.getElementById('feat-slide-3'),
    document.getElementById('feat-slide-4')
  ];

  let currentIndex = 0;
  let autoPlayInterval = null;
  let isHovered = false;

  function activateFeature(index) {
    currentIndex = index;

    // Update active card
    featureCards.forEach((card, idx) => {
      if (idx === index) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    // Update active phone slide
    slides.forEach((slide, idx) => {
      if (!slide) return;
      if (idx === index) {
        slide.classList.add('active');
        slide.style.opacity = '1';
        slide.style.transform = 'scale(1)';
        slide.style.zIndex = '5';
      } else {
        slide.classList.remove('active');
        slide.style.opacity = '0';
        slide.style.transform = 'scale(1.04)';
        slide.style.zIndex = '1';
      }
    });
  }

  // Click & Hover Listeners
  featureCards.forEach((card, idx) => {
    card.addEventListener('click', () => {
      activateFeature(idx);
    });

    card.addEventListener('mouseenter', () => {
      isHovered = true;
      activateFeature(idx);
    });

    card.addEventListener('mouseleave', () => {
      isHovered = false;
    });
  });

  // Auto cycle features every 5 seconds if not hovered
  function startAutoPlay() {
    autoPlayInterval = setInterval(() => {
      if (!isHovered) {
        let nextIndex = (currentIndex + 1) % featureCards.length;
        activateFeature(nextIndex);
      }
    }, 4500);
  }

  startAutoPlay();
}

/* --------------------------------------------------------------------------
   5. Interactive 3D Card Tilt Effect
   -------------------------------------------------------------------------- */
function init3DCardTilt() {
  const tiltCards = document.querySelectorAll('.card-3d');

  tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -6;
      const rotateY = ((x - centerX) / centerX) * 6;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
    });
  });
}

/* --------------------------------------------------------------------------
   6. Live Mockup Countdown Ticker
   -------------------------------------------------------------------------- */
function initLiveCountdown() {
  const secElement = document.getElementById('liveHeroSec');
  if (!secElement) return;

  let seconds = 42;
  setInterval(() => {
    seconds--;
    if (seconds < 0) seconds = 59;
    secElement.textContent = seconds.toString().padStart(2, '0');
  }, 1000);
}

/* --------------------------------------------------------------------------
   7. FAQ Accordion
   -------------------------------------------------------------------------- */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');

    questionBtn?.addEventListener('click', () => {
      const isOpen = item.classList.contains('active');

      // Close all other FAQs
      faqItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('active');
          const btn = otherItem.querySelector('.faq-question');
          if (btn) btn.setAttribute('aria-expanded', 'false');
        }
      });

      // Toggle current
      if (isOpen) {
        item.classList.remove('active');
        questionBtn.setAttribute('aria-expanded', 'false');
      } else {
        item.classList.add('active');
        questionBtn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* --------------------------------------------------------------------------
   8. Scroll Reveal Observer
   -------------------------------------------------------------------------- */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal-on-scroll');

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => observer.observe(el));
}

/* --------------------------------------------------------------------------
   9. Scroll To Top Button
   -------------------------------------------------------------------------- */
function initScrollTop() {
  const scrollTopBtn = document.getElementById('scrollTopBtn');
  const yearSpan = document.getElementById('currentYear');

  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  if (scrollTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 500) {
        scrollTopBtn.classList.add('visible');
      } else {
        scrollTopBtn.classList.remove('visible');
      }
    }, { passive: true });

    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
}
