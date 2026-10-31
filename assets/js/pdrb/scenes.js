/* 17 adegan kecil per lapangan usaha. Tiap adegan menempati kotak 1×1 (pusat di 0,0), tinggi ≤ ~1.
   builder(g, h) -> update(t, v): t = detik, v = semangat 0..1 (sektor menyusut berjalan pelan). */
import * as THREE from 'three';

const cache = new Map();
function mat(color, o) {
  const k = color + JSON.stringify(o || {});
  if (!cache.has(k)) cache.set(k, new THREE.MeshLambertMaterial(Object.assign({ color: color }, o || {})));
  return cache.get(k);
}
function own(color, o) { return new THREE.MeshLambertMaterial(Object.assign({ color: color }, o || {})); }
function box(g, w, h, d, c, x, y, z, m) {
  const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m || mat(c));
  me.position.set(x || 0, (y || 0) + h / 2, z || 0); g.add(me); return me;
}
function cyl(g, rt, rb, h, c, x, y, z, seg, m) {
  const me = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 14), m || mat(c));
  me.position.set(x || 0, (y || 0) + h / 2, z || 0); g.add(me); return me;
}
function sph(g, r, c, x, y, z, m) {
  const me = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), m || mat(c));
  me.position.set(x || 0, y || 0, z || 0); g.add(me); return me;
}
function cone(g, r, h, c, x, y, z, seg) {
  const me = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg || 12), mat(c));
  me.position.set(x || 0, (y || 0) + h / 2, z || 0); g.add(me); return me;
}
function sub(g, x, y, z) { const s = new THREE.Group(); s.position.set(x || 0, y || 0, z || 0); g.add(s); return s; }
const tau = Math.PI * 2;
const fr = (x) => x - Math.floor(x);

function tree(g, x, z, s) { cyl(g, .018 * s, .024 * s, .1 * s, '#7a5230', x, 0, z, 6); sph(g, .07 * s, '#3f9d5a', x, .15 * s, z); }

