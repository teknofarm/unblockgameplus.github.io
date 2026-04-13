/**
 * AGC Engine — Client-side JavaScript
 * Mobile menu, reading progress, search enhancements
 */

document.addEventListener('DOMContentLoaded', function() {

  // ── Mobile Menu Toggle ──────────────────────────────
  var menuToggle = document.getElementById('menu-toggle');
  var mobileMenu = document.getElementById('mobile-menu');

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', function() {
      menuToggle.classList.toggle('active');
      mobileMenu.classList.toggle('open');
    });
  }

  // ── Reading Progress Bar ────────────────────────────
  var progressBar = document.getElementById('reading-progress');
  var articleContent = document.getElementById('article-content');

  if (progressBar && articleContent) {
    window.addEventListener('scroll', function() {
      var rect = articleContent.getBoundingClientRect();
      var total = articleContent.scrollHeight;
      var scrolled = -rect.top;
      var progress = Math.max(0, Math.min(100, (scrolled / (total - window.innerHeight)) * 100));
      progressBar.style.width = progress + '%';
    }, { passive: true });
  }

  // ── Sticky Header ──────────────────────────────────
  var header = document.getElementById('site-header');
  var lastScroll = 0;

  if (header) {
    window.addEventListener('scroll', function() {
      var currentScroll = window.pageYOffset;

      if (currentScroll > 80) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }

      if (currentScroll > lastScroll && currentScroll > 200) {
        header.classList.add('hidden');
      } else {
        header.classList.remove('hidden');
      }

      lastScroll = currentScroll;
    }, { passive: true });
  }

  // ── FAQ Accordion ──────────────────────────────────
  var faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(function(item) {
    item.addEventListener('toggle', function() {
      if (this.open) {
        faqItems.forEach(function(other) {
          if (other !== item) other.removeAttribute('open');
        });
      }
    });
  });

  // ── Scroll Reveal Animation ────────────────────────
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.card, .cat-card, .subcat-card, .list-item, .related-card, .faq-item').forEach(function(el) {
      el.classList.add('reveal');
      observer.observe(el);
    });
  }
});
