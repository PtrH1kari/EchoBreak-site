const BACKGROUND = "#101010"
const FOREGROUND = "#50FF50"

console.log(rast)
rast.width = 800
rast.height = 800
const ctx = rast.getContext("2d")
console.log(ctx)

function clear() {
    ctx.fillStyle = BACKGROUND
    ctx.fillRect(0, 0, rast.width, rast.height)
}

function point({x, y}) {
    const s = 10
    ctx.fillStyle = FOREGROUND
    ctx.fillRect(x - s/2, y - s/2, s, s)
}

function line(p1, p2) {
    ctx.strokeStyle = FOREGROUND;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
}

function screen(p) {
    return {
        x: (p.x + 1)/2 * rast.width,
        y: (1 - (p.y + 1)/2) * rast.height,
    }
}

function project({x, y, z}) {
    return {
        x: x/z,
        y: y/z,
    }
}

function translate_z({x, y, z}, dz) {
    return {x, y, z: z + dz};
}

function rotate_xz({x, y, z}, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return {
        x: x*c-z*s,
        y,
        z: x*s+z*c,
    };
}

const vs = [
    {x:  0.25, y:  0.25, z:  0.25},
    {x: -0.25, y:  0.25, z:  0.25},
    {x: -0.25, y: -0.25, z:  0.25},
    {x:  0.25, y: -0.25, z:  0.25},

    {x:  0.25, y:  0.25, z: -0.25},
    {x: -0.25, y:  0.25, z: -0.25},
    {x: -0.25, y: -0.25, z: -0.25},
    {x:  0.25, y: -0.25, z: -0.25},
]

const fs = [
    [0, 1, 2, 3],
    [4, 5, 6, 7],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
]

const FPS = 60;
let dz = 1;
let angle = 0;

function frame() {
    const dt = 1/FPS;
    // dz += 1 * dt
    angle += Math.PI*dt;
    clear()
    //for (const v of vs) {
    //    point(screen(project(translate_z(rotate_xz(v, angle), dz))))
    //}
    for (const f of fs) {
        for (let i = 0; i < f.length; ++i) {
            const a = vs[f[i]];
            const b = vs[f[(i+1)%f.length]];
            line(
            screen(project(translate_z(rotate_xz(a, angle), dz))),
            screen(project(translate_z(rotate_xz(b, angle), dz)))
            );

        }
    }
    setTimeout(frame, 1000/FPS);
}

setTimeout(frame, 1000/FPS);
