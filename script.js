const header = document.querySelector('.navbar');
const toggleButton = document.querySelector('.nav-toggle');
const navLinks = document.querySelectorAll('.nav-menu a');

window.addEventListener('scroll', () => {
  if (window.scrollY > 20) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});

toggleButton?.addEventListener('click', () => {
  header.classList.toggle('nav-open');
});

navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    header.classList.remove('nav-open');
  });
});

const progressFill = document.querySelector('.progress-bar__fill');
if (progressFill) {
  document.body.classList.add('js-enabled');

  const updateProgress = () => {
    const scrollTop = window.scrollY;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
    progressFill.style.transform = `scaleX(${progress})`;
  };

  const onScroll = () => {
    requestAnimationFrame(updateProgress);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  updateProgress();
}

// Fade-in sections when they enter the viewport (respect prefers-reduced-motion)
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const els = document.querySelectorAll('.will-fade');
  if (!els.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  els.forEach((el) => io.observe(el));
})();

