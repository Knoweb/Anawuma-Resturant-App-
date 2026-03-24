document.addEventListener("DOMContentLoaded", function () {
  // Simulate loading delay
  setTimeout(function () {
    const loadingDiv = document.getElementById("loading");
    loadingDiv.classList.add("fadeOut");
    setTimeout(function () {
      loadingDiv.style.display = "none";
      document.getElementById("content").style.display = "block";
    }, 2000);
  }, 1000); // Adjust time as needed
});

gsap.fromTo(
  ".loading",

  { opacity: 1 },
  {
    opacity: 0,
    duration: 2,
    delay: 3.5,
  }
);