export const SCENES = {
  sawit(g) {
    const palms = [];
    for (let i = 0; i < 9; i++) {
      const x = (i % 3 - 1) * .3, z = (Math.floor(i / 3) - 1) * .3, p = sub(g, x, 0, z);
      cyl(p, .02, .03, .3, '#8a6238', 0, 0, 0, 6);
      for (let k = 0; k < 5; k++) { const l = box(p, .22, .015, .05, '#2f8f4e', 0, .3, 0); l.position.set(Math.cos(k * tau / 5) * .09, .3, Math.sin(k * tau / 5) * .09); l.rotation.y = -k * tau / 5; l.rotation.z = -.25; }
      palms.push(p);
    }
    return (t, v) => palms.forEach((p, i) => { p.rotation.z = Math.sin(t * 1.4 * v + i) * .07; p.rotation.x = Math.cos(t * 1.1 * v + i * 1.7) * .05; });
  },
  tambang(g) {
    cyl(g, .45, .5, .05, '#8b6a45', 0, 0, 0, 20); cyl(g, .34, .4, .05, '#755737', 0, .05, 0, 20); cyl(g, .22, .28, .05, '#5f452b', 0, .1, 0, 20); cyl(g, .12, .16, .03, '#241a12', 0, .15, 0, 20);
    box(g, .1, .05, .06, '#555', .38, .0, -.38); cone(g, .08, .16, '#6b6b6b', -.38, 0, .3, 5);
    const trucks = [0, 1].map((i) => { const t = sub(g, 0, .1, 0); box(t, .12, .05, .07, '#f2b01e', 0, 0, 0); box(t, .05, .06, .07, '#d98e0b', .06, 0, 0); return t; });
    return (t, v) => trucks.forEach((tr, i) => { const a = t * .9 * v + i * Math.PI, r = .38 - ((t * .15 * v + i * .5) % 1) * .2; tr.position.set(Math.cos(a) * r, .06 + (.38 - r) * .3, Math.sin(a) * r); tr.rotation.y = -a; });
  },
  pabrik(g) {
    box(g, .6, .3, .4, '#8892a0', -.1, 0, .1); box(g, .3, .22, .28, '#a7b0bd', .3, 0, -.15);
    for (let i = 0; i < 3; i++) box(g, .16, .06, .4, '#6d7784', -.28 + i * .18, .3, .1);
    cyl(g, .045, .06, .55, '#b86b4a', .22, .0, .25, 10); cyl(g, .04, .055, .45, '#b86b4a', .34, 0, .3, 10);
    const puffs = [];
    for (let i = 0; i < 7; i++) { const m = own('#d3d6db', { transparent: true, opacity: .5 }); const s = sph(g, .06, '#fff', 0, 0, 0, m); puffs.push(s); }
    return (t, v) => puffs.forEach((s, i) => { const p = fr(t * .35 * v + i / 7); s.position.set(.22 + p * .18 + Math.sin(p * 6 + i) * .02, .58 + p * .55, .25); s.scale.setScalar(.6 + p * 1.6); s.material.opacity = .55 * (1 - p); });
  },
  listrik(g) {
    box(g, .7, .03, .7, '#6b7c6a', 0, 0, 0);
    const rotors = [[-.18, -.1, 1], [.2, .15, .75]].map((c) => { const tw = cyl(g, .018, .035, .62 * c[2], '#e8ecef', c[0], 0, c[1], 8); const r = sub(g, c[0], .64 * c[2], c[1] + .03); sph(r, .035, '#d9dde1', 0, 0, 0); for (let k = 0; k < 3; k++) { const b = box(r, .035, .3 * c[2], .01, '#f4f6f8', 0, 0, 0); b.geometry.translate(0, .15 * c[2], 0); b.rotation.z = k * tau / 3; } return r; });
    const py = sub(g, .05, 0, -.3); cyl(py, .01, .02, .45, '#9aa3ad', 0, 0, 0, 6); box(py, .26, .015, .015, '#9aa3ad', 0, .35, 0); box(py, .18, .015, .015, '#9aa3ad', 0, .24, 0);
    const spark = sph(g, .03, '#ffe45e', .05, .5, -.3, own('#ffe45e', { emissive: '#ffd000' }));
    return (t, v) => { rotors.forEach((r, i) => { r.rotation.z = -t * (1.8 + i * .5) * v; }); spark.scale.setScalar(.7 + .5 * Math.abs(Math.sin(t * 5 * v))); };
  },
  air(g) {
    cyl(g, .22, .22, .3, '#7fa6c4', -.2, 0, -.1, 18); cyl(g, .24, .22, .03, '#5e86a6', -.2, .3, -.1, 18); cyl(g, .03, .03, .25, '#5c7080', .15, .3, -.1, 8);
    box(g, .6, .02, .22, '#2c6fa6', .1, 0, .3);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.1, .01, 6, 24), own('#bfe4ff', { transparent: true, opacity: .8 })); ring.rotation.x = Math.PI / 2; ring.position.set(.1, .035, .3); g.add(ring);
    const drops = [0, 1, 2, 3].map(() => sph(g, .022, '#8fd0ff', 0, 0, 0));
    return (t, v) => { drops.forEach((d, i) => { const p = fr(t * .8 * v + i / 4); d.position.set(.15, .55 - p * .5, -.1); d.scale.y = 1.4; }); const p = fr(t * .5 * v); ring.scale.setScalar(.3 + p * 1.5); ring.material.opacity = .8 * (1 - p); };
  },
  crane(g) {
    const slabs = [0, 1, 2, 3, 4].map((i) => box(g, .42, .1, .42, i % 2 ? '#9aa4b2' : '#b6bfcb', -.12, i * .11, .1));
    box(g, .04, .85, .04, '#f2b01e', .25, 0, -.2);
    const jib = sub(g, .25, .85, -.2); box(jib, .8, .03, .04, '#f2b01e', -.2, 0, 0); box(jib, .1, .08, .08, '#555', .3, -.02, 0);
    const hook = sub(jib, -.45, 0, 0); box(hook, .01, .35, .01, '#333', 0, -.35, 0); box(hook, .1, .07, .07, '#e4572e', 0, -.42, 0);
    return (t, v) => { jib.rotation.y = Math.sin(t * .5 * v) * .7; hook.position.x = -.2 - Math.sin(t * .7 * v) * .22; hook.scale.y = .7 + .3 * Math.sin(t * 1.1 * v); slabs.forEach((s, i) => { const k = .75 + .25 * Math.sin(t * .8 * v - i * .5); s.scale.set(1, k, 1); }); };
  },
  toko(g) {
    const cols = ['#e4572e', '#3b9dde', '#f2b01e'];
    for (let i = 0; i < 3; i++) { const x = -.3 + i * .3; box(g, .26, .26, .3, '#e9e4da', x, 0, -.2); box(g, .28, .04, .14, cols[i], x, .22, -.02); box(g, .1, .12, .01, '#8cc7e8', x, .04, -.04); }
    const ppl = [0, 1, 2, 3, 4].map((i) => sph(g, .035, ['#f6c9a4', '#d9a273', '#f6c9a4', '#a66f4a', '#e8b98d'][i], 0, 0, 0));
    return (t, v) => ppl.forEach((p, i) => { p.position.set(Math.sin(t * .5 * v + i * 1.3) * .42, .06 + Math.abs(Math.sin(t * 5 * v + i)) * .025, .22 + (i % 2) * .12); });
  },
  kontainer(g) {
    box(g, .9, .015, .5, '#6e8aa6', 0, 0, .3);
    const c = ['#e4572e', '#3b9dde', '#f2b01e', '#4aa86b', '#b04a8f', '#e4572e'];
    for (let i = 0; i < 6; i++) box(g, .24, .1, .1, c[i], -.28 + (i % 3) * .26, Math.floor(i / 3) * .105, -.3);
    const ship = sub(g, 0, .02, .3); box(ship, .5, .08, .18, '#2b3a4f', 0, 0, 0); box(ship, .12, .12, .12, '#d9dde1', -.15, .08, 0); for (let i = 0; i < 3; i++) box(ship, .1, .08, .12, c[i + 2], .0 + i * .11 - .02, .08, 0);
    const gant = sub(g, 0, 0, -.1); box(gant, .02, .45, .02, '#f2b01e', -.4, 0, 0); box(gant, .02, .45, .02, '#f2b01e', .4, 0, 0); box(gant, .85, .03, .03, '#f2b01e', 0, .45, 0);
    const trol = box(gant, .1, .05, .06, '#555', 0, .4, 0);
    return (t, v) => { ship.position.x = ((t * .06 * v + .5) % 1 - .5) * 1.4; trol.position.x = Math.sin(t * .8 * v) * .35; };
  },
  hotel(g) {
    box(g, .5, .8, .4, '#c9b99d', 0, 0, 0); box(g, .54, .04, .44, '#8a7a5e', 0, .8, 0); box(g, .3, .1, .12, '#e4572e', 0, .0, .26);
    const w = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) { const m = own('#3a4658'); const b = box(g, .07, .08, .01, '#fff', -.17 + c * .115, .12 + r * .13, .205, m); w.push(m); }
    return (t, v) => w.forEach((m, i) => { const on = Math.sin(t * .8 * v + i * 2.4) > .1; m.color.set(on ? '#ffd86b' : '#3a4658'); m.emissive.set(on ? '#7a5a00' : '#000000'); });
  },
  menara(g) {
    cyl(g, .02, .06, .9, '#d9dde1', 0, 0, 0, 6); for (let i = 0; i < 4; i++) box(g, .22 - i * .04, .012, .22 - i * .04, '#9aa3ad', 0, .15 + i * .18, 0);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 6, 0, Math.PI), mat('#fff')); dish.position.set(.05, .6, .0); dish.rotation.y = Math.PI / 2; g.add(dish);
    const rings = [0, 1, 2].map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(.2, .008, 6, 32), own('#4fd1c5', { transparent: true, opacity: .8, emissive: '#2aa59a' })); r.rotation.x = Math.PI / 2; r.position.y = .9; g.add(r); return r; });
    const lamp = sph(g, .03, '#ff4d4d', 0, .93, 0, own('#ff4d4d', { emissive: '#ff0000' }));
    return (t, v) => { rings.forEach((r, i) => { const p = fr(t * .5 * v + i / 3); r.scale.setScalar(.2 + p * 2); r.position.y = .9 - p * .1; r.material.opacity = .8 * (1 - p); }); lamp.scale.setScalar(.6 + .6 * (Math.sin(t * 4 * v) > 0 ? 1 : 0)); };
  },
  bank(g) {
    box(g, .8, .05, .6, '#cfd3d9', 0, 0, 0); box(g, .7, .04, .5, '#e3e6ea', 0, .05, 0);
    for (let i = 0; i < 5; i++) cyl(g, .035, .035, .35, '#f1f3f5', -.28 + i * .14, .09, .15, 12);
    box(g, .7, .05, .5, '#e3e6ea', 0, .44, 0);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(.01, .4, .2, 3), mat('#c7ccd3')); roof.rotation.y = Math.PI / 2; roof.scale.set(1, 1, .7); roof.position.set(0, .59, 0); g.add(roof);
    box(g, .24, .2, .22, '#aab2bd', 0, .09, -.12);
    const coin = cyl(g, .09, .09, .02, '#f5c542', 0, 0, 0, 20, own('#f5c542', { emissive: '#6b5200' })); coin.rotation.x = Math.PI / 2;
    return (t, v) => { coin.position.set(0, .93 + Math.sin(t * 2 * v) * .04, 0); coin.rotation.z = t * 2.2 * v; };
  },
  rumah(g) {
    const cs = ['#e4572e', '#3b9dde', '#4aa86b', '#b04a8f'], lights = [];
    for (let i = 0; i < 4; i++) {
      const x = (i % 2 - .5) * .5, z = (Math.floor(i / 2) - .5) * .5;
      box(g, .3, .2, .28, '#efe6d6', x, 0, z); const r = cone(g, .27, .18, cs[i], x, .2, z, 4); r.rotation.y = Math.PI / 4;
      const m = own('#7a5a2a'); box(g, .07, .1, .01, '#fff', x, 0, z + .145, m); lights.push(m);
      box(g, .06, .06, .01, '#8cc7e8', x + .09, .08, z + .145);
    }
    return (t, v) => lights.forEach((m, i) => { const on = Math.sin(t * .9 * v + i * 1.9) > -.2; m.color.set(on ? '#ffd86b' : '#7a5a2a'); m.emissive.set(on ? '#6b4d00' : '#000'); });
  },
  kantor(g) {
    const hs = [.8, .55, .68], xs = [-.28, .05, .32], els = [];
    hs.forEach((h, i) => { box(g, .24, h, .26, ['#6fa8c9', '#8fb7d1', '#5b93b5'][i], xs[i], 0, (i - 1) * .1); for (let k = 0; k < 6; k++) if (k * .12 < h - .1) box(g, .26, .012, .28, '#dff0fa', xs[i], .08 + k * .12, (i - 1) * .1); els.push(box(g, .05, .07, .02, '#fff', xs[i], 0, (i - 1) * .1 + .14, own('#fff', { emissive: '#aef' }))); });
    return (t, v) => els.forEach((e, i) => { e.position.y = .08 + (.5 + .5 * Math.sin(t * .9 * v + i * 2)) * (hs[i] - .2); });
  },
  pemda(g) {
    box(g, .9, .06, .6, '#d5d0c4', 0, 0, 0); box(g, .7, .3, .36, '#f0ece1', 0, .06, 0);
    for (let i = 0; i < 5; i++) cyl(g, .025, .025, .3, '#fff', -.28 + i * .14, .06, .22, 10);
    box(g, .76, .04, .46, '#c9c3b3', 0, .36, 0); const dome = new THREE.Mesh(new THREE.SphereGeometry(.16, 14, 8, 0, tau, 0, Math.PI / 2), mat('#e4572e')); dome.position.set(0, .4, 0); g.add(dome);
    cyl(g, .008, .008, .5, '#ccc', .42, 0, .2, 5);
    const flag = sub(g, .42, .85, .2); const f1 = box(flag, .2, .06, .01, '#e4572e', .1, 0, 0), f2 = box(flag, .2, .06, .01, '#ffffff', .1, -.06, 0);
    return (t, v) => { flag.rotation.y = Math.sin(t * 3 * v) * .25; flag.scale.x = .9 + .1 * Math.sin(t * 5 * v); };
  },
  sekolah(g) {
    box(g, .7, .3, .28, '#f2d27a', 0, 0, -.2); const r = box(g, .74, .05, .32, '#b3472a', 0, .3, -.2); box(g, .14, .4, .14, '#f2d27a', 0, 0, -.2); cone(g, .12, .12, '#b3472a', 0, .4, -.2, 4);
    box(g, .6, .01, .4, '#8bbf7a', 0, 0, .25);
    const kids = [0, 1, 2, 3].map((i) => sph(g, .035, ['#e4572e', '#3b9dde', '#f5c542', '#4aa86b'][i], 0, 0, 0));
    const bell = sph(g, .03, '#f5c542', .0, .55, -.2);
    return (t, v) => { kids.forEach((k, i) => k.position.set(-.22 + i * .15 + Math.sin(t * v + i) * .06, .045 + Math.abs(Math.sin(t * 4 * v + i * 1.2)) * .09, .25 + Math.cos(t * .8 * v + i) * .08)); bell.rotation.z = Math.sin(t * 6 * v) * .4; };
  },
  rs(g) {
    box(g, .62, .55, .38, '#f4f6f8', -.05, 0, -.1); box(g, .3, .7, .3, '#e9eef2', .22, 0, -.1);
    const m = own('#e03a3a', { emissive: '#400000' }); box(g, .18, .05, .02, '#e03a3a', .22, .5, .06, m); box(g, .05, .18, .02, '#e03a3a', .22, .43, .06, m);
    const amb = sub(g, 0, 0, .33); box(amb, .2, .08, .1, '#fff', 0, .02, 0); box(amb, .06, .06, .1, '#d9dde1', .1, .02, 0); const siren = box(amb, .04, .03, .04, '#f00', 0, .1, 0, own('#f00', { emissive: '#f00' }));
    return (t, v) => { m.emissiveIntensity = .5 + .5 * Math.sin(t * 3 * v); amb.position.x = Math.sin(t * .5 * v) * .4; amb.rotation.y = Math.cos(t * .5 * v) > 0 ? 0 : Math.PI; siren.visible = Math.sin(t * 10 * v) > 0; };
  },
  taman(g) {
    box(g, .95, .015, .7, '#79b58a', 0, 0, 0);
    tree(g, -.38, .25, 1.2); tree(g, -.25, .3, 1); tree(g, .4, .28, 1.1);
    box(g, .1, .12, .1, '#c7ccd3', 0, 0, 0);
    const wheel = sub(g, 0, .44, 0); const ring = new THREE.Mesh(new THREE.TorusGeometry(.32, .012, 6, 32), mat('#e4572e')); wheel.add(ring);
    const gs = [];
    for (let i = 0; i < 8; i++) { const a = i * tau / 8; const sp = box(wheel, .008, .64, .008, '#e8ecef', 0, 0, 0); sp.geometry.translate(0, 0, 0); sp.rotation.z = a; const gd = box(wheel, .07, .06, .06, ['#f5c542', '#3b9dde', '#e4572e', '#4aa86b'][i % 4], 0, 0, 0); gd.userData.a = a; gs.push(gd); }
    return (t, v) => { const rot = t * .5 * v; wheel.rotation.z = rot; gs.forEach((gd) => { const a = gd.userData.a; gd.position.set(Math.cos(a) * 0, 0, 0); gd.position.set(-Math.sin(a) * .32, Math.cos(a) * .32 - .03, 0); gd.rotation.z = -rot; }); };
  },
};
