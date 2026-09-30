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

// Furvana waitlist modal and D1-backed submission.
(function () {
  const modal = document.querySelector('#waitlist-modal');
  const form = document.querySelector('#waitlist-form');
  const formView = document.querySelector('#waitlist-form-view');
  const successView = document.querySelector('#waitlist-success');
  const submitButton = document.querySelector('#waitlist-submit');
  const formError = document.querySelector('#waitlist-form-error');
  const openers = document.querySelectorAll('[data-waitlist-open]');
  const closeButtons = document.querySelectorAll('[data-waitlist-close]');

  if (!modal || !form || !formView || !successView || !submitButton || !formError) return;

  const firstInput = document.querySelector('#waitlist-name');
  let lastTrigger = null;

  const errorElements = new Map(
    Array.from(document.querySelectorAll('[data-error-for]')).map((el) => [el.dataset.errorFor, el])
  );

  const clearErrors = () => {
    formError.textContent = '';
    formError.classList.remove('is-visible');
    errorElements.forEach((el) => {
      el.textContent = '';
    });
    form.querySelectorAll('.has-error').forEach((field) => field.classList.remove('has-error'));
  };

  const setFieldError = (name, message) => {
    const error = errorElements.get(name);
    const field = form.elements[name];
    if (error) error.textContent = message;
    if (field) field.classList.add('has-error');
  };

  const validateClientSide = (data) => {
    clearErrors();
    let valid = true;

    if (!data.full_name) {
      setFieldError('full_name', 'Please enter your name.');
      valid = false;
    }

    if (!data.email) {
      setFieldError('email', 'Please enter your email address.');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      setFieldError('email', 'Please enter a valid email address.');
      valid = false;
    }

    return valid;
  };

  const setSubmitState = (loading) => {
    submitButton.disabled = loading;
    submitButton.classList.toggle('is-loading', loading);
    const label = submitButton.querySelector('.waitlist-submit-label');
    if (label) label.textContent = loading ? 'Joining…' : 'Join the Waitlist';
  };

  const openModal = (trigger) => {
    lastTrigger = trigger || document.activeElement;
    clearErrors();
    formView.hidden = false;
    successView.hidden = true;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    modal.inert = false;
    document.body.classList.add('waitlist-open');

    window.setTimeout(() => firstInput?.focus(), 40);
  };

  const closeModal = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    modal.inert = true;
    document.body.classList.remove('waitlist-open');
    setSubmitState(false);

    if (lastTrigger && typeof lastTrigger.focus === 'function') {
      window.setTimeout(() => lastTrigger.focus(), 40);
    }
  };

  const showSuccess = () => {
    formView.hidden = true;
    successView.hidden = false;
    const successClose = successView.querySelector('[data-waitlist-close]');
    window.setTimeout(() => successClose?.focus(), 40);
  };

  openers.forEach((opener) => {
    opener.addEventListener('click', () => openModal(opener));
  });

  closeButtons.forEach((button) => {
    button.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      closeModal();
    }
  });

  form.querySelectorAll('input, select').forEach((field) => {
    field.addEventListener('input', () => {
      const error = errorElements.get(field.name);
      if (error) error.textContent = '';
      field.classList.remove('has-error');
      formError.textContent = '';
      formError.classList.remove('is-visible');
    });
    field.addEventListener('change', () => {
      const error = errorElements.get(field.name);
      if (error) error.textContent = '';
      field.classList.remove('has-error');
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const data = {
      full_name: String(formData.get('full_name') || '').trim(),
      email: String(formData.get('email') || '').trim().toLowerCase(),
      phone: String(formData.get('phone') || '').trim(),
      city: String(formData.get('city') || '').trim(),
      pet_type: String(formData.get('pet_type') || '').trim(),
      website: String(formData.get('website') || '').trim(),
    };

    if (!validateClientSide(data)) {
      const firstErrorField = form.querySelector('.has-error');
      firstErrorField?.focus();
      return;
    }

    // The honeypot is intentionally hidden from normal users.
    if (data.website) {
      showSuccess();
      return;
    }

    setSubmitState(true);
    formError.textContent = '';
    formError.classList.remove('is-visible');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 400 && result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            setFieldError(field, message);
          });
          const firstErrorField = form.querySelector('.has-error');
          firstErrorField?.focus();
        } else if (response.status === 409) {
          showSuccess();
        } else {
          throw new Error(result.message || 'Unable to join the waitlist.');
        }
        return;
      }

      showSuccess();
    } catch (error) {
      formError.textContent = error instanceof Error && error.message
        ? error.message
        : 'Something went wrong. Please try again.';
      formError.classList.add('is-visible');
    } finally {
      setSubmitState(false);
    }
  });
})();
