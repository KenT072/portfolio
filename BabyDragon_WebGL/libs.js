/* LIBS dari template praktikum, ditambah operasi matriks untuk proyek Baby Dragon. */

/* ==================== 1. FUNGSI DARI LIBS PRAKTIKUM ==================== */
var LIBS = {
    degToRad: function (angle) {
        return (angle * Math.PI) / 180;
    },

    get_projection: function (angle, aspect, zMin, zMax) {
        var tan = Math.tan(LIBS.degToRad(angle * 0.5));
        var A = -(zMax + zMin) / (zMax - zMin);
        var B = (-2 * zMax * zMin) / (zMax - zMin);

        return [1 / (aspect * tan), 0, 0, 0, 0, 1 / tan, 0, 0, 0, 0, A, -1, 0, 0, B, 0];
    },

    get_I4: function () {
        return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    },

    set_I4: function (m) {
        for (var i = 0; i < 16; i++) {
            m[i] = i % 5 === 0 ? 1 : 0;
        }
    },

    rotateX: function (m, angle) {
        var c = Math.cos(angle);
        var s = Math.sin(angle);

        var a1 = m[1],
            a5 = m[5],
            a9 = m[9];

        m[1] = m[1] * c - m[2] * s;
        m[5] = m[5] * c - m[6] * s;
        m[9] = m[9] * c - m[10] * s;

        m[2] = m[2] * c + a1 * s;
        m[6] = m[6] * c + a5 * s;
        m[10] = m[10] * c + a9 * s;
    },

    rotateY: function (m, angle) {
        var c = Math.cos(angle);
        var s = Math.sin(angle);

        var a0 = m[0],
            a4 = m[4],
            a8 = m[8];

        m[0] = c * m[0] + s * m[2];
        m[4] = c * m[4] + s * m[6];
        m[8] = c * m[8] + s * m[10];

        m[2] = c * m[2] - s * a0;
        m[6] = c * m[6] - s * a4;
        m[10] = c * m[10] - s * a8;
    },

    rotateZ: function (m, angle) {
        var c = Math.cos(angle);
        var s = Math.sin(angle);

        var a0 = m[0],
            a4 = m[4],
            a8 = m[8];

        m[0] = c * m[0] - s * m[1];
        m[4] = c * m[4] - s * m[5];
        m[8] = c * m[8] - s * m[9];

        m[1] = c * m[1] + s * a0;
        m[5] = c * m[5] + s * a4;
        m[9] = c * m[9] + s * a8;
    },

    // Rotasi terhadap sumbu bebas menggunakan rumus Rodrigues.
    // axis = [x, y, z], tidak harus sudah berupa vektor satuan.
    // Hanya bagian 3x3 yang diputar supaya translasi tetap pada tempatnya.
    rotateAxis: function (m, angle, axis) {
        var x = axis[0],
            y = axis[1],
            z = axis[2];
        var length = Math.sqrt(x * x + y * y + z * z);
        if (length < 1e-8) {
            return;
        }
        x /= length;
        y /= length;
        z /= length;

        var c = Math.cos(angle),
            s = Math.sin(angle),
            t = 1 - c;
        var r00 = c + x * x * t,
            r01 = x * y * t - z * s,
            r02 = x * z * t + y * s;
        var r10 = y * x * t + z * s,
            r11 = c + y * y * t,
            r12 = y * z * t - x * s;
        var r20 = z * x * t - y * s,
            r21 = z * y * t + x * s,
            r22 = c + z * z * t;

        // R(axis,angle) x bagian rotasi/skala matriks m.
        for (var col = 0; col < 3; col++) {
            var k = 4 * col;
            var a = m[k],
                b = m[k + 1],
                d = m[k + 2];
            m[k] = r00 * a + r01 * b + r02 * d;
            m[k + 1] = r10 * a + r11 * b + r12 * d;
            m[k + 2] = r20 * a + r21 * b + r22 * d;
        }
    },

    translateX: function (m, t) {
        m[12] += t;
    },

    translateY: function (m, t) {
        m[13] += t;
    },

    translateZ: function (m, t) {
        m[14] += t;
    },

    set_position: function (m, x, y, z) {
        m[12] = x;
        m[13] = y;
        m[14] = z;
    },

    scaleX: function (m, t) {
        m[0] *= t;
    },

    scaleY: function (m, t) {
        m[5] *= t;
    },

    scaleZ: function (m, t) {
        m[10] *= t;
    }
};

