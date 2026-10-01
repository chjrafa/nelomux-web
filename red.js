/* Líneas y puntos de conexión para las bandas negras (mismo lenguaje que el héroe del sitio).
   Uso: <section data-net="0.55,0.5"> … </section>  (los números son el punto focal en fracción del ancho y alto).
   Con data-net-light usa la paleta para fondo claro (líneas grises y naranjas sobre papel).
   Interactivo sin clic: al pasar el cursor (o el dedo) las líneas se inclinan hacia él, los puntos cercanos se encienden
   y se conectan con el cursor. Respeta prefers-reduced-motion (dibuja un cuadro fijo) y se pausa fuera de pantalla. */
(function () {
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = i => { const x = Math.sin(i * 127.1 + 11.7) * 43758.5453; return x - Math.floor(x) };
  const bez = (a, b, c, d, u) => { const v = 1 - u; return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d };

  function mount(sec) {
    const cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none';
    if (getComputedStyle(sec).position === 'static') sec.style.position = 'relative';
    sec.style.overflow = 'hidden';
    sec.insertBefore(cv, sec.firstChild);
    [...sec.children].forEach(ch => { if (ch !== cv && getComputedStyle(ch).position === 'static') { ch.style.position = 'relative'; ch.style.zIndex = '1' } else if (ch !== cv && !ch.style.zIndex) ch.style.zIndex = '1' });
    const ctx = cv.getContext('2d'); if (!ctx) return;
    const [fx, fy] = (sec.dataset.net || '0.5,0.5').split(',').map(Number);
    const LT = sec.hasAttribute('data-net-light');
    const ink = a => LT ? `rgba(20,22,27,${(a * 1.7).toFixed(3)})` : `rgba(238,240,244,${a.toFixed(3)})`;
    const NODE_BG = LT ? '#f6f5f1' : '#14161b', GLOW = LT ? .55 : 1;
    let W = 0, H = 0, dpr = 1, streams = [], outs = [], on = true;
    const m = { x: 0, y: 0, tx: 0, ty: 0, a: 0, ta: 0 }; // cursor suavizado + intensidad

    function layout() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      const r = sec.getBoundingClientRect(); W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      const n = W < 700 ? 9 : 14;
      streams = []; for (let i = 0; i < n; i++) streams.push({ y0: H * (.06 + .88 * (i + rnd(i) * .6) / n), bend: .25 + rnd(i + 40) * .35, hot: i % 5 === 2, a: .05 + rnd(i + 80) * .08, off: rnd(i + 120), sp: .08 + rnd(i + 160) * .08 });
      outs = []; for (let o = 0; o < 4; o++) outs.push({ y1: H * (.2 + .6 * o / 3), hot: o === 1, off: rnd(o + 300), sp: .12 + rnd(o + 330) * .08 });
      if (!m.x) { m.x = m.tx = W * fx; m.y = m.ty = H * fy }
      if (REDUCE) draw(0);
    }
    const pos = e => { const r = sec.getBoundingClientRect(), p = e.touches ? e.touches[0] : e; m.tx = p.clientX - r.left; m.ty = p.clientY - r.top; m.ta = 1; if (REDUCE) draw(0) };
    sec.addEventListener('pointermove', pos, { passive: true });
    sec.addEventListener('touchmove', pos, { passive: true });
    sec.addEventListener('pointerleave', () => { m.ta = 0 });
    sec.addEventListener('touchend', () => { m.ta = 0 });

    function draw(t) {
      m.x += (m.tx - m.x) * .08; m.y += (m.ty - m.y) * .08; m.a += (m.ta - m.a) * .06;
      // el punto focal se corre un poco hacia el cursor
      const F = { x: W * fx + (m.x - W * fx) * .22 * m.a, y: H * fy + (m.y - H * fy) * .22 * m.a };
      const S = Math.min(W, H);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);

      // 1) campo de líneas finas que se estrechan en el foco y se doblan hacia el cursor
      ctx.lineWidth = 1;
      const nf = 26;
      for (let f = 0; f < nf; f++) {
        const off = (f - (nf - 1) / 2) * H * .045, al = .03 + .045 * (1 - Math.abs(f - (nf - 1) / 2) / (nf / 2));
        ctx.beginPath();
        for (let x = 0; x <= W; x += 14) {
          const d = (x - F.x) / (S * .9), pinch = 1 - .8 * Math.exp(-d * d);
          const dm = (x - m.x) / (S * .35), pull = Math.exp(-dm * dm) * m.a;
          let y = F.y + off * pinch + Math.sin(x * .007 + t * .5 + f * .45) * S * .018 * pinch;
          y += (m.y - y) * .18 * pull;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = f % 6 === 3 ? `rgba(255,91,31,${(al * (LT ? 3.4 : 2.6)).toFixed(3)})` : ink(al);
        ctx.stroke();
      }

      // 2) corrientes desde el borde izquierdo hacia el foco, y salidas hacia la derecha, con nodos
      const nodes = [], pulses = [];
      ctx.lineCap = 'round';
      streams.forEach((s, i) => {
        const q = [0, s.y0, F.x * s.bend, s.y0, F.x - (F.x * .35), F.y, F.x - 18, F.y];
        ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.bezierCurveTo(q[2], q[3], q[4], q[5], q[6], q[7]);
        ctx.strokeStyle = s.hot ? `rgba(255,91,31,${LT ? .5 : .36})` : ink(s.a); ctx.lineWidth = s.hot ? 1.5 : 1; ctx.stroke();
        const un = .42 + rnd(i + 500) * .2; nodes.push({ x: bez(q[0], q[2], q[4], q[6], un), y: bez(q[1], q[3], q[5], q[7], un), hot: s.hot });
        const u = (t * s.sp + s.off) % 1; pulses.push({ x: bez(q[0], q[2], q[4], q[6], u), y: bez(q[1], q[3], q[5], q[7], u), hot: s.hot, u });
      });
      outs.forEach((o, i) => {
        const q = [F.x + 18, F.y, F.x + (W - F.x) * .45, F.y, W - (W - F.x) * .35, o.y1, W, o.y1];
        ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.bezierCurveTo(q[2], q[3], q[4], q[5], q[6], q[7]);
        ctx.strokeStyle = o.hot ? 'rgba(255,91,31,.55)' : ink(.07); ctx.lineWidth = o.hot ? 2.2 : 1; ctx.stroke();
        nodes.push({ x: bez(q[0], q[2], q[4], q[6], .55), y: bez(q[1], q[3], q[5], q[7], .55), hot: o.hot });
        const u = (t * o.sp + o.off) % 1; pulses.push({ x: bez(q[0], q[2], q[4], q[6], u), y: bez(q[1], q[3], q[5], q[7], u), hot: o.hot, u });
      });

      // 3) conexión con el cursor: los 3 nodos más cercanos se unen a él
      if (m.a > .02) {
        const near = nodes.map(n => ({ n, d: Math.hypot(n.x - m.x, n.y - m.y) })).sort((a, b) => a.d - b.d).slice(0, 3);
        ctx.save(); ctx.setLineDash([3, 6]); ctx.lineWidth = 1;
        near.forEach(({ n, d }) => {
          const al = Math.max(0, 1 - d / (S * .6)) * .55 * m.a; if (al <= 0) return; n.lit = al;
          ctx.strokeStyle = `rgba(255,140,90,${al.toFixed(3)})`; ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke();
        });
        ctx.restore();
        ctx.beginPath(); ctx.arc(m.x, m.y, 4, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,170,130,${(.8 * m.a).toFixed(3)})`;
        ctx.shadowColor = 'rgba(255,91,31,.9)'; ctx.shadowBlur = 14; ctx.fill(); ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(m.x, m.y, 14 + 4 * Math.sin(t * 3), 0, Math.PI * 2); ctx.strokeStyle = `rgba(255,91,31,${(.35 * m.a).toFixed(3)})`; ctx.stroke();
      }

      // 4) nodos
      nodes.forEach(n => {
        const lit = n.lit || 0;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.hot ? 3.4 : 2.6, 0, Math.PI * 2);
        ctx.fillStyle = NODE_BG; ctx.fill();
        ctx.lineWidth = 1.4; ctx.strokeStyle = n.hot || lit ? `rgba(255,91,31,${(.7 + .3 * lit).toFixed(3)})` : ink(.2); ctx.stroke();
        if (lit) { ctx.beginPath(); ctx.arc(n.x, n.y, 9 * lit + 3, 0, Math.PI * 2); ctx.strokeStyle = `rgba(255,91,31,${(.4 * lit).toFixed(3)})`; ctx.stroke() }
      });

      // 5) nodo central: anillos y brillo
      const R = Math.max(16, S * .05);
      const g = ctx.createRadialGradient(F.x, F.y, 0, F.x, F.y, R * 4);
      g.addColorStop(0, `rgba(255,91,31,${((.18 + .05 * Math.sin(t * 1.8)) * GLOW).toFixed(3)})`); g.addColorStop(1, 'rgba(255,91,31,0)');
      ctx.fillStyle = g; ctx.fillRect(F.x - R * 4, F.y - R * 4, R * 8, R * 8);
      ctx.save(); ctx.translate(F.x, F.y);
      ctx.rotate(t * .3); ctx.setLineDash([2, 6]); ctx.strokeStyle = 'rgba(255,140,90,.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, R * 1.6, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]); ctx.rotate(-t * .8); ctx.strokeStyle = 'rgba(255,91,31,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R, 0, 1.6); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, R, 3.2, 4.2); ctx.stroke();
      ctx.restore();
      ctx.beginPath(); ctx.arc(F.x, F.y, 5, 0, Math.PI * 2); ctx.fillStyle = '#ff5b1f'; ctx.shadowColor = 'rgba(255,91,31,.9)'; ctx.shadowBlur = 16; ctx.fill(); ctx.shadowBlur = 0;

      // 6) pulsos de luz que viajan por las corrientes (más rápidos cerca del cursor)
      if (!REDUCE) pulses.forEach(p => {
        const a = Math.sin(p.u * Math.PI); ctx.beginPath(); ctx.arc(p.x, p.y, p.hot ? 2.3 : 1.4, 0, Math.PI * 2);
        ctx.fillStyle = LT ? `rgba(255,91,31,${((p.hot ? .95 : .6) * a).toFixed(3)})` : p.hot ? `rgba(255,170,130,${(.9 * a).toFixed(3)})` : `rgba(255,140,90,${(.55 * a).toFixed(3)})`;
        ctx.shadowColor = 'rgba(255,91,31,.9)'; ctx.shadowBlur = (p.hot ? 12 : 6) * GLOW; ctx.fill(); ctx.shadowBlur = 0;
      });
    }

    layout();
    if ('ResizeObserver' in window) new ResizeObserver(layout).observe(sec); else addEventListener('resize', layout);
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { on = es[0].isIntersecting }).observe(sec);
    if (REDUCE) return;
    const t0 = performance.now();
    (function loop(now) { requestAnimationFrame(loop); if (on && !document.hidden) draw((now - t0) / 1000) })(t0);
  }
  const go = () => document.querySelectorAll('[data-net]').forEach(mount);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', go) : go();
})();
