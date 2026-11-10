"use strict";
// Fungsi pembungkus dijalankan sekali ketika main.js dimuat.
(() => {
    /* ==================== 1. KANVAS DAN RENDERER ==================== */

    const canvas = document.querySelector("#scene"),
        $ = (s) => document.querySelector(s);
    let renderer;
    try {
        renderer = new Renderer(canvas);
    } catch (e) {
        $("#error").hidden = false;
        $("#error").textContent = e.message;
        return;
    }

    /* ==================== 2. KARAKTER DAN DAFTAR OBJEK LINGKUNGAN ==================== */
    const dragon = createBabyDragon(renderer),
        environment = [];
    // position = [x, y, z], size = [skalaX, skalaY, skalaZ].
    // color = [merah, hijau, biru], masing-masing bernilai 0 sampai 1.
    function addEnvironment(mesh, position, size, color, axis = [0, 1, 0], angle = 0) {
        environment.push({
            mesh: mesh,
            model: pose(position, size, axis, angle),
            color: color
        });
    }

    // Environment bergaya desa fantasi. Semua bentuk dibangkitkan sendiri.
    addEnvironment("ellipsoid", [0, -1.15, 0], [5.4, 1.2, 4.6], [0.22, 0.28, 0.2]);
    addEnvironment("ellipsoid", [0, -0.27, 0], [5.2, 0.34, 4.45], [0.32, 0.45, 0.18]);
    addEnvironment("ellipsoid", [0, -0.1, 0], [4.75, 0.12, 4.05], [0.36, 0.5, 0.2]);
    // Jalur batu menuju tempat latihan.
    for (let i = 0; i < 9; i++) {
        addEnvironment(
            "ellipsoid",
            [1.7 + Math.sin(i * 0.8) * 0.2, -0.007, 3.9 - i * 0.6],
            [0.4, 0.065, 0.24],
            [0.51, 0.5, 0.35],
            [0, 1, 0],
            i * 0.37
        );
    }
    for (let i = 0; i < 23; i++) {
        const a = (i / 23) * Math.PI * 2,
            x = Math.cos(a) * 4.9,
            z = Math.sin(a) * 4.15;
        addEnvironment(
            "ellipsoid",
            [x, -0.36, z],
            [0.38 + (i % 3) * 0.08, 0.32, 0.3],
            [0.36 + (i % 3) * 0.035, 0.4, 0.29],
            [0, 1, 0],
            a
        );
    }

    function tree(x, z, k) {
        addEnvironment(
            "cone",
            [x, 0.03, z],
            [0.15 * k, 1.5 * k, 0.15 * k],
            [0.3, 0.19, 0.11]
        );
        for (let j = 0; j < 3; j++) {
            addEnvironment(
                "cone",
                [x, (0.48 + j * 0.4) * k, z],
                [(0.72 - j * 0.16) * k, 1.1 * k, (0.72 - j * 0.16) * k],
                [0.12 + j * 0.025, 0.3 + j * 0.045, 0.17 + j * 0.018]
            );
        }
    }
    [
        [-3.7, -1.9, 1.1],
        [-2.7, -3.2, 1.35],
        [0.1, -3.9, 1.1],
        [2.2, -3.4, 1.35],
        [3.7, -2.2, 0.95],
        [-4.2, 0.4, 0.75]
    ].forEach((p) => tree(...p));
    // Menara desa: dasar, dinding batu, atap, dan jendela.
    const tx = 3.1,
        tz = -0.7;
    addEnvironment("box", [tx, 0.23, tz], [0.64, 0.24, 0.61], [0.37, 0.39, 0.3]);
    addEnvironment("box", [tx, 0.95, tz], [0.46, 0.65, 0.46], [0.62, 0.59, 0.41]);
    for (let row = 0; row < 4; row++) {
        for (let j = 0; j < 3; j++) {
            addEnvironment(
                "box",
                [tx - 0.31 + j * 0.31, 0.45 + row * 0.3, tz + 0.465],
                [0.145, 0.13, 0.025],
                [0.56 + ((row + j) % 2) * 0.07, 0.55, 0.4]
            );
        }
    }
    addEnvironment("box", [tx, 1.1, tz + 0.5], [0.1, 0.19, 0.02], [0.16, 0.22, 0.18]);
    addEnvironment("cone", [tx, 1.62, tz], [0.84, 0.83, 0.84], [0.3, 0.26, 0.48]);
    addEnvironment("cone", [tx, 2.44, tz], [0.06, 0.25, 0.06], [0.74, 0.58, 0.25]);
    // Sasaran latihan di sisi kanan karakter.
    addEnvironment("box", [2.8, 0.19, 2.1], [0.45, 0.2, 0.45], [0.41, 0.37, 0.25]);
    for (const x of [2.48, 3.12]) {
        addEnvironment("box", [x, 0.5, 2.1], [0.055, 0.32, 0.055], [0.44, 0.25, 0.11]);
    }
    addEnvironment("ellipsoid", [2.8, 0.8, 2.1], [0.48, 0.48, 0.1], [0.58, 0.32, 0.12]);
    addEnvironment("ellipsoid", [2.8, 0.8, 2.2], [0.34, 0.34, 0.025], [0.83, 0.69, 0.37]);
    addEnvironment("ellipsoid", [2.8, 0.8, 2.23], [0.16, 0.16, 0.02], [0.65, 0.26, 0.12]);
    // Rumput, kristal, dan bunga kecil.
    for (let i = 0; i < 42; i++) {
        const a = i * 2.39996,
            r = 2.7 + (i % 7) * 0.21,
            x = Math.cos(a) * r,
            z = Math.sin(a) * r * 0.8;
        addEnvironment(
            "cone",
            [x, 0.02, z],
            [0.045, 0.22 + (i % 3) * 0.05, 0.045],
            [0.48, 0.6, 0.23],
            [0, 0, 1],
            Math.sin(i) * 0.3
        );
        if (i % 7 === 0) {
            addEnvironment(
                "ellipsoid",
                [x, 0.25, z],
                [0.055, 0.05, 0.055],
                [0.88, 0.7, 0.36]
            );
        }
    }
    for (let i = 0; i < 4; i++) {
        addEnvironment(
            "cone",
            [-3 + i * 0.22, 0.05, 1.7 + (i % 2) * 0.2],
            [0.14, 0.45 + (i % 2) * 0.25, 0.15],
            [0.38, 0.65, 0.58],
            [0, 0, 1],
            (i - 1) * 0.2
        );
    }
    // Bukit jauh sebagai latar; tidak menutupi siluet karakter.
    for (let i = 0; i < 6; i++) {
        const x = (i - 2.5) * 6,
            z = -13 - (i % 2) * 4;
        addEnvironment("cone", [x, -2.5, z], [3.0, 6 + (i % 3), 3.5], [0.13, 0.25, 0.22]);
    }

    /* ==================== 3. STATUS ANIMASI ==================== */
    const state = {
        time: 0,
        paused: false,
        mode: "story",
        highlight: false,
        wire: false,
        axes: false,
        manualFireUntil: 0
    };

    /* ==================== 4. KAMERA ==================== */
    const camera = {
        yaw: -0.64,
        pitch: 0.16,
        distance: 12.2
    };

    function resetCamera() {
        camera.yaw = -0.64;
        camera.pitch = 0.16;
        camera.distance = 12.2;
    }
    const info = {
        story: "60 detik: bangun, lepas landas, berlatih menyembur api, berputar, lalu mendarat.",
        translate:
            "Matriks translasi mengubah posisi root. Seluruh bagian karakter ikut berpindah.",
        rotate: "Root berputar terhadap sumbu Y. Amati tampilan depan, samping, dan belakang.",
        scale: "Skala seragam pada BodyPivot. Semua bagian anak mengikuti perubahan ukuran.",
        arbitrary:
            "Sayap berputar pada sumbu lokal miring (±0.18, 0.92, 0.34), menggunakan rumus Rodrigues.",
        hierarchy:
            "Root bergerak dan berputar; sayap tetap mengepak relatif terhadap badan. world = parent × local.",
        still: "Pose tanpa gerakan. Putar kamera untuk memeriksa ekor Bézier, sayap, dan rongga mulut."
    };

    /* ==================== 5. TOMBOL DAN PANEL RUBRIK ==================== */
    $("#modeInfo").textContent = info.story;
    $("#play").onclick = () => {
        state.paused = !state.paused;
        $("#play").innerHTML = state.paused
            ? "▶ <span>Putar</span>"
            : "Ⅱ <span>Jeda</span>";
    };
    $("#restart").onclick = () => {
        state.time = 0;
        state.manualFireUntil = 0;
    };
    $("#reset").onclick = resetCamera;
    $("#fire").onclick = () => {
        state.manualFireUntil = state.time + 3;
        if (state.paused) {
            $("#play").click();
        }
    };

    function showInspector(value) {
        $("#inspector").hidden = !value;
        $("#inspect").setAttribute("aria-expanded", String(value));
    }
    $("#inspect").onclick = () => showInspector($("#inspector").hidden);
    $("#closeInspector").onclick = () => showInspector(false);
    $("#mode").onchange = (e) => {
        state.mode = e.target.value;
        state.time = 0;
        state.manualFireUntil = 0;
        $("#modeInfo").textContent = info[state.mode];
    };
    for (const key of ["highlight", "wire", "axes"]) {
        $("#" + key).onchange = (e) => {
            state[key] = e.target.checked;
        };
    }
    const cinema = () => document.body.classList.toggle("cinema");
    $("#cinema").onclick = cinema;
    document.addEventListener("keydown", (e) => {
        if (e.target.matches("input,select,button")) {
            return;
        }
        if (e.code === "KeyH") {
            cinema();
        }
        if (e.code === "Space") {
            e.preventDefault();
            $("#play").click();
        }
        if (e.code === "KeyR") {
            resetCamera();
        }
    });

    /* ==================== 6. INPUT MOUSE: ORBIT DAN ZOOM ==================== */
    let drag = null;
    canvas.addEventListener("pointerdown", (e) => {
        drag = [e.clientX, e.clientY];
        canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
        if (!drag) {
            return;
        }
        camera.yaw -= (e.clientX - drag[0]) * 0.006;
        camera.pitch = Math.max(
            -0.12,
            Math.min(1.15, camera.pitch + (e.clientY - drag[1]) * 0.005)
        );
        drag = [e.clientX, e.clientY];
    });
    const stopDrag = () => (drag = null);
    canvas.addEventListener("pointerup", stopDrag);
    canvas.addEventListener("pointercancel", stopDrag);
    canvas.addEventListener("lostpointercapture", stopDrag);
    canvas.addEventListener(
        "wheel",
        (e) => {
            e.preventDefault();
            camera.distance = Math.max(
                7.8,
                Math.min(23, camera.distance + e.deltaY * 0.009)
            );
        },
        {
            passive: false
        }
    );
    // Partikel api bergerak sepanjang arah lokal moncong, sehingga ikut rotasi kepala.

    /* ==================== 7. PARTIKEL API ==================== */
    function drawFire(t) {
        const origin = dragon.mouthWorld(),
            world = dragon.head.world;
        const forward = V.norm(V.sub(LIBS.point(world, [0, -0.1, 2.35]), origin));
        for (let i = 0; i < 24; i++) {
            const age = (t * 1.1 + i / 24) % 1,
                spread = 0.05 + age * 0.2;
            let p = V.add(origin, V.mul(forward, 0.12 + age * 2.5));
            p[0] += Math.sin(i * 17) * spread;
            p[1] += Math.cos(i * 13) * spread + age * 0.15;
            const size = (0.07 + Math.sin(age * Math.PI) * 0.2) * (1 - age * 0.55);
            renderer.draw(
                "ellipsoid",
                pose(p, [size, size * 0.8, size * 1.4]),
                i % 3 ? [1, 0.31 + age * 0.23, 0.025] : [1, 0.85, 0.2],
                false,
                0.9
            );
        }
    }

    /* ==================== 8. STORYLINE ==================== */
    const chapters = [
        ["01", "Bersiap terbang"],
        ["02", "Menjelajahi lembah"],
        ["03", "Latihan napas api"],
        ["04", "Putaran kemenangan"],
        ["05", "Kembali ke rumah"]
    ];
    let last = performance.now(),
        frames = 0;

    /* ==================== 9. LOOP ANIMASI DAN RENDER ==================== */
    function render(now) {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        if (!state.paused) {
            state.time += dt;
        }
        const anim = dragon.animate(state.time, state.mode),
            aspect = canvas.clientWidth / canvas.clientHeight;
        const target = [0, 1.65, 0],
            d = camera.distance;
        const eye = [
            Math.sin(camera.yaw) * Math.cos(camera.pitch) * d,
            1.65 + Math.sin(camera.pitch) * d,
            Math.cos(camera.yaw) * Math.cos(camera.pitch) * d
        ];
        // Proyeksi mengubah koordinat kamera menjadi tampilan perspektif.
        const projection = LIBS.perspective(0.73, aspect, 0.1, 80);
        // Geser framing agar karakter berada di kanan judul pada layar lebar.
        if (aspect > 1.35) {
            projection[8] = -0.3;
        }
        renderer.begin(
            LIBS.multiply(projection, LIBS.lookAt(eye, target, [0, 1, 0])),
            eye
        );
        for (const e of environment) {
            renderer.draw(e.mesh, e.model, e.color);
        }
        // Bayangan kontak sederhana mengikuti posisi XZ karakter.
        const root = dragon.root.local;
        renderer.draw(
            "ellipsoid",
            pose([root[12], 0.035, root[14]], [1.0, 0.014, 0.72]),
            [0.18, 0.29, 0.12]
        );
        renderer.draw(
            "ellipsoid",
            pose([root[12], 0.047, root[14]], [0.7, 0.012, 0.5]),
            [0.15, 0.25, 0.1]
        );
        // Gambar karakter dari root; setiap anak mengikuti matriks induknya.
        dragon.root.render(renderer, LIBS.identity(), state);
        if (state.axes) {
            dragon.drawAxes(renderer);
        }
        if (anim.fire || state.time < state.manualFireUntil) {
            drawFire(state.time);
        }
        const chapter =
            anim.phase < 10
                ? 0
                : anim.phase < 26
                  ? 1
                  : anim.phase < 40
                    ? 2
                    : anim.phase < 48
                      ? 3
                      : 4;
        $("#chapterNumber").textContent =
            state.mode === "story" ? chapters[chapter][0] : "◎";
        $("#chapter").textContent =
            state.mode === "story"
                ? chapters[chapter][1]
                : $("#mode").selectedOptions[0].textContent.split(" · ")[0];
        $("#progress").style.width = (anim.phase / 60) * 100 + "%";
        frames++;
        window.dragonDebug = {
            state,
            camera,
            dragon,
            renderer,
            frames,
            geometry: Geometry,
            math: LIBS
        };
        requestAnimationFrame(render);
    }
    canvas.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        state.paused = true;
        $("#error").hidden = false;
        $("#error").textContent =
            "Konteks WebGL terputus. Muat ulang halaman untuk melanjutkan.";
    });
    requestAnimationFrame(render);
})();
