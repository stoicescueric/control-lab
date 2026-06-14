# ⚙️ Control Lab

**Learn filters, controllers & robotics by *playing* with them.**

An interactive, illustration-heavy website that teaches **control theory**, **state
estimation**, and **FTC/FRC robotics** from scratch — built for curious beginners
(roughly high-school level). Every idea comes with plain-language explanations,
analogies, diagrams, a **hands-on demo you can poke at with sliders**, and — for the
robotics track — the **real Java code** (WPILib / Road Runner style) explained line
by line so you can start coding it on your own robot.

### 👉 [**Open the live site**](https://YOUR-USERNAME.github.io/control-lab/)

> _Replace the link above with your GitHub Pages URL once you publish (see
> [Hosting](#-hosting-it-yourself))._

---

## ✨ Why it's different

- **No walls of theory.** You read a little, then immediately *drag a slider* and
  watch what happens. Break things on purpose; that "aha" is the point.
- **Real simulations, not fake animations.** The demos run the genuine algorithms —
  actual Kalman filters, real drone dynamics, true kinematics and odometry math.
- **From idea to your robot.** The robotics lessons include copy-pasteable Java for
  both FIRST leagues (WPILib for FRC; Road Runner / Pedro Pathing / FTCLib for FTC).
- **Runs anywhere, instantly.** Plain HTML/CSS/JS — no build, no installs, no
  account, works offline. Just open it.

## 📚 What's inside

| # | Lesson | What you'll play with |
|---|--------|-----------------------|
| 1 | **Control & Feedback** | A heater fighting the cold: open loop vs. closed loop |
| 2 | **Signals & Noise** | Build a noisy sensor and watch the truth disappear |
| 3 | **Low-Pass Filter** | Exponential smoothing — find your favourite α |
| 4 | **Moving Average** | Grow the sliding window, feel the smoothness/lag trade-off |
| 5 | **Complementary Filter** | Fuse a gyro + accelerometer into one good tilt estimate |
| 6 | **Kalman Filter** | Track a moving target through noisy radar blips (2-D) |
| 7 | **Extended Kalman Filter** | Range/bearing tracking in a curved, nonlinear world |
| 8 | **PID Controller** | Fly a drone to a draggable target; live P/I/D term meters |
| 9 | **On/Off (Bang-Bang)** | Play thermostat with an adjustable deadband |
| 10 | **Model Predictive Control** | Watch a cart plan its future, then re-plan |
| 11 | **The Robot Control Stack** 🤖 | The sense→estimate→decide→act loop; ticks → metres |
| 12 | **Feedforward (kS, kV, kA)** 🤖 | Toggle feedforward on a flywheel; see the lag vanish |
| 13 | **Motion Profiling** 🤖 | A trapezoidal profile driving a linear slide |
| 14 | **Drive Kinematics** 🤖 | Tank / mecanum / swerve — joystick → wheel commands |
| 15 | **Odometry & Pose** 🤖 | Watch dead-reckoning drift, then snap it back with vision |
| 16 | **Path Following (Pure Pursuit)** 🤖 | Drag waypoints; tune the lookahead "carrot" |
| 17 | **Inverse Kinematics** 🤖 | Drag a target; a 2-joint arm solves its angles live |
| 18 | **Glossary & Cheat Sheet** | Every term in plain English + a "which tool?" guide |

🤖 = the **FTC/FRC robotics track** (rigorous math + interactive demo + Java for both leagues).

## 🚀 Run it locally

Clone or download this repo, then either:

- **Easiest:** double-click `index.html`.
- **Recommended** (so every asset loads cleanly): serve the folder with any static
  server —
  - Python: `python -m http.server` → visit <http://localhost:8000>
  - Node: `npx serve`

## 🌐 Hosting it yourself

It's all static files with **no build step**, so any static host works. The free,
zero-config option is **GitHub Pages**:

1. Push this repo to **GitHub** (make it **public**).
2. Repo **Settings → Pages → Source: "Deploy from a branch" → `main` / `(root)` → Save**.
3. ~1 minute later it's live at `https://<your-username>.github.io/<repo-name>/`.

Every push redeploys automatically. (Cloudflare Pages, Netlify, and Vercel work
just as well.)

## 🙌 Contributing

Contributions are welcome — especially from students and mentors.

- **Small fixes** (typos, wording, a better code example): edit the file on GitHub
  with the pencil ✏️, or press <kbd>.</kbd> on the repo to open the in-browser VS
  Code editor, then open a pull request.
- **Add a whole lesson:**
  1. Copy an existing page in `lessons/` (e.g. `feedforward.html`) — each is
     self-contained.
  2. Add one entry to the `LESSONS` array in `assets/js/site.js`. The sidebar,
     home-page cards, and prev/next pager all build themselves from it — nothing
     else to wire up.
  3. Match the house style: intuition + analogy → the math → real Java (with an
     `FRC`/`FTC` badge where it fits) → an interactive demo → "now go code it" notes.
- **Ideas & bug reports:** open an issue. Wishlist topics include LQR, full swerve
  odometry, AprilTag pose estimation, and trajectory generation.

## 🗂️ Project layout

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

## 📄 License

Released under the [MIT License](LICENSE) — free to use, share, remix, and build on.
Attribution is appreciated but not required.
