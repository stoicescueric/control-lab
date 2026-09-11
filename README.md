# Control Lab

Control Lab is a free, interactive curriculum for FTC programmers learning the
control theory behind reliable autonomous robots. Lessons connect a real robot
behavior to a visual model, the math, and deployable Java.

**Read it:** [stoicescueric.github.io/control-lab](https://stoicescueric.github.io/control-lab/)

## What you will find

- Software architecture and loop optimization
- Motor dynamics, feedforward, feedback, and motion profiles
- Signal processing, sensor fusion, and Kalman filtering
- Path following and mecanum kinematics
- State-space control, observers, and LQR
- A drag-aware launcher case study and advanced references

The guide assumes basic Java and FTC robot-programming experience. It does not
assume prior controls coursework.

## Run it locally

Control Lab uses Node.js 24 and npm.

```bash
npm ci --ignore-scripts
npm start
```

Open <http://localhost:3000/control-lab/>.

Before opening a pull request, run:

```bash
npm run verify
```

This runs architecture, content, contributor, lint, formatting, type, test,
build, security, and bundle-size checks.

## Project map

```text
docs/                       MDX lessons, grouped by module
src/components/simulations/ interactive models and visualizations
src/components/kit/         shared lesson and demo components
src/lib/domain/             testable mathematics and physics
src/lib/platform/           progress, consent, analytics, and URL utilities
scripts/                    repository quality checks
```

For dependency boundaries and extension paths, read
[ARCHITECTURE.md](ARCHITECTURE.md). For simulation conventions, read the
[simulation guide](src/components/simulations/README.md).

## Contribute

Corrections and lesson proposals are welcome. Start with
[CONTRIBUTING.md](CONTRIBUTING.md), then follow the repository's
[Code of Conduct](CODE_OF_CONDUCT.md) and [governance](GOVERNANCE.md).

AI assistance is used for editorial and implementation work; technical claims,
derivations, and Java examples are checked before publication.

Security reports belong in [SECURITY.md](SECURITY.md). The project is released
under the [MIT License](LICENSE).
