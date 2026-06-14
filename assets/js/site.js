/* Shared site chrome: builds the sidebar nav, mobile menu and the
   prev/next pager on every page from a single lesson list. */
(function () {
  "use strict";

  const LESSONS = [
    { id: "intro",           file: "intro.html",           title: "Control & Feedback", icon: "🔁", group: "Foundations", tag: "basics",
      short: "What is control? Open vs closed loops." },
    { id: "signals",         file: "signals.html",         title: "Signals & Noise",    icon: "📡", group: "Foundations", tag: "basics",
      short: "What sensors really give us." },
    { id: "low-pass",        file: "low-pass.html",        title: "Low-Pass Filter",    icon: "🌊", group: "Filters", tag: "filter",
      short: "Smooth out the jitters." },
    { id: "moving-average",  file: "moving-average.html",  title: "Moving Average",     icon: "📊", group: "Filters", tag: "filter",
      short: "Average the last few readings." },
    { id: "complementary",   file: "complementary.html",   title: "Complementary Filter", icon: "🧭", group: "Filters", tag: "filter",
      short: "Fuse two sensors into one." },
    { id: "kalman",          file: "kalman.html",          title: "Kalman Filter",      icon: "🎯", group: "Filters", tag: "filter",
      short: "The gold-standard tracker." },
    { id: "ekf",             file: "ekf.html",             title: "Extended Kalman Filter", icon: "📐", group: "Filters", tag: "filter",
      short: "Kalman for curved (nonlinear) worlds." },
    { id: "pid",             file: "pid.html",             title: "PID Controller",     icon: "🚁", group: "Controllers", tag: "control",
      short: "The world's most-used controller." },
    { id: "bang-bang",       file: "bang-bang.html",       title: "On/Off (Bang-Bang)", icon: "🌡️", group: "Controllers", tag: "control",
      short: "The humble thermostat." },
    { id: "mpc",             file: "mpc.html",             title: "Model Predictive Control", icon: "🔮", group: "Controllers", tag: "control",
      short: "Plan ahead, then act." },
    { id: "robotics-intro",  file: "robotics-intro.html",  title: "The Robot Control Stack", icon: "🤖", group: "Robotics (FTC/FRC)", tag: "robo",
      short: "From joystick to motor: how it all fits." },
    { id: "feedforward",     file: "feedforward.html",     title: "Feedforward (kS, kV, kA)", icon: "➡️", group: "Robotics (FTC/FRC)", tag: "robo",
      short: "Predict the effort instead of only reacting." },
    { id: "motion-profiling",file: "motion-profiling.html",title: "Motion Profiling",   icon: "📈", group: "Robotics (FTC/FRC)", tag: "robo",
      short: "Smooth, fast, repeatable moves." },
    { id: "drive-kinematics",file: "drive-kinematics.html",title: "Drive Kinematics",   icon: "🛞", group: "Robotics (FTC/FRC)", tag: "robo",
      short: "Tank, mecanum & swerve math." },
    { id: "odometry",        file: "odometry.html",        title: "Odometry & Pose",    icon: "🧭", group: "Robotics (FTC/FRC)", tag: "robo",
      short: "Track where the robot is on the field." },
    { id: "path-following",  file: "path-following.html",   title: "Path Following (Pure Pursuit)", icon: "🛤️", group: "Robotics (FTC/FRC)", tag: "robo",
      short: "Chase a path of waypoints smoothly." },
    { id: "inverse-kinematics", file: "inverse-kinematics.html", title: "Inverse Kinematics", icon: "🦾", group: "Robotics (FTC/FRC)", tag: "robo",
      short: "Aim an arm at a point in space." },
    { id: "glossary",        file: "glossary.html",        title: "Glossary & Cheat Sheet", icon: "📖", group: "Reference", tag: "ref",
      short: "Every term, in plain English." },
  ];

  // Are we inside /lessons/ ? Adjust relative links accordingly.
  const inLessons = location.pathname.replace(/\\/g, "/").includes("/lessons/");
  const root = inLessons ? "../" : "";
  const lessonHref = (file) => (inLessons ? file : "lessons/" + file);

  window.SITE = { LESSONS, root, lessonHref };

  document.addEventListener("DOMContentLoaded", () => {
    const current = document.body.getAttribute("data-page") || "";
    buildSidebar(current);
    buildTopbar();
    buildPager(current);
    wireMobileMenu();
  });

  function buildSidebar(current) {
    const el = document.getElementById("sidebar");
    if (!el) return;
    let html = `
      <div class="brand"><span class="logo">⚙️</span>
        <a href="${root}index.html">Control&nbsp;Lab</a></div>
      <a class="nav-link ${current === "home" ? "active" : ""}" href="${root}index.html">
        <span class="ico">🏠</span> Home</a>`;

    const groups = [...new Set(LESSONS.map((l) => l.group))];
    for (const g of groups) {
      html += `<div class="nav-group-title">${g}</div>`;
      for (const l of LESSONS.filter((x) => x.group === g)) {
        html += `<a class="nav-link ${current === l.id ? "active" : ""}" href="${lessonHref(l.file)}">
          <span class="ico">${l.icon}</span> ${l.title}</a>`;
      }
    }
    el.innerHTML = html;
  }

  function buildTopbar() {
    const content = document.querySelector(".content");
    if (!content) return;
    const bar = document.createElement("div");
    bar.className = "topbar";
    bar.innerHTML = `
      <button class="menu-btn" id="menuBtn" aria-label="Open menu">☰</button>
      <span class="brand"><a href="${root}index.html" style="color:inherit;text-decoration:none">⚙️ Control Lab</a></span>`;
    content.prepend(bar);
  }

  function buildPager(current) {
    const slot = document.getElementById("pager");
    if (!slot) return;
    const idx = LESSONS.findIndex((l) => l.id === current);
    if (idx === -1) return;
    const prev = idx > 0 ? LESSONS[idx - 1] : null;
    const next = idx < LESSONS.length - 1 ? LESSONS[idx + 1] : null;
    const prevHtml = prev
      ? `<a class="prev" href="${lessonHref(prev.file)}"><div class="dir">← Previous</div><div class="ttl">${prev.icon} ${prev.title}</div></a>`
      : `<a class="prev disabled"><div class="dir">← Previous</div><div class="ttl">Start</div></a>`;
    const nextHtml = next
      ? `<a class="next" href="${lessonHref(next.file)}"><div class="dir">Next →</div><div class="ttl">${next.icon} ${next.title}</div></a>`
      : `<a class="next" href="${root}index.html"><div class="dir">Done →</div><div class="ttl">🏠 Back home</div></a>`;
    slot.innerHTML = prevHtml + nextHtml;
  }

  function wireMobileMenu() {
    const btn = document.getElementById("menuBtn");
    const sb = document.getElementById("sidebar");
    const scrim = document.getElementById("scrim");
    if (!btn || !sb) return;
    const open = () => { sb.classList.add("open"); if (scrim) scrim.classList.add("show"); };
    const close = () => { sb.classList.remove("open"); if (scrim) scrim.classList.remove("show"); };
    btn.addEventListener("click", () => sb.classList.contains("open") ? close() : open());
    if (scrim) scrim.addEventListener("click", close);
    sb.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
  }

  /* ---------- small DOM helpers shared by demos ---------- */
  window.$ = (id) => document.getElementById(id);

  /* Bind a range slider to a readout label; calls onChange(value). */
  window.bindSlider = function (id, opts = {}) {
    const input = document.getElementById(id);
    const out = document.getElementById(id + "-val");
    const fmt = opts.fmt || ((v) => v);
    const update = () => {
      const v = parseFloat(input.value);
      if (out) out.textContent = fmt(v);
      if (opts.onChange) opts.onChange(v);
    };
    input.addEventListener("input", update);
    update();
    return input;
  };
})();
