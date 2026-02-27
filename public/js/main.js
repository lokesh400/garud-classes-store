// Garud Classes Store - Main JS

// Auto dismiss alerts after 4 seconds
document.addEventListener('DOMContentLoaded', function () {
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach(alert => {
    setTimeout(() => {
      const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
      bsAlert.close();
    }, 4000);
  });

  // Back to top - show button when scrolled down
  const backToTop = document.createElement('button');
  backToTop.innerHTML = '<i class="bi bi-chevron-up"></i>';
  backToTop.className = 'back-to-top';
  backToTop.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--primary, #2563eb);
    color: white;
    border: none;
    font-size: 1.2rem;
    display: none;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: all 0.3s ease;
  `;
  document.body.appendChild(backToTop);

  window.addEventListener('scroll', function () {
    if (window.scrollY > 300) {
      backToTop.style.display = 'flex';
    } else {
      backToTop.style.display = 'none';
    }
  });

  backToTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Animate elements on scroll
  const animateOnScroll = () => {
    const elements = document.querySelectorAll('.product-card, .category-card, .feature-card, .admin-stat-card');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    elements.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      observer.observe(el);
    });
  };

  animateOnScroll();
});
