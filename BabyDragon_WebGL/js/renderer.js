"use strict";
class Renderer {
    /* ==================== 1. INISIALISASI WEBGL ==================== */
    constructor(canvas) {
        this.gl = canvas.getContext("webgl", {
            antialias: true,
            alpha: false,
            preserveDrawingBuffer: true
        });
        if (!this.gl) {
            throw new Error(
                "WebGL tidak tersedia. Aktifkan hardware acceleration lalu buka kembali di Chrome/Edge."
            );
        }
        const gl = this.gl;

        /* ==================== 2. VERTEX SHADER ==================== */
        const vertexShaderSource = `
            attribute vec3 aPosition;
            attribute vec3 aNormal;
            uniform mat4 uModel, uVP;
            uniform mat3 uNormal;
            varying vec3 vPosition, vNormal;
            void main() {
                vec4 w = uModel * vec4(aPosition, 1.0);
                vPosition = w.xyz;
                vNormal = normalize(uNormal * aNormal);
                gl_Position = uVP * w;
            }
        `;

        /* ==================== 3. FRAGMENT SHADER ==================== */
        const fragmentShaderSource = `
            precision mediump float;
            varying vec3 vPosition, vNormal;
            uniform vec3 uColor, uEye;
            uniform float uGlow;
            void main() {
                vec3 N = normalize(vNormal), V = normalize(uEye - vPosition);
                if (dot(N, V) < 0.0) N = -N;
                vec3 L = normalize(vec3(-0.65, 1.0, 0.8));
                float diffuse = max(dot(N, L), 0.0);
                float hemi = 0.5 + 0.5 * N.y;
                vec3 ambient = mix(vec3(.22, .27, .20), vec3(.48, .58, .48), hemi);
                float spec = pow(max(dot(N, normalize(L + V)), 0.0), 38.0) * .19;
                float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0) * .17;
                vec3 color = uColor * (ambient + diffuse * vec3(.67, .63, .48)) + vec3(spec) + rim * vec3(.44, .65, .55);
                color = mix(color, uColor, uGlow);
                float fog = smoothstep(17.0, 42.0, length(uEye - vPosition));
                color = mix(color, vec3(.09, .17, .17), fog);
                gl_FragColor = vec4(pow(color, vec3(.90)), 1.0);
            }
        `;

        /* ==================== 4. KOMPILASI DAN LINK PROGRAM SHADER ==================== */
        function shader(type, source) {
            const s = gl.createShader(type);
            gl.shaderSource(s, source);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
                throw new Error(gl.getShaderInfoLog(s));
            }
            return s;
        }
        this.program = gl.createProgram();
        gl.attachShader(this.program, shader(gl.VERTEX_SHADER, vertexShaderSource));
        gl.attachShader(this.program, shader(gl.FRAGMENT_SHADER, fragmentShaderSource));
        gl.linkProgram(this.program);
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            throw new Error(gl.getProgramInfoLog(this.program));
        }
        gl.useProgram(this.program);
        this.locations = {};
        for (const name of ["uModel", "uVP", "uNormal", "uColor", "uEye", "uGlow"]) {
            this.locations[name] = gl.getUniformLocation(this.program, name);
        }
        this.position = gl.getAttribLocation(this.program, "aPosition");
        this.normal = gl.getAttribLocation(this.program, "aNormal");
        gl.enable(gl.DEPTH_TEST);
        gl.clearColor(0.09, 0.17, 0.17, 1);
        this.meshes = {};
        this.register("ellipsoid", Geometry.ellipsoid());
        this.register("cone", Geometry.cone());
        this.register("paraboloid", Geometry.paraboloid());
        this.register("box", Geometry.box());
    }

    /* ==================== 5. MENYIMPAN MESH KE BUFFER GPU ==================== */
    register(name, data) {
        const gl = this.gl;
        if (
            data.p.some((x) => !Number.isFinite(x)) ||
            data.n.some((x) => !Number.isFinite(x))
        ) {
            throw new Error("Mesh tidak valid: " + name);
        }
        const buffer = (type, array) => {
            const b = gl.createBuffer();
            gl.bindBuffer(type, b);
            gl.bufferData(type, array, gl.STATIC_DRAW);
            return b;
        };
        const lines = [];
        for (let i = 0; i < data.ix.length; i += 3) {
            const [a, b, c] = data.ix.slice(i, i + 3);
            lines.push(a, b, b, c, c, a);
        }
        this.meshes[name] = {
            position: buffer(gl.ARRAY_BUFFER, new Float32Array(data.p)),
            normal: buffer(gl.ARRAY_BUFFER, new Float32Array(data.n)),
            indices: buffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data.ix)),
            lines: buffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(lines)),
            count: data.ix.length,
            lineCount: lines.length
        };
        return name;
    }

    /* ==================== 6. PERSIAPAN FRAME ==================== */
    begin(vp, eye) {
        const gl = this.gl,
            c = gl.canvas,
            dpr = Math.min(window.devicePixelRatio || 1, 1.6),
            w = Math.round(c.clientWidth * dpr),
            h = Math.round(c.clientHeight * dpr);
        if (c.width !== w || c.height !== h) {
            c.width = w;
            c.height = h;
        }
        gl.viewport(0, 0, c.width, c.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.uniformMatrix4fv(this.locations.uVP, false, vp);
        gl.uniform3fv(this.locations.uEye, eye);
        this.drawCalls = 0;
    }

    /* ==================== 7. MENGGAMBAR SATU MESH ==================== */
    draw(mesh, model, color, wire = false, glow = 0) {
        const gl = this.gl,
            m = this.meshes[mesh];
        if (!m) {
            return;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, m.position);
        gl.vertexAttribPointer(this.position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.position);
        gl.bindBuffer(gl.ARRAY_BUFFER, m.normal);
        gl.vertexAttribPointer(this.normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.normal);
        gl.uniformMatrix4fv(this.locations.uModel, false, model);
        gl.uniformMatrix3fv(this.locations.uNormal, false, LIBS.normal(model));
        gl.uniform3fv(this.locations.uColor, color);
        gl.uniform1f(this.locations.uGlow, glow);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wire ? m.lines : m.indices);
        gl.drawElements(
            wire ? gl.LINES : gl.TRIANGLES,
            wire ? m.lineCount : m.count,
            gl.UNSIGNED_SHORT,
            0
        );
        this.drawCalls++;
    }
}
// Gerakan anak selalu relatif terhadap parent: world = parentWorld * local.

/* ==================== 8. HIERARKI OBJEK: PARENT DAN CHILD ==================== */
class SceneNode {
    constructor(name, mesh = null, color = [1, 1, 1], local = LIBS.identity()) {
        this.name = name;
        this.mesh = mesh;
        this.color = color;
        this.local = local;
        this.children = [];
        this.visible = true;
    }
    add(child) {
        this.children.push(child);
        return child;
    }
    render(renderer, parent = LIBS.identity(), options = {}) {
        if (!this.visible) {
            return;
        }
        this.world = LIBS.multiply(parent, this.local);
        if (this.mesh) {
            const highlighted = options.highlight && this.mesh === "paraboloid";
            renderer.draw(
                this.mesh,
                this.world,
                highlighted ? [1, 0.36, 0.05] : this.color,
                options.wire,
                highlighted ? 0.5 : 0
            );
        }
        for (const child of this.children) {
            child.render(renderer, this.world, options);
        }
    }
}
