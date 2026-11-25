# Bundled resources

Runtime server dependency: **ws 8.23.0**, fetched with `npm pack ws@8.23.0` and unpacked unchanged into `vendor/ws/`. Imported by relative path, so no `npm install` or `node_modules` is needed. Its MIT license is `vendor/ws/LICENSE`. Optional native acceleration modules are not installed or required; the pure JavaScript implementation is used. Registry archive and temporary npm cache are not part of the delivery.

Caveat Latin 500/700 WOFF2 files were copied from the supplied Q7 Nave local reference. Upstream project: https://github.com/googlefonts/caveat. OFL text fetched from https://raw.githubusercontent.com/google/fonts/main/ofl/caveat/OFL.txt on 2026-11-25 and saved as `client/vendor/fonts/OFL.txt`. Used only for handwritten annotations and initial-letter avatars. The principal font stack is the operating system's SF/system stack; no Apple font files are distributed.

Three.js 0.187.0 and GSAP 3.15.1 were already bundled in the previous build with their licenses. They are retained as historical resources but are **not loaded** by the new client. The live table is native DOM plus original procedural SVG, with the Web Animations API for brief interruptible moves. There is no bitmap resolution cap or WebGL requirement.

All poker pips, face-card figures, backs, hand-drawn table lines, arrow and original synthesized audio are authored in this project. No downloaded image assets or publisher card artwork are used.
