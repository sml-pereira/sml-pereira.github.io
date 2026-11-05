// ============================================================================
//  ACADEMIC PORTFOLIO — Shared JavaScript
// ============================================================================

(function () {
    'use strict';

    // --- Navigation scroll shadow ---
    const nav = document.querySelector('.site-nav');
    if (nav) {
        window.addEventListener('scroll', function () {
            nav.classList.toggle('scrolled', window.scrollY > 10);
        }, { passive: true });
    }

    // --- Section reveal on scroll ---
    var sections = document.querySelectorAll('main .container > .section');
    if (sections.length && 'IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08 });
        sections.forEach(function (s) { observer.observe(s); });
    } else {
        // Fallback: show all immediately
        sections.forEach(function (s) { s.classList.add('visible'); });
    }

    // --- Mobile hamburger toggle ---
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.site-nav__links');
    const overlay = document.querySelector('.site-nav__overlay');

    if (toggle && links) {
        function openMenu() {
            toggle.classList.add('active');
            toggle.setAttribute('aria-expanded', 'true');
            links.classList.add('open');
            document.body.classList.add('nav-open');
            if (overlay) overlay.classList.add('open');
        }

        function closeMenu() {
            toggle.classList.remove('active');
            toggle.setAttribute('aria-expanded', 'false');
            links.classList.remove('open');
            document.body.classList.remove('nav-open');
            if (overlay) overlay.classList.remove('open');
        }

        toggle.addEventListener('click', function () {
            if (links.classList.contains('open')) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        // Close menu when a link is clicked
        links.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', closeMenu);
        });

        // Close menu when overlay (outside area) is clicked
        if (overlay) {
            overlay.addEventListener('click', closeMenu);
        }

        // Close menu on Escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && links.classList.contains('open')) {
                closeMenu();
            }
        });
    }
    // --- Trajectory illustration (all pages with canvas) ---
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function initTrajectoryCanvas(canvas) {
        var ctx = canvas.getContext('2d');
        var dpr = window.devicePixelRatio || 1;

        var isDark = document.documentElement.getAttribute('data-theme') === 'dark';

        var lightPalette = [
            { color: '#1a1a2e', opacity: 0.9 },
            { color: '#1a1a2e', opacity: 0.7 },
            { color: '#4a4a5a', opacity: 0.65 },
            { color: '#4a4a5a', opacity: 0.55 },
            { color: '#7a7a8a', opacity: 0.5 },
            { color: '#3d5a7f', opacity: 0.6 },
        ];

        var darkPalette = [
            { color: '#b0b0be', opacity: 0.9 },
            { color: '#b0b0be', opacity: 0.7 },
            { color: '#8a8a9a', opacity: 0.65 },
            { color: '#8a8a9a', opacity: 0.55 },
            { color: '#6a6a7a', opacity: 0.5 },
            { color: '#7da4cc', opacity: 0.6 },
        ];

        var palette = isDark ? darkPalette : lightPalette;
        var lineColor = isDark ? '176,176,190' : '26,26,46';

        var minR = 1.4;
        var maxR = 3;
        var dots = [];
        var mouseX = -1;
        var mouseY = -1;
        var W = 0;
        var H = 0;

        // The figure is a fixed set of points, plotted once and joined into a
        // single open path that visits each of them exactly once. Neither the
        // points nor the order they are joined in ever changes, so the
        // highlight always has the same line to follow.
        var route = [];      // point indices, in the order the path visits them
        var segStart = [];   // arc length at which each segment begins
        var nodeAt = [];     // arc length at which each visit happens
        var pathLen = 0;
        var traceDist = 0;   // arc-length position of the pen
        var trailLen = 200;  // px of lit trail behind the pen
        // Pixels per frame. A constant rate rather than a constant duration, so
        // the pen moves at the same visible pace on the wide home band and on
        // the shorter canvases beside the other page headings.
        var penSpeed = 0.72;
        var dir = 1;         // +1 inking outward, -1 lifting on the way back

        // Weight of the line before the pen has been over it, after it has, and
        // the extra brightness of the lit stretch either side of the pen
        var ghostAlpha = 0.09;
        var inkAlpha = 0.18;
        var glowBoost = 0.40;

        // Pause and pulse at each end of the route
        var turnFrames = 50;
        var turnHold = 0;
        var turnT = 0;

        // Where a click has asked the pen to go, and how far into its dash it is
        var dashTarget = -1;
        var dashRamp = 0;
        var dashFactor = 10;

        // Returns true when the canvas actually changed size. The points are
        // replotted for the new box so the figure always fills the width it has
        // been given — full-bleed on the home page, the remaining column width
        // elsewhere — with the pen kept at the same point in its cycle.
        function resize() {
            var rect = canvas.getBoundingClientRect();
            var newW = Math.round(rect.width);
            var newH = Math.round(rect.height);
            if (newW < 4 || newH < 4) {
                // Momentarily unmeasurable (hidden parent, background tab) —
                // hold on to the last good size rather than wiping the canvas
                if (W >= 4 && H >= 4) return false;
                newW = Math.max(1, newW);
                newH = Math.max(1, newH);
            }
            if (newW === W && newH === H) return false;
            W = newW;
            H = newH;
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            var phase = pathLen > 0 ? traceDist / (pathLen + trailLen) : 0;
            plot();
            measurePath();
            traceDist = phase * (pathLen + trailLen);
            return true;
        }

        function pointCount() {
            return Math.max(6, Math.min(48, Math.round(W / 38)));
        }

        // Points are laid down left to right, but the step between them is
        // drawn from a skewed distribution: most gaps come out short, a few
        // several times longer. That gives clusters and open stretches rather
        // than an evenly spaced row. Vertically each point is free to sit
        // anywhere in the band. The order the path visits them in is decided
        // separately, by buildRoute().
        function plot() {
            var n = pointCount();
            dots = [];

            var gaps = [];
            var total = 0;
            for (var g = 0; g < n - 1; g++) {
                var step = 0.3 + Math.pow(Math.random(), 1.7) * 2.2;
                gaps.push(step);
                total += step;
            }

            var margin = 12;   // room for the arrival ring at either end
            var span = Math.max(1, W - margin * 2);
            var x = margin;
            for (var i = 0; i < n; i++) {
                var p = palette[Math.floor(Math.random() * palette.length)];
                var r = minR + Math.random() * (maxR - minR);
                var pad = r + 2;
                var hy = pad + Math.random() * Math.max(1, H - pad * 2);
                dots.push({
                    x: x, y: hy,      // where the point is now
                    hx: x, hy: hy,    // where it rests when left alone
                    vx: 0, vy: 0,
                    r: r,
                    color: p.color,
                    opacity: p.opacity,
                    phase: Math.random() * Math.PI * 2,
                });
                if (i < n - 1) x += (gaps[i] / total) * span;
            }

            route = buildRoute();
        }

        // The path visits every point once, but not in left-to-right order.
        // Points are taken in short consecutive blocks and the order within
        // each block is shuffled, so the line runs ahead, doubles back for the
        // ones it passed, and carries on — p1, p2, p5, p3, p4, p6 and so on.
        // Detours stay inside their block, which keeps every segment short.
        function buildRoute() {
            var n = dots.length;
            var sizes = [1, 2, 2, 3, 4];
            var cap = (W / Math.max(1, n)) * 4;  // 4x the average gap
            var seq = [];
            var i = 0;

            while (i < n) {
                var k = Math.min(sizes[Math.floor(Math.random() * sizes.length)], n - i);
                var best = null;
                var bestMax = Infinity;

                // Try a few shufflings and take one whose longest hop stays
                // within the cap, so a detour never becomes a line right
                // across the figure
                for (var attempt = 0; attempt < 6; attempt++) {
                    var blk = [];
                    for (var j = 0; j < k; j++) blk.push(i + j);
                    for (var sh = blk.length - 1; sh > 0; sh--) {
                        var rnd = Math.floor(Math.random() * (sh + 1));
                        var tmp = blk[sh]; blk[sh] = blk[rnd]; blk[rnd] = tmp;
                    }

                    var longest = 0;
                    var prev = seq.length ? seq[seq.length - 1] : -1;
                    for (var q = 0; q < blk.length; q++) {
                        if (prev >= 0) longest = Math.max(longest, dist(dots[prev], dots[blk[q]]));
                        prev = blk[q];
                    }
                    if (longest < bestMax) { bestMax = longest; best = blk; }
                    if (longest <= cap) break;
                }

                for (var b = 0; b < best.length; b++) seq.push(best[b]);
                i += k;
            }
            return seq;
        }

        function dist(a, b) {
            var dx = a.x - b.x;
            var dy = a.y - b.y;
            return Math.sqrt(dx * dx + dy * dy);
        }

        // Arc length along the path — recomputed each frame because the points
        // shift under the cursor, but the order of them never changes
        function measurePath() {
            segStart.length = 0;
            nodeAt.length = 0;
            pathLen = 0;
            if (!route.length) return;
            nodeAt.push(0);
            for (var i = 0; i < route.length - 1; i++) {
                segStart.push(pathLen);
                pathLen += dist(dots[route[i]], dots[route[i + 1]]);
                nodeAt.push(pathLen);
            }
        }

        // How lit the trail is at a given arc length: 1 at the pen, falling to
        // 0 over the length of the trail behind it. "Behind" follows the
        // direction of travel, so on the way back the lit stretch marks the
        // ink being lifted rather than laid down.
        function glowAt(s) {
            var behind = dir > 0 ? traceDist - s : s - traceDist;
            if (behind < 0 || behind > trailLen) return 0;
            return 1 - behind / trailLen;
        }

        // The route carries full ink everywhere the pen has already been
        function routeAlpha(s) {
            return s <= traceDist ? inkAlpha : ghostAlpha;
        }

        function trailAlpha(s) {
            return glowAt(s) * glowBoost;
        }

        // Stroke one segment with a gradient sampled at the points where the
        // weight changes: the pen itself (a step) and the far end of the trail
        function strokeAlong(a, b, s0, L, width, alphaFn) {
            var s1 = s0 + L;
            var ts = [0, 1];
            var tail = traceDist - dir * trailLen;
            if (tail > s0 && tail < s1) ts.push((tail - s0) / L);
            if (traceDist > s0 && traceDist < s1) {
                var tp = (traceDist - s0) / L;
                ts.push(Math.max(0, tp - 0.0008));
                ts.push(Math.min(1, tp + 0.0008));
            }
            ts.sort(function (m, n) { return m - n; });

            var grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            var visible = false;
            for (var i = 0; i < ts.length; i++) {
                var al = alphaFn(s0 + ts[i] * L);
                if (al > 0.004) visible = true;
                grad.addColorStop(ts[i], 'rgba(' + lineColor + ',' + al.toFixed(3) + ')');
            }
            if (!visible) return;

            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = grad;
            ctx.lineWidth = width;
            ctx.stroke();
        }

        // Points drift back to where they were plotted; the cursor pushes them
        // aside on the way past. A barely-there sway keeps the figure alive.
        function updatePhysics(now) {
            var t = now * 0.00035;
            for (var i = 0; i < dots.length; i++) {
                var dot = dots[i];
                var homeX = dot.hx + Math.sin(t + dot.phase) * 2.2;
                var homeY = dot.hy + Math.cos(t * 0.8 + dot.phase) * 1.6;

                dot.vx += (homeX - dot.x) * 0.008;
                dot.vy += (homeY - dot.y) * 0.008;

                if (mouseX >= 0) {
                    var dx = dot.x - mouseX;
                    var dy = dot.y - mouseY;
                    var md = Math.sqrt(dx * dx + dy * dy);
                    if (md < 85 && md > 0.01) {
                        var force = (1 - md / 85) * 0.9;
                        dot.vx += (dx / md) * force;
                        dot.vy += (dy / md) * force;
                    }
                }

                dot.vx *= 0.9;
                dot.vy *= 0.9;
                dot.x += dot.vx;
                dot.y += dot.vy;

                if (dot.x < dot.r) dot.x = dot.r;
                if (dot.x > W - dot.r) dot.x = W - dot.r;
                if (dot.y < dot.r) dot.y = dot.r;
                if (dot.y > H - dot.r) dot.y = H - dot.r;
            }
        }

        // Two passes over each segment: the route, at ghost weight ahead of the
        // pen and full ink behind it, then the lit stretch that travels with the
        // pen. The line only ever changes weight where the pen has passed.
        function drawPath() {
            var lo = dir > 0 ? traceDist - trailLen : traceDist;
            var hi = dir > 0 ? traceDist : traceDist + trailLen;

            for (var ei = 0; ei < route.length - 1; ei++) {
                var a = dots[route[ei]];
                var b = dots[route[ei + 1]];
                var s0 = segStart[ei];
                var L = nodeAt[ei + 1] - s0;
                if (L <= 0) continue;

                strokeAlong(a, b, s0, L, 0.8, routeAlpha);
                if (s0 + L >= lo && s0 <= hi) {
                    strokeAlong(a, b, s0, L, 1.4, trailAlpha);
                }
            }

            drawPen();
        }

        // The pen tip at the leading edge of the trail
        function drawPen() {
            if (route.length < 2 || traceDist > pathLen) return;
            var idx = 0;
            while (idx < segStart.length - 1 && nodeAt[idx + 1] < traceDist) idx++;
            var L = nodeAt[idx + 1] - nodeAt[idx];
            if (L <= 0) return;

            var a = dots[route[idx]];
            var b = dots[route[idx + 1]];
            var t = Math.max(0, Math.min(1, (traceDist - nodeAt[idx]) / L));
            var px = a.x + (b.x - a.x) * t;
            var py = a.y + (b.y - a.y) * t;

            // Arrival: a ring opens out of the end point before the pen turns
            if (turnHold > 0) {
                ctx.beginPath();
                ctx.arc(px, py, 4 + 7 * turnT, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(' + lineColor + ',' + (0.22 * (1 - turnT)).toFixed(3) + ')';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            ctx.beginPath();
            ctx.arc(px, py, 5.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + lineColor + ',0.07)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(px, py, 1.8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + lineColor + ',0.5)';
            ctx.fill();
        }

        // Points swell briefly as the pen reaches them, like points being plotted
        function drawDots() {
            for (var ci = 0; ci < route.length; ci++) {
                var dot = dots[route[ci]];
                var lit = glowAt(nodeAt[ci]);

                ctx.beginPath();
                ctx.arc(dot.x, dot.y, dot.r * (1 + 0.45 * lit), 0, Math.PI * 2);
                ctx.fillStyle = dot.color;
                ctx.globalAlpha = Math.min(1, dot.opacity * (1 + 0.5 * lit));
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        function draw() {
            ctx.clearRect(0, 0, W, H);

            if (!reducedMotion) updatePhysics(Date.now());
            measurePath();

            // The trail scales with the path; the pen travels at a fixed rate
            trailLen = Math.max(90, Math.min(300, pathLen * 0.28));
            if (reducedMotion) {
                traceDist = pathLen * 0.62;
            } else {
                advance();
            }

            drawPath();
            drawDots();
        }

        // Steady travel out and back along the route, pausing at each end, and
        // dashing when a click has asked the pen to be somewhere else
        function advance() {
            if (turnHold > 0) {
                turnHold--;
                turnT = 1 - turnHold / turnFrames;
                if (turnHold === 0) dir = -dir;
                return;
            }

            var base = penSpeed;
            var speed = base;

            if (dashTarget >= 0) {
                var remaining = Math.abs(dashTarget - traceDist);
                if (remaining < 2) {
                    dashTarget = -1;
                    dashRamp = 0;
                } else {
                    dashRamp = Math.min(1, dashRamp + 1 / 18);        // ease in
                    var brake = Math.min(1, remaining / 120);          // ease out
                    speed = base * (1 + (dashFactor - 1) * dashRamp * brake);
                }
            }

            traceDist += speed * dir;

            if (traceDist >= pathLen) {
                traceDist = pathLen;
                startTurn();
            } else if (traceDist <= 0) {
                traceDist = 0;
                startTurn();
            }
        }

        function startTurn() {
            dashTarget = -1;
            dashRamp = 0;
            turnHold = turnFrames;
            turnT = 0;
        }

        function loop() {
            draw();
            if (!reducedMotion) {
                requestAnimationFrame(loop);
            }
        }

        canvas.addEventListener('mousemove', function (e) {
            var rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        });
        canvas.addEventListener('mouseleave', function () { mouseX = -1; mouseY = -1; });

        // A click asks the pen to come to the nearest place on the line. It
        // travels there quickly rather than jumping, inking or lifting on the
        // way, so the figure never reaches a state the pen did not draw.
        canvas.addEventListener('click', function (e) {
            if (route.length < 2 || pathLen <= 0) return;
            var rect = canvas.getBoundingClientRect();
            var cx = e.clientX - rect.left;
            var cy = e.clientY - rect.top;

            var bestS = -1;
            var bestD = Infinity;
            for (var i = 0; i < route.length - 1; i++) {
                var a = dots[route[i]];
                var b = dots[route[i + 1]];
                var vx = b.x - a.x;
                var vy = b.y - a.y;
                var len2 = vx * vx + vy * vy;
                if (len2 <= 0) continue;
                var t = Math.max(0, Math.min(1, ((cx - a.x) * vx + (cy - a.y) * vy) / len2));
                var qx = a.x + vx * t - cx;
                var qy = a.y + vy * t - cy;
                var d = qx * qx + qy * qy;
                if (d < bestD) {
                    bestD = d;
                    bestS = segStart[i] + t * (nodeAt[i + 1] - segStart[i]);
                }
            }

            if (bestS < 0 || Math.abs(bestS - traceDist) < 4) return;
            dashTarget = bestS;
            dashRamp = 0;
            dir = bestS > traceDist ? 1 : -1;
            turnHold = 0;
        });

        canvas.addEventListener('touchmove', function (e) {
            var rect = canvas.getBoundingClientRect();
            var t = e.touches[0];
            mouseX = t.clientX - rect.left;
            mouseY = t.clientY - rect.top;
        }, { passive: true });
        canvas.addEventListener('touchend', function () { mouseX = -1; mouseY = -1; });

        // React to theme changes — update palette and line colour
        var themeObserver = new MutationObserver(function () {
            isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            palette = isDark ? darkPalette : lightPalette;
            lineColor = isDark ? '176,176,190' : '26,26,46';
            // Update existing dots to use the new palette
            for (var ti = 0; ti < dots.length; ti++) {
                var p = palette[Math.floor(Math.random() * palette.length)];
                dots[ti].color = p.color;
                dots[ti].opacity = p.opacity;
            }
        });
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        resize();
        loop();

        // The canvas is often laid out after this runs — a background tab, a
        // late font, an orientation change. Re-measure so the points occupy the
        // whole width on offer rather than the width guessed at load. Resizing
        // the canvas clears it, so repaint at once instead of waiting for a
        // frame that will not arrive until the page is on screen again.
        function remeasure() {
            if (!resize()) return;
            draw();
        }

        window.addEventListener('resize', remeasure);
        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(remeasure).observe(canvas);
        }
    }

    // Initialise trajectory canvas on any page that has one
    var trajectoryCanvas = document.getElementById('trajectory-canvas');
    if (trajectoryCanvas) {
        initTrajectoryCanvas(trajectoryCanvas);
    }

    // --- Dark / Light theme toggle ---
    (function initTheme() {
        var root = document.documentElement;
        var stored = localStorage.getItem('theme');
        var systemDark = window.matchMedia('(prefers-color-scheme: dark)');

        // Resolve the effective theme
        function effective() {
            if (stored) return stored;
            return systemDark.matches ? 'dark' : 'light';
        }

        // Apply theme to DOM and update theme-color meta tag
        function apply(theme) {
            root.setAttribute('data-theme', theme);
            var meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.setAttribute('content', theme === 'dark' ? '#16161e' : '#ffffff');
        }

        apply(effective());

        // Listen for system preference changes (only when no explicit choice stored)
        systemDark.addEventListener('change', function () {
            if (!localStorage.getItem('theme')) {
                apply(systemDark.matches ? 'dark' : 'light');
            }
        });

        // Wire up the toggle button
        var btn = document.querySelector('.theme-toggle');
        if (btn) {
            btn.addEventListener('click', function () {
                var current = root.getAttribute('data-theme');
                var next = current === 'dark' ? 'light' : 'dark';
                stored = next;
                localStorage.setItem('theme', next);
                apply(next);
            });
        }
    })();

    // --- Outbound links open in a new tab ---
    // Only links that actually leave the site, plus PDFs. In-page anchors and
    // navigation between our own pages stay put, so the back button keeps
    // working the way a reader expects.
    document.querySelectorAll('a[href]').forEach(function (link) {
        var url;
        try {
            url = new URL(link.getAttribute('href'), window.location.href);
        } catch (e) {
            return;
        }

        // Leaves mailto:, tel: and the like alone.
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

        var leavesSite = url.origin !== window.location.origin;
        var isPdf = /\.pdf$/i.test(url.pathname);
        if (!leavesSite && !isPdf) return;

        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
    });

    // --- Dynamic copyright year ---
    var yearEl = document.querySelector('.copyright-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
