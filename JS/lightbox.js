/* Image viewer: click a cover or photo to open it in a page overlay with zoom.
   Works with mouse (wheel, double-click, drag), touch (pinch, drag) and keyboard. */
(function () {
  "use strict";

  var MIN = 1, MAX = 6;
  var items = [];
  var list = [];
  var overlay, stage, view, caption, prevBtn, nextBtn;
  var index = -1, scale = 1, tx = 0, ty = 0;
  var lastFocus = null;
  var pointers = {};
  var pinchStart = null;
  var moved = false;

  function build() {
    overlay = document.createElement("div");
    overlay.className = "lightbox";
    overlay.hidden = true;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Image viewer");
    overlay.innerHTML =
      '<div class="lb-bar">' +
        '<button type="button" class="lb-btn" data-act="out" aria-label="Zoom out">\u2212</button>' +
        '<button type="button" class="lb-btn" data-act="in" aria-label="Zoom in">+</button>' +
        '<button type="button" class="lb-btn" data-act="reset" aria-label="Reset zoom">Reset</button>' +
        '<button type="button" class="lb-btn" data-act="close" aria-label="Close image viewer">\u00D7</button>' +
      '</div>' +
      '<button type="button" class="lb-nav lb-prev" data-act="prev" aria-label="Previous image">\u2039</button>' +
      '<div class="lb-stage"><img class="lb-img" alt="" draggable="false"></div>' +
      '<button type="button" class="lb-nav lb-next" data-act="next" aria-label="Next image">\u203A</button>' +
      '<p class="lb-caption"></p>';
    document.body.appendChild(overlay);

    stage = overlay.querySelector(".lb-stage");
    view = overlay.querySelector(".lb-img");
    caption = overlay.querySelector(".lb-caption");
    prevBtn = overlay.querySelector(".lb-prev");
    nextBtn = overlay.querySelector(".lb-next");

    overlay.addEventListener("click", onButton);
    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("dblclick", onDblClick);
    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerup", onPointerUp);
    stage.addEventListener("pointercancel", onPointerUp);
    stage.addEventListener("click", function (e) {
      if (e.target === stage && !moved) close();
    });
    document.addEventListener("keydown", onKey);
  }

  function sortedItems() {
    return items.slice().sort(function (a, b) {
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
  }

  function open(img) {
    if (!overlay) build();
    lastFocus = document.activeElement;
    list = sortedItems();
    overlay.hidden = false;
    document.documentElement.classList.add("lightbox-open");
    show(list.indexOf(img));
    overlay.querySelector('[data-act="close"]').focus();
  }

  function close() {
    overlay.hidden = true;
    document.documentElement.classList.remove("lightbox-open");
    view.removeAttribute("src");
    pointers = {};
    pinchStart = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function show(i) {
    index = (i + list.length) % list.length;
    var img = list[index];
    view.src = img.currentSrc || img.src;
    view.alt = img.alt;
    caption.textContent = img.alt;
    prevBtn.hidden = nextBtn.hidden = list.length < 2;
    reset();
  }

  function reset() {
    scale = 1; tx = 0; ty = 0;
    apply();
  }

  function apply() {
    var w = view.clientWidth * scale, h = view.clientHeight * scale;
    var lx = Math.max(0, (w - stage.clientWidth) / 2);
    var ly = Math.max(0, (h - stage.clientHeight) / 2);
    tx = Math.min(lx, Math.max(-lx, tx));
    ty = Math.min(ly, Math.max(-ly, ty));
    view.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + scale + ")";
    overlay.classList.toggle("is-zoomed", scale > 1.001);
  }

  // Zoom by a factor around a point (px, py) measured from the centre of the stage.
  function zoomAt(factor, px, py) {
    var ns = Math.min(MAX, Math.max(MIN, scale * factor));
    var r = ns / scale;
    tx = px - (px - tx) * r;
    ty = py - (py - ty) * r;
    scale = ns;
    apply();
  }

  function stagePoint(e) {
    var rect = stage.getBoundingClientRect();
    return { x: e.clientX - rect.left - rect.width / 2, y: e.clientY - rect.top - rect.height / 2 };
  }

  function onButton(e) {
    var b = e.target.closest("[data-act]");
    if (!b) return;
    switch (b.dataset.act) {
      case "close": close(); break;
      case "in": zoomAt(1.4, 0, 0); break;
      case "out": zoomAt(1 / 1.4, 0, 0); break;
      case "reset": reset(); break;
      case "prev": show(index - 1); break;
      case "next": show(index + 1); break;
    }
  }

  function onWheel(e) {
    e.preventDefault();
    var p = stagePoint(e);
    zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, p.x, p.y);
  }

  function onDblClick(e) {
    var p = stagePoint(e);
    if (scale > 1.01) reset(); else zoomAt(2.5, p.x, p.y);
  }

  function pointerList() {
    return Object.keys(pointers).map(function (k) { return pointers[k]; });
  }

  function onPointerDown(e) {
    stage.setPointerCapture(e.pointerId);
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    moved = false;
    var pts = pointerList();
    if (pts.length === 2) {
      pinchStart = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), scale: scale };
    }
  }

  function onPointerMove(e) {
    var prev = pointers[e.pointerId];
    if (!prev) return;
    var dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var pts = pointerList();
    if (pts.length === 2 && pinchStart) {
      var d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      var rect = stage.getBoundingClientRect();
      var mx = (pts[0].x + pts[1].x) / 2 - rect.left - rect.width / 2;
      var my = (pts[0].y + pts[1].y) / 2 - rect.top - rect.height / 2;
      var target = Math.min(MAX, Math.max(MIN, pinchStart.scale * d / pinchStart.dist));
      zoomAt(target / scale, mx, my);
      moved = true;
    } else if (pts.length === 1 && scale > 1.001) {
      if (Math.abs(dx) + Math.abs(dy) > 0) moved = true;
      tx += dx; ty += dy;
      overlay.classList.add("is-dragging");
      apply();
    }
  }

  function onPointerUp(e) {
    delete pointers[e.pointerId];
    if (pointerList().length < 2) pinchStart = null;
    overlay.classList.remove("is-dragging");
  }

  function onKey(e) {
    if (!overlay || overlay.hidden) return;
    switch (e.key) {
      case "Escape": close(); break;
      case "+": case "=": zoomAt(1.4, 0, 0); break;
      case "-": case "_": zoomAt(1 / 1.4, 0, 0); break;
      case "0": reset(); break;
      case "ArrowLeft": if (list.length > 1) show(index - 1); break;
      case "ArrowRight": if (list.length > 1) show(index + 1); break;
      case "Tab":
        var f = Array.prototype.filter.call(overlay.querySelectorAll("button"), function (b) { return !b.hidden; });
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        break;
    }
  }

  // Make covers and gear photos clickable, but only the ones that actually loaded.
  document.querySelectorAll(".cover img, .photo img").forEach(function (img) {
    function enable() {
      if (img.dataset.zoomReady || !img.naturalWidth) return;
      img.dataset.zoomReady = "1";
      var box = img.parentElement;
      box.classList.add("is-zoomable");
      box.setAttribute("role", "button");
      box.setAttribute("tabindex", "0");
      box.setAttribute("aria-label", "Enlarge image: " + (img.alt || "image"));
      items.push(img);
      box.addEventListener("click", function () { open(img); });
      box.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(img); }
      });
    }
    if (img.complete) enable(); else img.addEventListener("load", enable);
  });
})();
