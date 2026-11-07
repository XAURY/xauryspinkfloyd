/* Background carousel for the Home page.
   Pictures are named after the albums. Missing files are skipped, so remove any album you don't want in the carousel. */
(function () {
  var SOURCES = [
    "Images/Album Covers/the-piper-at-the-gates-of-dawn.jpg",
    "Images/Album Covers/a-saucerful-of-secrets.jpg",
    "Images/Album Covers/more.jpg",
    "Images/Album Covers/ummagumma.jpg",
    "Images/Album Covers/atom-heart-mother.jpg",
    "Images/Album Covers/meddle.jpg",
    "Images/Album Covers/obscured-by-clouds.jpg",
    "Images/Album Covers/the-dark-side-of-the-moon.jpg",
    "Images/Album Covers/wish-you-were-here.jpg",
    "Images/Album Covers/animals.jpg",
    "Images/Album Covers/the-wall.jpg",
    "Images/Album Covers/the-final-cut.jpg",
    "Images/Album Covers/a-momentary-lapse-of-reason.jpg",
    "Images/Album Covers/delicate-sound-of-thunder.jpg",
    "Images/Album Covers/the-division-bell.jpg",
    "Images/Album Covers/pulse.jpg",
    "Images/Album Covers/the-endless-river.jpg"
  ];
  var INTERVAL = 4000; // milliseconds per picture

  var container = document.querySelector("[data-carousel]");
  if (!container) return;

  var slides = [];
  var current = 0;
  var timer = null;

  function show(index) {
    slides.forEach(function (el, n) {
      el.classList.toggle("is-active", n === index);
    });
    current = index;
  }

  function next() {
    if (slides.length < 2) return;
    show((current + 1) % slides.length);
  }

  function stop() { clearInterval(timer); }
  function start() { stop(); timer = setInterval(next, INTERVAL); }

  // Only pictures that actually load are used, so a missing file is skipped.
  SOURCES.forEach(function (src) {
    var img = new Image();
    img.onload = function () {
      img.className = "slide";
      img.alt = "";
      container.appendChild(img);
      slides.push(img);
      if (slides.length === 1) { show(0); start(); }
    };
    img.src = src;
  });

  // Don't keep rotating while the tab is in the background.
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { stop(); } else if (slides.length) { start(); }
  });
})();
