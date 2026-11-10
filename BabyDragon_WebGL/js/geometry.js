"use strict";
const Geometry = (() => {
    /* ==================== 1. PEMBANGKIT GRID DAN NORMAL ==================== */
    function surface(fn, nu = 48, nv = 24) {
        const p = [],
            n = [],
            ix = [];
        for (let j = 0; j <= nv; j++) {
            for (let i = 0; i <= nu; i++) {
                const u = i / nu,
                    v = j / nv,
                    point = fn(u, v);
                p.push(...point);
                const du = V.sub(fn(u + 0.0001, v), fn(u - 0.0001, v));
                const dv = V.sub(fn(u, v + 0.0001), fn(u, v - 0.0001));
                n.push(...V.norm(V.cross(du, dv)));
            }
        }
        for (let j = 0; j < nv; j++) {
            for (let i = 0; i < nu; i++) {
                const a = j * (nu + 1) + i,
                    b = a + nu + 1;
                ix.push(a, a + 1, b, a + 1, b + 1, b);
            }
        }
        return {
            p,
            n,
            ix
        };
    }

    /* ==================== 2. ELLIPSOID ==================== */
    function ellipsoid() {
        const mesh = surface((u, v) => {
            const a = u * Math.PI * 2,
                b = v * Math.PI;
            return [Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a)];
        });
        mesh.n = mesh.p.slice();
        return mesh;
    }

    /* ==================== 3. CONE ==================== */
    function cone() {
        // Sumbu +Y; x²+z²=(1-y)², 0 <= y <= 1.
        const mesh = surface(
            (u, v) => [
                (1 - v) * Math.cos(u * Math.PI * 2),
                v,
                (1 - v) * Math.sin(u * Math.PI * 2)
            ],
            40,
            8
        );
        mesh.n = [];
        for (let j = 0; j <= 8; j++) {
            for (let i = 0; i <= 40; i++) {
                const a = (i / 40) * Math.PI * 2;
                mesh.n.push(...V.norm([Math.cos(a), 1, Math.sin(a)]));
            }
        }
        const center = mesh.p.length / 3;
        mesh.p.push(0, 0, 0);
        mesh.n.push(0, -1, 0);
        for (let i = 0; i <= 40; i++) {
            const a = (i / 40) * Math.PI * 2;
            mesh.p.push(Math.cos(a), 0, Math.sin(a));
            mesh.n.push(0, -1, 0);
            if (i < 40) {
                mesh.ix.push(center, center + i + 2, center + i + 1);
            }
        }
        return mesh;
    }
    // Bentuk paraboloid sesungguhnya: z = x² + y², disk parameter r <= 1.
    // Pusat berada lebih dalam daripada tepi ketika dilihat dari arah +Z.

    /* ==================== 4. ELLIPTIC PARABOLOID ==================== */
    function paraboloid() {
        const mesh = surface(
            (u, v) => {
                const a = u * 2 * Math.PI;
                return [v * Math.cos(a), v * Math.sin(a), v * v];
            },
            64,
            20
        );
        mesh.n = [];
        for (let i = 0; i < mesh.p.length; i += 3) {
            mesh.n.push(...V.norm([-2 * mesh.p[i], -2 * mesh.p[i + 1], 1]));
        }
        return mesh;
    }

    /* ==================== 5. KURVA BEZIER KUBIK ==================== */
    function bezier(cp, t) {
        const s = 1 - t;
        return [0, 1, 2].map(
            (i) =>
                s * s * s * cp[0][i] +
                3 * s * s * t * cp[1][i] +
                3 * s * t * t * cp[2][i] +
                t * t * t * cp[3][i]
        );
    }

    /* ==================== 6. MESH BERKETEBALAN DI SEPANJANG KURVA ==================== */
    function tube(cp, r0 = 0.1, r1 = 0.02, steps = 42, sides = 12) {
        return surface(
            (u, v) => {
                const c = bezier(cp, v),
                    t = V.norm(V.sub(bezier(cp, v + 0.001), bezier(cp, v - 0.001)));
                const ref = Math.abs(t[1]) > 0.92 ? [1, 0, 0] : [0, 1, 0],
                    b = V.norm(V.cross(t, ref)),
                    n = V.cross(b, t),
                    a = u * Math.PI * 2;
                const r = r0 * (1 - v) + r1 * v;
                return V.add(
                    c,
                    V.add(V.mul(b, r * Math.cos(a)), V.mul(n, r * Math.sin(a)))
                );
            },
            sides,
            steps
        );
    }
    // Sayap: satu kipas mesh mengikuti beberapa segmen Bézier melengkung.

    /* ==================== 7. SELAPUT SAYAP ==================== */
    function wing() {
        const curves = [
            [
                [0, 0, 0],
                [0.25, 0.75, -0.03],
                [0.45, 1.32, -0.03],
                [0.86, 1.4, 0]
            ],
            [
                [0.86, 1.4, 0],
                [1.39, 1.69, 0],
                [2.0, 1.36, 0.01],
                [2.18, 1.1, 0.02]
            ],
            [
                [2.18, 1.1, 0.02],
                [1.79, 1.16, 0.06],
                [1.43, 0.94, 0.1],
                [1.22, 0.39, 0.12]
            ],
            [
                [1.22, 0.39, 0.12],
                [1.02, 0.47, 0.12],
                [0.64, 0.61, 0.1],
                [0.55, 0.32, 0.09]
            ],
            [
                [0.55, 0.32, 0.09],
                [0.35, 0.31, 0.06],
                [0.14, 0.15, 0.03],
                [0, 0, 0]
            ]
        ];
        // Pusat kipas berada di bagian dalam kontur sayap.
        const p = [0.82, 0.89, 0.1],
            n = [0, 0, 1],
            ix = [];
        for (const cp of curves) {
            for (let i = 0; i < 24; i++) {
                p.push(...bezier(cp, i / 24));
                n.push(0, 0, 1);
            }
        }
        const count = p.length / 3 - 1;
        for (let i = 0; i < count; i++) {
            ix.push(0, i + 1, ((i + 1) % count) + 1);
        }
        return {
            mesh: {
                p,
                n,
                ix
            },
            curves
        };
    }

    // Polygonisasi permukaan implisit dengan marching tetrahedra.
    // Dipakai untuk menyatukan kepala-moncong-pipi tanpa sambungan bola yang tegas.

    /* ==================== 8. PERMUKAAN IMPLISIT KEPALA ==================== */
    function implicit(field, min, max, steps = [40, 36, 44]) {
        const [nx, ny, nz] = steps,
            positions = [],
            values = [],
            p = [],
            n = [],
            ix = [],
            edges = new Map();
        const id = (i, j, k) => (k * (ny + 1) + j) * (nx + 1) + i;
        for (let k = 0; k <= nz; k++) {
            for (let j = 0; j <= ny; j++) {
                for (let i = 0; i <= nx; i++) {
                    const point = [
                        min[0] + (i / nx) * (max[0] - min[0]),
                        min[1] + (j / ny) * (max[1] - min[1]),
                        min[2] + (k / nz) * (max[2] - min[2])
                    ];
                    positions.push(point);
                    values.push(field(point));
                }
            }
        }

        function vertex(a, b) {
            const key = a < b ? a + ":" + b : b + ":" + a;
            if (edges.has(key)) {
                return edges.get(key);
            }
            const t = values[a] / (values[a] - values[b]),
                q = positions[a].map((v, j) => v + (positions[b][j] - v) * t),
                e = 0.001;
            const normal = V.norm(
                [0, 1, 2].map((j) => {
                    const lo = q.slice(),
                        hi = q.slice();
                    lo[j] -= e;
                    hi[j] += e;
                    return field(hi) - field(lo);
                })
            );
            const index = p.length / 3;
            p.push(...q);
            n.push(...normal);
            edges.set(key, index);
            return index;
        }
        const tetra = [
            [0, 5, 1, 6],
            [0, 1, 2, 6],
            [0, 2, 3, 6],
            [0, 3, 7, 6],
            [0, 7, 4, 6],
            [0, 4, 5, 6]
        ];
        for (let k = 0; k < nz; k++) {
            for (let j = 0; j < ny; j++) {
                for (let i = 0; i < nx; i++) {
                    const cube = [
                        id(i, j, k),
                        id(i + 1, j, k),
                        id(i + 1, j + 1, k),
                        id(i, j + 1, k),
                        id(i, j, k + 1),
                        id(i + 1, j, k + 1),
                        id(i + 1, j + 1, k + 1),
                        id(i, j + 1, k + 1)
                    ];
                    if (
                        cube.every((a) => values[a] >= 0) ||
                        cube.every((a) => values[a] < 0)
                    ) {
                        continue;
                    }
                    for (const t of tetra) {
                        const inside = t.map((a) => cube[a]).filter((a) => values[a] < 0),
                            outside = t.map((a) => cube[a]).filter((a) => values[a] >= 0);
                        if (inside.length === 1 || inside.length === 3) {
                            const a = inside.length === 1 ? inside[0] : outside[0],
                                list = inside.length === 1 ? outside : inside;
                            ix.push(...list.map((b) => vertex(a, b)));
                        } else if (inside.length === 2) {
                            const [a, b] = inside,
                                [c, d] = outside,
                                ac = vertex(a, c),
                                ad = vertex(a, d),
                                bc = vertex(b, c),
                                bd = vertex(b, d);
                            ix.push(ac, ad, bc, ad, bd, bc);
                        }
                    }
                }
            }
        }
        if (p.length / 3 > 65535) {
            throw new Error("Mesh implisit melewati batas indeks WebGL1.");
        }
        return {
            p,
            n,
            ix
        };
    }

    /* ==================== 9. BALOK LINGKUNGAN ==================== */
    function box() {
        const p = [],
            n = [],
            ix = [];
        const faces = [
            [
                [1, 0, 0],
                [
                    [1, -1, -1],
                    [1, 1, -1],
                    [1, 1, 1],
                    [1, -1, 1]
                ]
            ],
            [
                [-1, 0, 0],
                [
                    [-1, -1, 1],
                    [-1, 1, 1],
                    [-1, 1, -1],
                    [-1, -1, -1]
                ]
            ],
            [
                [0, 1, 0],
                [
                    [-1, 1, -1],
                    [-1, 1, 1],
                    [1, 1, 1],
                    [1, 1, -1]
                ]
            ],
            [
                [0, -1, 0],
                [
                    [-1, -1, 1],
                    [-1, -1, -1],
                    [1, -1, -1],
                    [1, -1, 1]
                ]
            ],
            [
                [0, 0, 1],
                [
                    [-1, -1, 1],
                    [1, -1, 1],
                    [1, 1, 1],
                    [-1, 1, 1]
                ]
            ],
            [
                [0, 0, -1],
                [
                    [1, -1, -1],
                    [-1, -1, -1],
                    [-1, 1, -1],
                    [1, 1, -1]
                ]
            ]
        ];
        for (const [normal, points] of faces) {
            const base = p.length / 3;
            for (const point of points) {
                p.push(...point);
                n.push(...normal);
            }
            ix.push(base, base + 1, base + 2, base, base + 2, base + 3);
        }
        return {
            p,
            n,
            ix
        };
    }
    return {
        surface,
        ellipsoid,
        cone,
        paraboloid,
        bezier,
        tube,
        wing,
        box,
        implicit
    };
})();