/* Fungsi tambahan mengembalikan matriks baru; fungsi template di atas mengubah matriks input. */
/* Matriks column-major untuk WebGL. Tidak memakai pustaka 3D eksternal. */
("use strict");

/* ==================== 2. OPERASI VEKTOR TAMBAHAN ==================== */
const V = {
    add: (a, b) => a.map((v, i) => v + b[i]),
    sub: (a, b) => a.map((v, i) => v - b[i]),
    mul: (a, s) => a.map((v) => v * s),
    dot: (a, b) => a.reduce((s, v, i) => s + v * b[i], 0),
    cross: (a, b) => [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ],
    norm: (a) => {
        const d = Math.hypot(...a) || 1;
        return a.map((v) => v / d);
    }
};

/* ==================== 3. OPERASI MATRIKS TAMBAHAN ==================== */
Object.assign(LIBS, {
    identity: () => LIBS.get_I4(),
    multiply: (a, b) => {
        const c = new Array(16).fill(0);
        for (let j = 0; j < 4; j++) {
            for (let i = 0; i < 4; i++) {
                for (let k = 0; k < 4; k++) {
                    c[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k];
                }
            }
        }
        return c;
    },
    translate: (x = 0, y = 0, z = 0) => {
        const m = LIBS.get_I4();
        LIBS.translateX(m, x);
        LIBS.translateY(m, y);
        LIBS.translateZ(m, z);
        return m;
    },
    scale: (x = 1, y = x, z = x) => {
        const m = LIBS.get_I4();
        LIBS.scaleX(m, x);
        LIBS.scaleY(m, y);
        LIBS.scaleZ(m, z);
        return m;
    },
    // Rumus Rodrigues: rotasi pada vektor sumbu sembarang yang dinormalisasi.
    rotate: (axis, a) => {
        const [x, y, z] = V.norm(axis),
            c = Math.cos(a),
            s = Math.sin(a),
            t = 1 - c;
        return [
            t * x * x + c,
            t * x * y + s * z,
            t * x * z - s * y,
            0,
            t * x * y - s * z,
            t * y * y + c,
            t * y * z + s * x,
            0,
            t * x * z + s * y,
            t * y * z - s * x,
            t * z * z + c,
            0,
            0,
            0,
            0,
            1
        ];
    },
    perspective: (fov, aspect, near, far) => {
        const f = 1 / Math.tan(fov / 2),
            nf = 1 / (near - far);
        return [
            f / aspect,
            0,
            0,
            0,
            0,
            f,
            0,
            0,
            0,
            0,
            (far + near) * nf,
            -1,
            0,
            0,
            2 * far * near * nf,
            0
        ];
    },
    lookAt: (eye, target, up) => {
        const z = V.norm(V.sub(eye, target)),
            x = V.norm(V.cross(up, z)),
            y = V.cross(z, x);
        return [
            x[0],
            y[0],
            z[0],
            0,
            x[1],
            y[1],
            z[1],
            0,
            x[2],
            y[2],
            z[2],
            0,
            -V.dot(x, eye),
            -V.dot(y, eye),
            -V.dot(z, eye),
            1
        ];
    },
    normal: (m) => {
        const a = [m[0], m[1], m[2]],
            b = [m[4], m[5], m[6]],
            c = [m[8], m[9], m[10]],
            bc = V.cross(b, c),
            ca = V.cross(c, a),
            ab = V.cross(a, b),
            d = V.dot(a, bc) || 1;
        return [...bc, ...ca, ...ab].map((x) => x / d);
    },
    point: (m, p) => [
        m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
        m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
        m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]
    ]
});

/* ==================== 4. MENYUSUN TRANSFORMASI OBJEK ==================== */
function compose(...matrices) {
    return matrices.reduce(LIBS.multiply, LIBS.identity());
}

function pose(p = [0, 0, 0], s = [1, 1, 1], axis = [0, 1, 0], a = 0) {
    return compose(LIBS.translate(...p), LIBS.rotate(axis, a), LIBS.scale(...s));
}
