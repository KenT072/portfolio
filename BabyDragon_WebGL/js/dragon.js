"use strict";

// Dependensi: libs.js -> geometry.js -> renderer.js -> dragon.js.
// Untuk scene kelompok: buat sekali, lalu panggil update dan render setiap frame.
// const dragon = createBabyDragon(renderer);
// dragon.update(waktuDetik, "hierarchy");
// dragon.render(pose([3, 0, 0], [0.8, 0.8, 0.8]));
// main.js adalah demo mandiri; tidak perlu dimuat di scene kelompok.
function createBabyDragon(renderer) {
    // Proporsi revisi mengikuti referensi: kepala besar, rahang tebal, badan gemuk.

    /* ==================== 1. WARNA ==================== */
    const C = {
        green: [0.29, 0.58, 0.15],
        light: [0.37, 0.68, 0.20],
        dark: [0.18, 0.4, 0.055],
        belly: [0.34, 0.64, 0.12],
        horn: [0.5, 0.27, 0.13],
        claw: [0.47, 0.28, 0.14],
        wing: [0.42, 0.29, 0.09],
        bone: [0.43, 0.21, 0.105],
        mouth: [0.105, 0.025, 0.018],
        tongue: [0.72, 0.34, 0.29],
        white: [0.88, 0.86, 0.68],
        pupil: [0.022, 0.024, 0.012]
    };

    /* ==================== 2. ROOT DAN FUNGSI PEMBUAT BAGIAN ==================== */
    const root = new SceneNode("BabyDragon");
    // Membuat bagian tubuh dan memasangnya ke induk (parent).
    // position dan size masing-masing berisi tiga angka untuk sumbu X, Y, Z.
    function addPart(parent, name, mesh, color, position, size, axis, angle) {
        const localMatrix = pose(position, size, axis, angle);
        const part = new SceneNode(name, mesh, color, localMatrix);
        return parent.add(part);
    }

    /* ==================== 3. BADAN DAN LEHER ==================== */
    const body = root.add(new SceneNode("BodyPivot"));
    addPart(
        body,
        "Torso",
        "ellipsoid",
        C.green,
        [0, -0.1, -0.12],
        [1.02, 1.13, 0.89],
        [1, 0, 0],
        -0.16
    );
    // Tidak ada pelat perut: referensi memiliki perut hijau yang halus.

    addPart(
        body,
        "Neck",
        "ellipsoid",
        C.green,
        [0, 0.68, 0.17],
        [0.84, 0.88, 0.76],
        [1, 0, 0],
        0.1
    );

    /* ==================== 4. KEPALA, MONCONG, DAN RONGGA MULUT ==================== */
    const head = body.add(
        new SceneNode("HeadPivot", null, C.green, LIBS.translate(0, 1.12, 0.4))
    );
    // Campuran halus ellipsoid untuk kulit kepala; mata dan badan tetap ellipsoid murni.
    const ellipsoidDistance = (p, c, r) =>
        (Math.hypot(...p.map((v, i) => (v - c[i]) / r[i])) - 1) * Math.min(...r);
    const smoothUnion = (a, b, k = 0.16) => {
        const h = Math.max(k - Math.abs(a - b), 0) / k;
        return Math.min(a, b) - h * h * k * 0.25;
    };
    const headField = (p) => {
        let d = ellipsoidDistance(p, [0, 0.34, 0], [1.02, 0.80, 0.86]);
        d = smoothUnion(
            d,
            ellipsoidDistance(p, [0, 0.34, 0.94], [1.07, 0.38, 0.72]),
            0.25
        );
        for (const sign of [-1, 1]) {
            d = smoothUnion(
                d,
                ellipsoidDistance(p, [sign * 0.76, -0.08, 0.61], [0.38, 0.51, 0.69]),
                0.2
            );
        }
        const mouth = ellipsoidDistance(p, [0, -0.13, 1.38], [0.88, 0.39, 0.86]);
        // Pengurangan halus menghindari tepi bibir yang bergerigi.
        return -smoothUnion(-d, mouth, 0.065);
    };
    renderer.register(
        "organicHead",
        Geometry.implicit(headField, [-1.3, -0.85, -1], [1.3, 1.3, 1.82], [52, 46, 56])
    );
    addPart(head, "HeadMuzzleCheeks", "organicHead", C.light, [0, 0, 0], [1, 1, 1]);
    // Rongga mulut tetap elliptic paraboloid sejati, di belakang bukaan kulit.
    // z/d = (x/a)^2 + (y/b)^2; a=.86,b=.37,d=.30.
    const cavity = addPart(
        head,
        "Mouth_ELLIPTIC_PARABOLOID",
        "paraboloid",
        C.mouth,
        [0, -0.13, 0.76],
        [0.86, 0.37, 0.3]
    );

    /* ==================== 5. RAHANG DAN LIDAH ==================== */
    const jaw = head.add(
        new SceneNode("JawPivot", null, C.green, LIBS.translate(0, -0.48, 0.92))
    );
    addPart(jaw, "LowerJaw", "ellipsoid", C.green, [0, -0.035, 0.15], [0.94, 0.28, 0.68]);
    // Lidah dibentuk sebagai permukaan Bézier tunggal dengan ujung membulat.
    // Penampang elips membuatnya pipih, bukan tabung silinder yang terpotong.
    const tongueCP = [
        [0.08, 0.17, 0.28],
        [0.18, 0.25, 0.86],
        [0.28, 0.02, 1.12],
        [0.28, -0.34, 1.12]
    ];
    renderer.register(
        "tongue",
        Geometry.surface(
            (u, v) => {
                const c = Geometry.bezier(tongueCP, v),
                    t = V.norm(
                        V.sub(
                            Geometry.bezier(tongueCP, v + 0.001),
                            Geometry.bezier(tongueCP, v - 0.001)
                        )
                    );
                const side = V.norm(V.sub([1, 0, 0], V.mul(t, t[0]))),
                    up = V.norm(V.cross(t, side)),
                    angle = u * Math.PI * 2;
                const cap =
                    v > 0.65 ? Math.sqrt(Math.max(0, 1 - ((v - 0.65) / 0.35) ** 2)) : 1;
                return V.add(
                    c,
                    V.add(
                        V.mul(side, 0.28 * cap * Math.cos(angle)),
                        V.mul(up, 0.125 * cap * Math.sin(angle))
                    )
                );
            },
            40,
            56
        )
    );
    addPart(jaw, "TongueHanging", "tongue", C.tongue, [0, 0, 0], [1, 1, 1]);
    /* ==================== 6. MATA, TANDUK, GIGI, TANGAN, DAN KAKI ==================== */
    for (const sign of [-1, 1]) {
        addPart(
            head,
            "NostrilHole" + sign,
            "ellipsoid",
            [0.045, 0.09, 0.018],
            [sign * 0.51, 0.53, 1.49],
            [0.1, 0.08, 0.021],
            [1, 0, 0],
            -0.28
        );
        const eye = addPart(
            head,
            "EyePivot" + sign,
            null,
            C.green,
            [sign * 0.64, 0.77, 0.63],
            [1, 1, 1],
            [0, 1, 0],
            sign * 0.38
        );
        addPart(
            eye,
            "EyeSocket" + sign,
            "ellipsoid",
            C.green,
            [0, 0, -0.025],
            [0.36, 0.36, 0.245]
        );
        addPart(
            eye,
            "EyeWhite" + sign,
            "ellipsoid",
            C.white,
            [0, 0, 0.14],
            [0.27, 0.275, 0.13]
        );
        addPart(
            eye,
            "Iris" + sign,
            "ellipsoid",
            [0.34, 0.29, 0.1],
            [-sign * 0.025, 0.015, 0.262],
            [0.116, 0.135, 0.026]
        );
        addPart(
            eye,
            "Pupil" + sign,
            "ellipsoid",
            C.pupil,
            [-sign * 0.028, 0.015, 0.289],
            [0.084, 0.106, 0.018]
        );
        addPart(
            eye,
            "EyeGlint" + sign,
            "ellipsoid",
            [1, 0.99, 0.9],
            [-sign * 0.028 - 0.031, 0.059, 0.307],
            [0.031, 0.033, 0.008]
        );
        addPart(
            eye,
            "UpperLid" + sign,
            "ellipsoid",
            C.green,
            [0, 0.255, 0.11],
            [0.275, 0.045, 0.095],
            [0, 0, 1],
            sign * -0.07
        );
        // Tanduk kecil diarahkan ke belakang sesuai referensi.
        addPart(
            head,
            "HornBase" + sign,
            "ellipsoid",
            C.horn,
            [sign * 0.83, 0.73, -0.37],
            [0.18, 0.16, 0.22],
            [1, 0, 0],
            -0.55
        );
        addPart(
            head,
            "Horn" + sign,
            "cone",
            C.horn,
            [sign * 0.86, 0.76, -0.42],
            [0.135, 0.24, 0.135],
            [1, 0, 0],
            -0.75
        );
        for (let i = 0; i < 3; i++) {
            const x = sign * (0.24 + i * 0.26);
            const z = 1.39 - i * 0.06;
            const radius = 0.065;
            // Seluruh lingkaran pangkal harus berada DI DALAM kulit moncong.
            // Bukan hanya titik pusatnya, supaya cakram putih tidak mengambang.
            let baseY = 0.1;
            const baseInside = (y) => {
                for (let j = 0; j < 32; j++) {
                    const angle = j * Math.PI * 2 / 32;
                    if (headField([
                        x + radius * Math.cos(angle), y,
                        z + radius * Math.sin(angle)
                    ]) > -0.025) return false;
                }
                return true;
            };
            while (baseY < 0.55 && !baseInside(baseY)) baseY += 0.005;
            if (!baseInside(baseY)) throw new Error("Pangkal gigi di luar moncong");
            const toothLength = [0.15, 0.12, 0.20][i];
            addPart(
                head, "UpperTooth" + sign + i, "cone", C.white,
                [x, baseY, z], [radius, toothLength, radius],
                [1, 0, 0], Math.PI
            );
        }
        for (let i = 0; i < 2; i++) {
            addPart(
                jaw,
                "LowerTooth" + sign + i,
                "cone",
                C.white,
                [sign * (0.48 + i * 0.23), 0.13, 0.53 - i * 0.12],
                [0.075, 0.15 - i * 0.02, 0.075],
                [0, 0, 1],
                sign * -0.1
            );
        }
        // Lengan pendek dan berisi; tangan menekuk ke depan perut.
        const arm = addPart(
            body,
            "ArmPivot" + sign,
            null,
            C.green,
            [sign * 0.8, 0.42, 0.15],
            [1, 1, 1],
            [0, 0, 1],
            sign * -0.1
        );
        addPart(
            arm,
            "Shoulder" + sign,
            "ellipsoid",
            C.green,
            [sign * 0.08, -0.17, 0.12],
            [0.35, 0.5, 0.37],
            [1, 0, 0],
            -0.2
        );
        addPart(
            arm,
            "Forearm" + sign,
            "ellipsoid",
            C.green,
            [sign * 0.04, -0.43, 0.41],
            [0.37, 0.29, 0.46],
            [0, 1, 0],
            sign * -0.35
        );
        addPart(
            arm,
            "Hand" + sign,
            "ellipsoid",
            C.claw,
            [-sign * 0.09, -0.52, 0.73],
            [0.29, 0.22, 0.26]
        );
        for (let i = 0; i < 3; i++) {
            const x = -sign * 0.09 + (i - 1) * 0.16;
            addPart(
                arm,
                "RoundedFinger" + sign + i,
                "ellipsoid",
                C.claw,
                [x, -0.62, 0.83],
                [0.1, 0.16, 0.13],
                [1, 0, 0],
                -0.2
            );
            addPart(
                arm,
                "FingerClaw" + sign + i,
                "cone",
                [0.56, 0.36, 0.18],
                [x, -0.71, 0.88],
                [0.041, 0.07, 0.04],
                [1, 0, 0],
                1.6
            );
        }
        const leg = addPart(
            body,
            "LegPivot" + sign,
            null,
            C.green,
            [sign * 0.64, -0.81, -0.09],
            [1, 1, 1],
            [0, 0, 1],
            sign * 0.12
        );
        addPart(
            leg,
            "Thigh" + sign,
            "ellipsoid",
            C.green,
            [sign * 0.05, -0.04, 0.08],
            [0.41, 0.51, 0.46]
        );
        addPart(
            leg,
            "Foot" + sign,
            "ellipsoid",
            C.claw,
            [sign * 0.06, -0.38, 0.23],
            [0.31, 0.25, 0.33]
        );
        for (let i = 0; i < 3; i++) {
            const x = sign * 0.06 + (i - 1) * 0.16;
            addPart(
                leg,
                "RoundedToe" + sign + i,
                "ellipsoid",
                C.claw,
                [x, -0.43, 0.43],
                [0.105, 0.16, 0.15]
            );
            addPart(
                leg,
                "ToeClaw" + sign + i,
                "cone",
                [0.56, 0.36, 0.18],
                [x, -0.48, 0.53],
                [0.045, 0.08, 0.045],
                [1, 0, 0],
                Math.PI / 2
            );
        }
    }

    /* ==================== 7. EKOR BEZIER DAN DURI ==================== */
    const tail = body.add(
        new SceneNode("TailPivot", null, C.green, LIBS.translate(0, -0.4, -0.62))
    );
    const tailCP = [
        [0, 0, 0],
        [-0.15, -0.2, -0.98],
        [-0.4, 0.08, -1.85],
        [-0.48, 0.57, -2.12]
    ];
    renderer.register("tailBezier", Geometry.tube(tailCP, 0.44, 0.012, 64, 28));
    addPart(tail, "Tail_BEZIER_3D", "tailBezier", C.green, [0, 0, 0], [1, 1, 1]);
    for (let i = 0; i < 4; i++) {
        const t = 0.24 + i * 0.17,
            p = Geometry.bezier(tailCP, t);
        p[1] += 0.34 * (1 - t);
        addPart(tail, "TailSpineBase" + i, "ellipsoid", C.horn, p, [
            0.11 * (1 - t) + 0.025,
            0.11,
            0.11 * (1 - t) + 0.025
        ]);
        addPart(
            tail,
            "TailSpine" + i,
            "cone",
            C.horn,
            p,
            [0.09 * (1 - t) + 0.025, 0.16 * (1 - t) + 0.04, 0.09 * (1 - t) + 0.025],
            [1, 0, 0],
            -0.4
        );
    }
    for (let i = 0; i < 3; i++) {
        addPart(
            body,
            "BackSpine" + i,
            "cone",
            C.horn,
            [0, 0.86 - i * 0.37, -0.73],
            [0.12, 0.22, 0.13],
            [1, 0, 0],
            -0.95
        );
    }

    /* ==================== 8. SAYAP ==================== */
    const wingShape = Geometry.wing();
    renderer.register("wingMembrane", wingShape.mesh);
    wingShape.curves.forEach((cp, i) =>
        renderer.register(
            "wingEdge" + i,
            Geometry.tube(cp, i < 2 ? 0.105 : 0.045, i < 2 ? 0.095 : 0.04, 32, 14)
        )
    );
    const ribs = [
        [
            [0, 0, 0],
            [0.22, 0.75, 0.04],
            [0.64, 1.18, 0.04],
            [0.86, 1.4, 0]
        ],
        [
            [0.86, 1.4, 0],
            [1.02, 1.11, 0.09],
            [1.16, 0.66, 0.12],
            [1.22, 0.39, 0.12]
        ]
    ];
    ribs.forEach((cp, i) =>
        renderer.register("wingRib" + i, Geometry.tube(cp, 0.065, 0.052, 30, 12))
    );
    const wings = [];
    for (const sign of [-1, 1]) {
        const pivot = body.add(new SceneNode("WingPivot" + sign, null, C.green));
        // Pangkal tertanam di torso. Batang dan selaput mengikuti pivot yang sama.
        addPart(body, "WingShoulder" + sign, "ellipsoid", C.green,
            [sign * 0.58, 0.62, -0.40], [0.27, 0.29, 0.27]);
        const stemName = "wingStem" + sign;
        renderer.register(stemName, Geometry.tube([
            [0, -0.08, 0.02], [sign * 0.06, 0.12, -0.04],
            [sign * 0.12, 0.34, -0.13], [sign * 0.14, 0.49, -0.17]
        ], 0.23, 0.16, 28, 20));
        addPart(pivot, "WingStem" + sign, stemName, C.green,
            [0, 0, 0], [1, 1, 1]);
        const shape = pivot.add(
            new SceneNode(
                "WingMirror" + sign,
                null,
                C.green,
                compose(
                    LIBS.translate(sign * 0.14, 0.48, -0.17),
                    LIBS.rotate([0, 0, 1], -sign * 0.30),
                    LIBS.scale(sign * 0.90, 0.84, 0.86)
                )
            )
        );
        addPart(shape, "WingJoint", "ellipsoid", C.green, [0, 0, 0], [0.16, 0.23, 0.19]);
        addPart(shape, "Membrane", "wingMembrane", C.wing, [0, 0, 0], [1, 1, 1]);
        for (let i = 0; i < 5; i++) {
            addPart(
                shape,
                "CurvedEdge" + i,
                "wingEdge" + i,
                C.bone,
                [0, 0, 0],
                [1, 1, 1]
            );
        }
        for (let i = 0; i < 2; i++) {
            addPart(shape, "WingFinger" + i, "wingRib" + i, C.bone, [0, 0, 0], [1, 1, 1]);
        }
        wings.push({
            pivot,
            sign,
            origin: [sign * 0.58, 0.62, -0.40],
            axis: V.norm([sign * 0.18, 0.92, 0.34])
        });
    }

    /* ==================== 9. ANIMASI DAN TRANSFORMASI ==================== */
    function animate(time, mode = "story") {
        let x = 0,
            y = 1.53,
            z = 0,
            yaw = 0.04,
            roll = 0,
            scale = 1,
            flap = Math.sin(time * 5.7) * 0.44,
            headTurn = Math.sin(time * 0.8) * 0.07;
        const phase = time % 60;
        if (mode === "story") {
            const lift =
                phase < 10
                    ? (1 - Math.cos((phase / 10) * Math.PI)) * 0.5
                    : phase > 48
                      ? (1 + Math.cos(((phase - 48) / 12) * Math.PI)) * 0.5
                      : 1;
            y += lift * 0.95 + Math.sin(time * 2.85) * 0.07 * lift;
            if (phase >= 10 && phase < 26) {
                const t = (phase - 10) / 16;
                x = Math.sin(t * 2 * Math.PI) * 0.85;
                z = -Math.sin(t * Math.PI) * 0.7;
                yaw += Math.sin(t * 2 * Math.PI) * 0.4;
            }
            if (phase >= 26 && phase < 40) {
                yaw += Math.sin(((phase - 26) / 14) * Math.PI) * 0.25;
                headTurn = -0.1;
            }
            if (phase >= 40 && phase < 48) {
                const t = (phase - 40) / 8;
                yaw += t * t * (3 - 2 * t) * 2 * Math.PI;
                roll = Math.sin(t * Math.PI) * 0.12;
            }
            scale = 1 + Math.sin(time * 2) * 0.014;
        } else if (mode === "translate") {
            x = Math.sin(time) * 1.35;
            y += 0.7;
            flap = 0;
            headTurn = 0;
        } else if (mode === "rotate") {
            yaw = time * 0.65;
            flap = 0;
            headTurn = 0;
        } else if (mode === "scale") {
            scale = 0.85 + 0.25 * (0.5 + 0.5 * Math.sin(time * 1.7));
            flap = 0;
            headTurn = 0;
        } else if (mode === "arbitrary") {
            y += 0.65;
            headTurn = 0;
        } else if (mode === "hierarchy") {
            y += 0.8 + Math.sin(time) * 0.25;
            x = Math.sin(time * 0.6) * 0.7;
            yaw = Math.sin(time * 0.7) * 0.8;
        } else {
            flap = 0;
            headTurn = 0;
        }
        // Transformasi root memindahkan seluruh karakter.
        root.local = compose(
            LIBS.translate(x, y, z),
            LIBS.rotate([0, 1, 0], yaw),
            LIBS.rotate([0, 0, 1], roll)
        );
        // Scaling pada badan diwariskan ke kepala, sayap, dan anggota tubuh.
        body.local = LIBS.scale(scale, scale, scale);
        head.local = compose(
            LIBS.translate(0, 1.12, 0.4),
            LIBS.rotate([0, 1, 0], headTurn)
        );
        jaw.local = compose(
            LIBS.translate(0, -0.48, 0.92),
            LIBS.rotate([1, 0, 0], mode === "still" ? 0 : Math.sin(time * 2) * 0.035)
        );
        tail.local = compose(
            LIBS.translate(0, -0.4, -0.62),
            LIBS.rotate([0, 1, 0], mode === "still" ? 0 : Math.sin(time * 2.4) * 0.12)
        );
        for (const wing of wings) {
            wing.pivot.local = compose(
                LIBS.translate(...wing.origin),
                LIBS.rotate(wing.axis, wing.sign * (flap + 0.12))
            );
        }
        return {
            phase,
            fire: mode === "story" && phase > 29 && phase < 37
        };
    }

    /* ==================== 10. VISUALISASI SUMBU SAYAP ==================== */
    function drawAxes(r) {
        for (const wing of wings) {
            const p = wing.origin,
                a = wing.axis,
                cp = [
                    V.sub(p, V.mul(a, 0.8)),
                    V.sub(p, V.mul(a, 0.3)),
                    V.add(p, V.mul(a, 0.3)),
                    V.add(p, V.mul(a, 0.8))
                ];
            const name = "axis" + wing.sign;
            if (!r.meshes[name]) {
                r.register(name, Geometry.tube(cp, 0.022, 0.022, 8, 8));
            }
            r.draw(name, body.world, [0.15, 0.9, 1], false, 1);
        }
    }
    return {
        root,
        body,
        head,
        jaw,
        cavity,
        wings,
        animate,
        // Matriks induk mengatur penempatan karakter di scene kelompok.
        // Panggil renderer.begin(...) sekali untuk seluruh scene sebelum render.
        update: (seconds, mode = "hierarchy") => animate(seconds, mode),
        render: (parentMatrix = LIBS.identity(), options = {}) =>
            root.render(renderer, parentMatrix, options),
        drawAxes,
        mouthWorld: () => LIBS.point(head.world || LIBS.identity(), [0, -0.12, 1.63])
    };
}
