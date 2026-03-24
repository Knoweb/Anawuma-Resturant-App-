document.addEventListener("DOMContentLoaded", function () {
  const observerOptions = {
    threshold: 0.1, 
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        if (entry.target.classList.contains("fade-up")) {
          entry.target.classList.add("fade-up-visible");
        } else if (entry.target.classList.contains("fade-right")) {
          entry.target.classList.add("fade-right-visible");
        } else if (entry.target.classList.contains("fade-left")) {
          entry.target.classList.add("fade-left-visible");
        } else if (entry.target.classList.contains("fade-down")) {
          entry.target.classList.add("fade-down-visible");
        }
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document
    .querySelectorAll(".fade-up, .fade-right, .fade-left, .fade-down")
    .forEach((section) => {
      observer.observe(section);
    });
});
