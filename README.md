# ⚙️ Control Lab — an interactive guide to filters, controllers & robots

A friendly, illustration-heavy website that teaches **control theory**, **state
estimation**, and **FTC/FRC robotics** from scratch, aimed at curious beginners
(roughly high-school level). Every concept comes with plain-language explanations,
analogies, hand-drawn SVG diagrams, a **hands-on interactive demo** you can poke at
with sliders, and — for the robotics track — the **real Java code** (WPILib / Road
Runner style) explained line by line so you can start coding it on your own robot.

> No build step, no installs, no internet required. Just open `index.html` in any
> modern browser.

## How to open it

- **Easiest:** double-click `index.html`.
- **Recommended (so everything loads cleanly):** serve the folder locally, e.g.
  - Python: `python -m http.server` then visit http://localhost:8000
  - Node: `npx serve` (or any static file server)

## What's inside

| # | Lesson | What you'll play with |
|---|--------|-----------------------|
| 1 | **Control & Feedback** | A heater fighting the cold: open loop vs. closed loop |
| 2 | **Signals & Noise** | Build a noisy sensor and watch the truth disappear |
| 3 | **Low-Pass Filter** | Exponential smoothing — find your favourite α |
| 4 | **Moving Average** | Grow the sliding window, feel the smoothness/lag trade-off |
| 5 | **Complementary Filter** | Fuse a gyro + accelerometer into one good tilt estimate |
| 6 | **Kalman Filter** | Track a moving target through noisy radar blips (2-D) |
| 7 | **Extended Kalman Filter** | Radar range/bearing tracking in a curved, nonlinear world |
| 8 | **PID Controller** | Fly a drone to a draggable target; live P/I/D term meters |
| 9 | **On/Off (Bang-Bang)** | Play thermostat with an adjustable deadband |
| 10 | **Model Predictive Control** | Watch a cart plan its future trajectory, then re-plan |
| 11 | **The Robot Control Stack** | The sense→estimate→decide→act loop; ticks → metres explorer |
| 12 | **Feedforward (kS, kV, kA)** | Toggle feedforward on/off on a flywheel; see lag vanish |
| 13 | **Motion Profiling** | Trapezoidal profile generator driving a linear slide |
| 14 | **Drive Kinematics** | Tank / mecanum / swerve — joystick → wheel commands |
| 15 | **Odometry & Pose** | Watch dead-reckoning drift, then snap it back with a vision fix |
| 16 | **Path Following (Pure Pursuit)** | Drag waypoints; tune the lookahead "carrot" |
| 17 | **Inverse Kinematics** | Drag a target; a 2-joint arm solves its angles live |
| 18 | **Glossary & Cheat Sheet** | Every term in plain English + a "which tool?" guide |

Lessons 11–17 are the **FTC/FRC robotics track**: each has rigorous math, an
interactive demo, and copy-pasteable Java for both leagues (WPILib for FRC; Road
Runner / Pedro Pathing / FTCLib idioms for FTC).

## Project layout

```
index.html              Landing page (hero + lesson cards)
lessons/                One self-contained HTML page per topic
assets/css/style.css    Shared design system
assets/js/
  site.js               Builds the sidebar nav, mobile menu, prev/next pager
  plot.js               Reusable canvas plotter + scrolling-trace helper
  linalg.js             Tiny matrix library (used by the Kalman & EKF demos)
  code.js               Dependency-free Java syntax highlighter for code blocks
```

Each lesson is a standalone page that pulls in the shared CSS/JS and contains its
own demo script. Want to add a lesson? Create a page in `lessons/` and add one entry
to the `LESSONS` array in `assets/js/site.js` — the nav, cards, and pager update
themselves.

## Notes on the demos

The simulations are real, not faked:

- The **Kalman** demo runs two constant-velocity Kalman filters (one per axis).
- The **EKF** demo runs a 4-state extended Kalman filter with a true range/bearing
  measurement model and its Jacobian.
- The **PID** demo integrates real drone dynamics (gravity, drag, thrust limits,
  integral anti-windup).
- The **MPC** demo solves a finite-horizon LQR via the backward Riccati recursion
  every time you change the horizon, and rolls out the predicted plan each frame.
- The **robotics** demos use the genuine algorithms: trapezoidal profiling, mecanum
  & swerve kinematics, constant-curvature ("pose exponential") odometry, pure-pursuit
  curvature steering, and a law-of-cosines 2-joint IK solver.

All the estimator/controller/robotics math was verified numerically (kinematics
round-trips, odometry closing a circle, IK reproducing its targets, pure pursuit
converging) before being wired into the pages, and every page was run headless to
confirm its demo loop executes without errors.

## 🌐 Hosting (free)

This site is plain static files with **no build step**, so any static host works.
The simplest free option is **GitHub Pages**:

1. Push this folder to a **public** GitHub repository.
2. In the repo, go to **Settings → Pages → Source: "Deploy from a branch" →
   Branch: `main` / `(root)` → Save**.
3. After a minute it's live at `https://<your-username>.github.io/<repo-name>/`.

Every push redeploys automatically. All paths in the site are **relative**, so it
works correctly whether it's served from a domain root or a project subpath.

(Other free hosts that work just as well: Cloudflare Pages, Netlify, Vercel.)

## 🙌 Contributing

Contributions are welcome — especially new lessons and fixes from students and
mentors.

**Quick edits (typos, wording, code):** open the file on GitHub and click the
pencil ✏️, or press <kbd>.</kbd> on the repo to launch the in-browser VS Code
editor. Commit to a branch and open a pull request.

**Add a new lesson:**

1. Copy an existing page in `lessons/` (e.g. `feedforward.html`) as a starting
   point — each is self-contained.
2. Add one entry to the `LESSONS` array in `assets/js/site.js`. The sidebar nav,
   home-page cards, and the prev/next pager all build themselves from that array,
   so there's nothing else to wire up.
3. Keep the house style: intuition + analogy → the math (in a `.formula` block) →
   real Java code (`<pre class="code"><code>…</code></pre>`, with an `FRC`/`FTC`
   badge where relevant) → an interactive demo → "now go code it" notes.

Found a bug or want a topic covered (LQR, full swerve odometry, AprilTag pose
estimation, trajectory generation)? **Open an issue** — it doubles as the wishlist.
