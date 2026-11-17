/* juego.js — Lógica y dibujo del juego. Los números de balance están en datos.js.
   Estructura:
     1. Preparación (camino, guardado)
     2. Estado de la partida (G)
     3. Reglas: torres, sinergias, enemigos, oleadas
     4. Simulación (avanzar)
     5. Dibujo con Phaser
     6. Interfaz HTML (HUD, panel, pantallas)                                  */
(function () {
  'use strict';

  // ───────────────────────── SONIDO Y MÚSICA ─────────────────────────
  // Todo se genera por código con Web Audio (sin archivos). Los efectos se "pintan" una vez en buffers al
  // iniciar el audio; la música es un secuenciador que programa notas un poco antes de que suenen.
  // El navegador solo deja sonar audio después de un toque del jugador: SON.iniciar() se llama en el primer toque.
  const SON = (() => {
    let ctx = null, gMaster, gMus, gSfx, capas = {}, bufs = {}, ultimo = {}, ruido = null;
    const cfg = { musica: true, efectos: true };
    // Separación mínima (s) entre dos sonidos del mismo tipo, para que 20 torres no saturen
    const PAUSA = { bala: 0.06, muerte: 0.05, explosion: 0.07, plasma: 0.09, rayo: 0.09, misil: 0.08, hielo: 0.25, mina: 0.08 };
    const VOL = { bala: 0.22, plasma: 0.35, misil: 0.3, explosion: 0.45, rayo: 0.3, muerte: 0.25, hielo: 0.3, combo: 0.5, berserk: 0.5,
      fusion: 0.7, jefe: 0.5, oleada: 0.45, limpia: 0.45, vida: 0.5, construir: 0.5, mejorar: 0.4, vender: 0.4, victoria: 0.6, derrota: 0.6, mina: 0.3, grande: 0.7 };
    const tau = Math.PI * 2, R = () => Math.random() * 2 - 1, saw = ph => 2 * ((ph / tau) % 1) - 1;
    const midi = n => 440 * Math.pow(2, (n - 69) / 12);

    function pintar(dur, fn) {
      const sr = ctx.sampleRate, n = Math.floor(sr * dur), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
      const st = { lp: 0, ph: 0, ph2: 0 };
      for (let i = 0; i < n; i++) d[i] = Math.max(-1, Math.min(1, fn(i / sr, st, sr)));
      return b;
    }
    function crearEfectos() {
      bufs.bala = pintar(0.07, (t, s) => { s.lp += (R() - s.lp) * 0.5; return (s.lp * 0.7 + Math.sin(tau * 170 * t) * 0.5) * Math.exp(-t * 65); });
      bufs.plasma = pintar(0.32, (t, s, sr) => { s.ph += tau * (850 * Math.exp(-t * 7) + 170) / sr; return (Math.sin(s.ph) * 0.8 + Math.sin(s.ph * 2.01) * 0.25) * Math.exp(-t * 7) * Math.min(1, t * 200); });
      bufs.misil = pintar(0.4, (t, s, sr) => { s.lp += (R() - s.lp) * (0.05 + t * 0.4); s.ph += tau * (260 + 500 * t) / sr; return (s.lp * 1.6 + Math.sin(s.ph) * 0.2) * Math.min(1, t * 25) * Math.exp(-t * 4); });
      bufs.explosion = pintar(0.8, (t, s, sr) => { s.lp += (R() - s.lp) * 0.07; s.ph += tau * (40 + 70 * Math.exp(-t * 5)) / sr; return (s.lp * 2.6 * Math.exp(-t * 4.5) + Math.sin(s.ph) * 0.9 * Math.exp(-t * 6)); });
      bufs.grande = pintar(1.6, (t, s, sr) => { s.lp += (R() - s.lp) * 0.05; s.ph += tau * (30 + 60 * Math.exp(-t * 3)) / sr; return (s.lp * 3 * Math.exp(-t * 2.2) + Math.sin(s.ph) * Math.exp(-t * 2.8)); });
      bufs.mina = pintar(0.45, (t, s, sr) => { s.lp += (R() - s.lp) * 0.12; s.ph += tau * (60 + 90 * Math.exp(-t * 9)) / sr; return (s.lp * 2 * Math.exp(-t * 8) + Math.sin(s.ph) * 0.8 * Math.exp(-t * 9)); });
      let gate = 1;
      bufs.rayo = pintar(0.24, (t, s) => { if (Math.random() < 0.02) gate = Math.random() < 0.6 ? 1 : 0.15; return (R() * gate * 0.8 + Math.sin(tau * 2300 * t) * 0.15) * Math.exp(-t * 11); });
      bufs.muerte = pintar(0.15, (t, s, sr) => { s.ph += tau * (520 - 1400 * t) / sr; return (Math.sign(Math.sin(s.ph)) * 0.35 + R() * 0.25) * Math.exp(-t * 28); });
      bufs.hielo = pintar(0.55, t => ([1480, 1975, 2637].reduce((a, f, k) => a + Math.sin(tau * f * t) * (k === 0 ? 0.45 : 0.25), 0)) * (0.7 + 0.3 * Math.sin(tau * 18 * t)) * Math.exp(-t * 5) * Math.min(1, t * 80));
      bufs.combo = pintar(0.6, (t, s, sr) => { const sub = 1 + t * 0.5; return [587, 740, 880].reduce((a, f) => a + Math.sin(tau * f * sub * t) * 0.3, 0) * Math.min(1, t * 60) * Math.exp(-t * 4); });
      bufs.berserk = pintar(0.75, (t, s, sr) => { s.ph += tau * 110 / sr; s.ph2 += tau * 165 / sr; return Math.tanh(3 * (saw(s.ph) + saw(s.ph2) * 0.8)) * 0.55 * Math.exp(-t * 3.2) * Math.min(1, t * 90); });
      bufs.fusion = pintar(1.6, (t, s, sr) => {
        s.lp += (R() - s.lp) * Math.min(0.9, 0.02 + t * 0.5);
        const riser = t < 1 ? s.lp * t * 1.4 : 0;
        s.ph += tau * (t < 1 ? 200 + 600 * t : 45 + 80 * Math.exp(-(t - 1) * 6)) / sr;
        const boom = t >= 1 ? Math.sin(s.ph) * Math.exp(-(t - 1) * 4) + s.lp * 1.5 * Math.exp(-(t - 1) * 5) : Math.sin(s.ph) * 0.15 * t;
        return riser + boom;
      });
      bufs.jefe = pintar(1.4, (t, s, sr) => { s.ph += tau * ((Math.floor(t / 0.3) % 2) ? 330 : 440) / sr; return Math.tanh(2 * Math.sin(s.ph)) * 0.45 * Math.min(1, t * 30) * (t > 1.2 ? (1.4 - t) * 5 : 1); });
      bufs.oleada = pintar(0.8, (t, s, sr) => [38, 45, 50].reduce((a, n, k) => a + saw(tau * midi(n) * t * (1 + k * 0.002)) * 0.22, 0) * Math.min(1, t * 15) * Math.exp(-t * 2.8));
      bufs.limpia = pintar(0.5, t => Math.sin(tau * (t < 0.18 ? 880 : 1175) * t) * 0.6 * Math.exp(-((t < 0.18 ? t : t - 0.18)) * 9) * Math.min(1, t * 200));
      bufs.vida = pintar(0.38, t => Math.sign(Math.sin(tau * 110 * t)) * 0.4 * ((Math.floor(t / 0.09) % 2) ? 0.3 : 1) * Math.exp(-t * 3));
      bufs.construir = pintar(0.18, (t, s, sr) => { s.ph += tau * (160 - 500 * t) / sr; return Math.sin(s.ph) * 0.8 * Math.exp(-t * 18) + R() * 0.3 * Math.exp(-t * 90); });
      bufs.mejorar = pintar(0.2, (t, s, sr) => { s.ph += tau * (600 + 3000 * t) / sr; return Math.sin(s.ph) * 0.6 * Math.exp(-t * 14) * Math.min(1, t * 300); });
      bufs.vender = pintar(0.28, t => Math.sin(tau * (t < 0.1 ? 1050 : 790) * t) * 0.5 * Math.exp(-((t < 0.1 ? t : t - 0.1)) * 14));
      bufs.victoria = pintar(2.2, t => {
        const notas = [74, 78, 81, 86], i = Math.min(3, Math.floor(t / 0.18));
        let v = 0;
        for (let k = 0; k <= i; k++) v += Math.sin(tau * midi(notas[k]) * t) * 0.18 * Math.exp(-(t - k * 0.18) * (k === 3 ? 1.2 : 2.5));
        return v * Math.min(1, t * 100);
      });
      bufs.derrota = pintar(2.2, t => { const notas = [62, 60, 58, 57], i = Math.min(3, Math.floor(t / 0.42)); return (Math.sin(tau * midi(notas[i]) * t) * 0.4 + saw(tau * midi(notas[i] - 12) * t) * 0.12) * Math.exp(-(t - i * 0.42) * 1.8) * (t > 1.9 ? (2.2 - t) * 3.3 : 1); });
      ruido = pintar(0.25, () => R());
    }

    function iniciar() {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { ctx = new AC(); } catch (e) { return; }
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      gMaster = ctx.createGain(); gMaster.gain.value = 0.75;
      gMaster.connect(comp); comp.connect(ctx.destination);
      gMus = ctx.createGain(); gMus.connect(gMaster);
      gSfx = ctx.createGain(); gSfx.connect(gMaster);
      for (const k of ['pad', 'bajo', 'arp', 'bateria']) { capas[k] = ctx.createGain(); capas[k].gain.value = 0; capas[k].connect(gMus); }
      filtroPad = ctx.createBiquadFilter(); filtroPad.type = 'lowpass'; filtroPad.frequency.value = 900; filtroPad.connect(capas.pad);
      crearEfectos();
      aplicarCfg();
      siguientePaso = ctx.currentTime + 0.1;
      fijarIntensidad(0);
      setInterval(programar, 60);
    }
    function aplicarCfg() {
      if (!ctx) return;
      gMus.gain.setTargetAtTime(cfg.musica ? 0.32 : 0, ctx.currentTime, 0.15);
      gSfx.gain.setTargetAtTime(cfg.efectos ? 0.6 : 0, ctx.currentTime, 0.05);
    }
    function sfx(nombre, vol) {
      if (!ctx || !cfg.efectos || !bufs[nombre] || ctx.state !== 'running') return;
      const ahora = ctx.currentTime;
      if (PAUSA[nombre] && ahora - (ultimo[nombre] || 0) < PAUSA[nombre]) return;
      ultimo[nombre] = ahora;
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = bufs[nombre];
      src.playbackRate.value = 0.92 + Math.random() * 0.16;   // un poco de variación
      g.gain.value = (VOL[nombre] || 0.4) * (vol == null ? 1 : vol);
      src.connect(g); g.connect(gSfx);
      src.start();
    }

    // ── Música: re menor, Dm – Bb – F – C (dos compases cada acorde), 92 pulsos por minuto ──
    let filtroPad = null, siguientePaso = 0, paso = 0, intensidad = -1, zumbido = null;   // -1: aún sin mezcla
    const SEMI = 60 / 92 / 4;   // duración de una semicorchea
    const ACORDES = [
      { bajo: 38, pad: [62, 65, 69] }, { bajo: 34, pad: [58, 62, 65] },
      { bajo: 41, pad: [60, 65, 69] }, { bajo: 36, pad: [60, 64, 67] }
    ];
    // Volumen de cada capa según la intensidad: 0 menú, 1 entre oleadas, 2 combate, 3 jefe
    const MEZCLA = [
      { pad: 0.85, bajo: 0.12, arp: 0.16, bateria: 0 },
      { pad: 0.6, bajo: 0.25, arp: 0.18, bateria: 0 },
      { pad: 0.32, bajo: 0.38, arp: 0.22, bateria: 0.38 },
      { pad: 0.28, bajo: 0.48, arp: 0.28, bateria: 0.5 }
    ];
    function fijarIntensidad(n) {
      if (!ctx || n === intensidad) return;
      intensidad = n;
      const m = MEZCLA[n];
      for (const k in m) capas[k].gain.setTargetAtTime(m[k], ctx.currentTime, 1.2);
      filtroPad.frequency.setTargetAtTime(n >= 2 ? 1500 : 800, ctx.currentTime, 1.5);
    }
    function nota(destino, tipo, freq, t, dur, vol, ataque) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = tipo; o.frequency.value = freq;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + (ataque || 0.01));
      g.gain.setTargetAtTime(0, t + dur * 0.6, dur * 0.25);
      o.connect(g); g.connect(destino);
      o.start(t); o.stop(t + dur + 0.6);
    }
    function golpe(t, vol, tipo) {
      if (tipo === 'bombo') {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        o.connect(g); g.connect(capas.bateria); o.start(t); o.stop(t + 0.3);
        return;
      }
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = ruido; f.type = tipo === 'caja' ? 'bandpass' : 'highpass'; f.frequency.value = tipo === 'caja' ? 1800 : 7000;
      const dur = tipo === 'caja' ? 0.16 : 0.05;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f); f.connect(g); g.connect(capas.bateria); src.start(t); src.stop(t + dur + 0.02);
    }
    function programar() {
      if (!ctx || ctx.state !== 'running') return;
      const m = MEZCLA[Math.max(0, intensidad)];
      while (siguientePaso < ctx.currentTime + 0.25) {
        const t = siguientePaso, s = paso % 16, ac = ACORDES[Math.floor(paso / 32) % 4];
        if (cfg.musica) {
          if (paso % 32 === 0) for (const n of ac.pad) {   // colchón: dos sierras desafinadas por nota
            nota(filtroPad, 'sawtooth', midi(n), t, SEMI * 32, 0.09, 0.8);
            nota(filtroPad, 'sawtooth', midi(n) * 1.004, t, SEMI * 32, 0.09, 0.8);
          }
          if (m.bajo > 0.01 && s % 2 === 0) nota(capas.bajo, 'triangle', midi(ac.bajo + (s === 6 || s === 14 ? 12 : 0)), t, SEMI * 1.6, 0.5);
          const patron = [0, 1, 2, 1, 2, 0, 1, 2], arpOn = intensidad === 0 ? s % 4 === 0 : true;
          if (m.arp > 0.01 && arpOn) nota(capas.arp, 'square', midi(ac.pad[patron[s % 8]] + 12), t, SEMI * 0.9, 0.12);
          if (m.bateria > 0.01) {
            if (s === 0 || s === 8 || (intensidad === 3 && (s === 4 || s === 12)) || s === 10) golpe(t, 0.9, 'bombo');
            if (s === 4 || s === 12) golpe(t, 0.5, 'caja');
            if (s % 2 === 0 || intensidad === 3) golpe(t, s % 4 === 2 ? 0.25 : 0.15, 'platillo');
          }
        }
        paso++;
        siguientePaso += SEMI;
      }
    }

    // Zumbido continuo mientras haya algún láser disparando
    function laser(activo) {
      if (!ctx) return;
      if (!zumbido) {
        const o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = 98; o2.type = 'sawtooth'; o2.frequency.value = 196.8;
        f.type = 'lowpass'; f.frequency.value = 1200; g.gain.value = 0;
        o.connect(f); o2.connect(f); f.connect(g); g.connect(gSfx);
        o.start(); o2.start();
        zumbido = g;
      }
      zumbido.gain.setTargetAtTime(activo && cfg.efectos ? 0.06 : 0, ctx.currentTime, 0.08);
    }
    function suspender(si) { if (ctx) { if (si) ctx.suspend(); else ctx.resume(); } }
    return { cfg, iniciar, aplicarCfg, sfx, fijarIntensidad, laser, suspender, activo: () => !!ctx };
  })();


  // ───────────────────────── 1. PREPARACIÓN ─────────────────────────
  const D = DATOS;
  const C = D.celda, W = D.cols * C, H = D.filas * C;
  // Factor de nitidez: el lienzo se dibuja a más resolución en pantallas de alta densidad,
  // con tope de 1,5 millones de píxeles para no cargar de más a los teléfonos.
  const ESC = Math.max(1, Math.min(3, Math.ceil(window.devicePixelRatio || 1), Math.floor(Math.sqrt(1.5e6 / (W * H)) * 2) / 2));
  const $ = id => document.getElementById(id);
  // Nitidez de los textos del mapa. En modo compatible (canvas 2D) Phaser los agranda si se sube la resolución.
  const resTxt = m => (escena && escena.sys.game.renderer.type === Phaser.CANVAS) ? 1 : ESC * (m || 1);
  const cr = n => Math.floor(n).toLocaleString('es-CL');
  const dec = n => String(Math.round(n * 100) / 100).replace('.', ',');

  // Torres combo: su precio es factorPrecio × lo que valen las tres torres de su receta con todas sus mejoras
  const valorMax = tipo => {
    const d = D.torres[tipo];
    let v = d.costo;
    for (const id in d.atributos) for (const n of d.atributos[id].niveles) v += n.costo;
    return v;
  };
  for (const f of D.fusiones || []) {
    const d = D.torres[f.torre];
    d.receta = f.entre;
    d.costo = Math.round(D.fusion.factorPrecio * f.entre.reduce((s, x) => s + valorMax(x), 0) / 10) * 10;
    f.nombre = d.nombre;
  }

  // Escenario en juego. cargarMapa() lo cambia: recalcula el camino y repinta el fondo.
  let mapaId = null, MAPA = null, TOTAL_OLEADAS = 0;
  // Modo de juego: 'campana' (número fijo de oleadas, con jefe final) o 'infinito' (hasta perder)
  let modo = 'campana';
  function fijarTotal() { TOTAL_OLEADAS = modo === 'infinito' ? Infinity : (MAPA.totalOleadas || MAPA.oleadas.length); }
  // RUTAS: un recorrido por cada entrada (todas terminan en la base). PUNTOS/TRAMOS/LARGO son los de la primera.
  // TODOS: los tramos de todas las rutas (para dibujar el camino y no construir encima).
  let RUTAS = [], TODOS = [], PUNTOS = [], TRAMOS = [], LARGO = 0, CAMINO = new Set();
  let AIRE = null;   // ruta recta de los enemigos aéreos, de la entrada a la base
  function cargarMapa(id) {
    if (!D.mapas[id]) id = Object.keys(D.mapas)[0];
    mapaId = id; MAPA = D.mapas[id]; fijarTotal();
    // Caminos: uno o varios ("caminos" en datos.js). Puntos en px, tramos con su largo acumulado y celdas ocupadas
    CAMINO = new Set();
    RUTAS = (MAPA.caminos || [MAPA.camino]).map(cam => {
      const puntos = cam.map(([c, r]) => ({ x: c * C + C / 2, y: r * C + C / 2 }));
      const tramos = [];
      let largo = 0;
      for (let i = 0; i < puntos.length - 1; i++) {
        const a = puntos[i], b = puntos[i + 1];
        const l = Math.hypot(b.x - a.x, b.y - a.y);
        tramos.push({ a, b, l, ini: largo });
        largo += l;
      }
      for (let i = 0; i < cam.length - 1; i++) {
        let [c, r] = cam[i];
        const [c2, r2] = cam[i + 1];
        const dc = Math.sign(c2 - c), dr = Math.sign(r2 - r);
        for (;;) {
          CAMINO.add(c + ',' + r);
          if (c === c2 && r === r2) break;
          c += dc; r += dr;
        }
      }
      return { puntos, tramos, largo };
    });
    PUNTOS = RUTAS[0].puntos; TRAMOS = RUTAS[0].tramos; LARGO = RUTAS[0].largo;
    TODOS = RUTAS.flatMap(R => R.tramos);
    const a = PUNTOS[0], b = PUNTOS[PUNTOS.length - 1];
    AIRE = { a, b, l: Math.hypot(b.x - a.x, b.y - a.y), ang: Math.atan2(b.y - a.y, b.x - a.x) };
    if (escena) { pintarMapa(); zoomInicial(); }
  }
  // Posición y recorrido total de un enemigo: los aéreos vuelan en línea recta, el resto sigue el camino
  // (solo vuelan recto los aéreos marcados con rutaRecta en datos.js; hoy ninguno)
  const recto = def => !!(def.aereo && def.rutaRecta);
  const largoDe = e => recto(e.def) ? AIRE.l : RUTAS[e.ruta || 0].largo;
  function posDe(e) {
    if (!recto(e.def)) return posEn(e.dist, e.ruta);
    const k = Math.min(1, e.dist / AIRE.l);
    return { x: AIRE.a.x + (AIRE.b.x - AIRE.a.x) * k, y: AIRE.a.y + (AIRE.b.y - AIRE.a.y) * k };
  }
  function posEn(d, ruta) {
    const R = RUTAS[ruta || 0];
    for (const t of R.tramos) {
      if (d <= t.ini + t.l) {
        const k = Math.max(0, (d - t.ini) / t.l);
        return { x: t.a.x + (t.b.x - t.a.x) * k, y: t.a.y + (t.b.y - t.a.y) * k };
      }
    }
    const u = R.puntos[R.puntos.length - 1];
    return { x: u.x, y: u.y };
  }

  // Guardado entre partidas (queda en el teléfono / navegador)
  const CLAVE = 'td_guardado_v1';
  function cargarGuardado() {
    const base = { bajasTotales: 0, victorias: 0, mejorVidas: 0, partidas: 0, completados: {}, mejor: {}, mapa: null, modo: 'campana', recordInfinito: {}, desbloqueadas: {} };
    let g = base;
    try { g = Object.assign(base, JSON.parse(localStorage.getItem(CLAVE) || '{}')); } catch (e) { /* sin guardado */ }
    // Quien ganó antes de que existieran varios escenarios tiene completado el primero
    if (g.victorias > 0 && !g.completados.desierto) { g.completados.desierto = true; g.mejor.desierto = g.mejorVidas; }
    return g;
  }
  // ── Partida en curso: se guarda sola cada vez que el campo queda limpio (al terminar una oleada) ──
  const CLAVE_PARTIDA = 'td_partida_v1';
  function guardarPartida() {
    if (G.fase !== 'jugando' || G.oleada === 0) return;
    const p = {
      v: 1, mapa: mapaId, modo, creditos: G.creditos, vidas: G.vidas, oleada: G.oleada, bajas: G.bajas,
      torres: G.torres.map(t => ({ tipo: t.tipo, x: t.x, y: t.y, niv: t.niv, invertido: t.invertido, prioridad: t.prioridad })),
      minas: G.minas.map(m => ({ x: m.x, y: m.y, i: G.torres.indexOf(m.torre), dano: m.dano, radio: m.radio, aturde: m.aturde })).filter(m => m.i >= 0),
      fecha: Date.now()
    };
    try { localStorage.setItem(CLAVE_PARTIDA, JSON.stringify(p)); } catch (e) { /* sin almacenamiento */ }
  }
  function leerPartida() {
    try {
      const p = JSON.parse(localStorage.getItem(CLAVE_PARTIDA) || 'null');
      return p && p.v === 1 && D.mapas[p.mapa] ? p : null;
    } catch (e) { return null; }
  }
  function borrarPartida() { try { localStorage.removeItem(CLAVE_PARTIDA); } catch (e) { /* nada */ } }
  function continuarPartida(p) {
    modo = p.modo === 'infinito' ? 'infinito' : 'campana';
    cargarMapa(p.mapa);
    fijarTotal();
    G.fase = 'jugando';
    G.creditos = p.creditos; G.vidas = p.vidas; G.oleada = p.oleada; G.bajas = p.bajas || 0;
    G.generando = false; G.salidas = []; G.bonoPend = {}; G.rutaSig = 0; G.pendientes = {};
    G.enemigos = []; G.efectos = []; G.proyectiles = []; G.enlaces = []; G.minas = [];
    G.pausa = true; G.tipoSel = null; G.puntoSel = null; G.torreSel = null; G.moviendo = null; G.t = 0;
    G.torres = [];
    for (const q of p.torres) {
      if (!D.torres[q.tipo]) continue;
      const t = { tipo: q.tipo, x: q.x, y: q.y, niv: q.niv || {}, nivel: 0, invertido: q.invertido, prioridad: q.prioridad || 'primero', enfria: 0, ang: -Math.PI / 2, tCong: 0, sin: [] };
      calcular(t);
      G.torres.push(t);
    }
    for (const m of p.minas || []) {
      const t = G.torres[m.i];
      if (t) G.minas.push({ x: m.x, y: m.y, torre: t, dano: m.dano, radio: m.radio, aturde: m.aturde || 0, t0: 0 });
    }
    recalcularSinergias();
    G.enCuenta = true; G.cuenta = D.oleada.esperaSeg;
    G.guardado.mapa = mapaId; G.guardado.modo = modo;
    limpiarFlotantes();
    refrescarTodo();
    aviso('Partida recuperada: oleada ' + G.oleada + '. Toca ▶ para seguir');
  }

  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(G.guardado)); } catch (e) { /* sin almacenamiento: se juega igual */ }
  }

  // ───────────────────────── 2. ESTADO ─────────────────────────
  const G = {
    fase: 'menu',            // menu | jugando | victoria | derrota
    creditos: 0, vidas: 0,
    oleada: 0,               // oleadas lanzadas hasta ahora
    generando: false,        // todavía están saliendo enemigos de la oleada actual
    cola: [], tOleada: 0,
    cuenta: 0, enCuenta: false,
    pendientes: {},          // enemigos que faltan por resolver en cada oleada
    torres: [], enemigos: [], efectos: [], proyectiles: [], minas: [],
    vel: 1, pausa: false,
    tipoSel: null, puntoSel: null, torreSel: null, moviendo: null,
    bajas: 0, t: 0,
    guardado: cargarGuardado()
  };

  function nuevaPartida() {
    borrarPartida();
    G.fase = 'jugando';
    G.creditos = D.inicio.creditos;
    G.vidas = D.inicio.vidas;
    G.oleada = 0; G.generando = false; G.salidas = []; G.bonoPend = {}; G.rutaSig = 0;
    G.cuenta = 0; G.enCuenta = false; G.pendientes = {};
    G.torres = []; G.enemigos = []; G.efectos = []; G.proyectiles = []; G.enlaces = []; G.minas = [];
    G.pausa = false; G.tipoSel = null; G.puntoSel = null; G.torreSel = null; G.moviendo = null;
    G.bajas = 0; G.t = 0;
    G.guardado.partidas++;
    guardar();
    limpiarFlotantes();
    refrescarTodo();
    if (RUTAS.length > 1) aviso('Atención: los enemigos llegan por ' + RUTAS.length + ' entradas');
  }

  // ───────────────────────── 3. REGLAS ─────────────────────────
  const NO_STAT = { atributos: 1, nombre: 1, corto: 1, costo: 1, desc: 1, nota: 1, combo: 1, receta: 1 };

  // Valores de una torre: base + los niveles comprados de cada atributo. niv = { atributo: nivel }
  function statsDe(tipo, niv) {
    const def = D.torres[tipo], s = {};
    for (const k in def) if (!NO_STAT[k]) s[k] = def[k];
    for (const id in def.atributos) {
      const n = (niv && niv[id]) || 0;
      for (let i = 0; i < n; i++) {
        const m = def.atributos[id].niveles[i];
        for (const k in m) if (!NO_STAT[k]) s[k] = m[k];
      }
    }
    return s;
  }
  // Valores finales: atributos + bonos permanentes de los combos que tiene la torre
  function statsTorre(tipo, niv, sin) {
    const s = statsDe(tipo, niv);
    for (const id of sin || []) {
      const sg = D.sinergias.find(x => x.id === id);
      if (sg.bono && sg.para === tipo && s[sg.bono.stat] != null) s[sg.bono.stat] = Math.round(s[sg.bono.stat] * sg.bono.mult * 1000) / 1000;
    }
    return s;
  }
  function calcular(t) {
    t.s = statsTorre(t.tipo, t.niv, t.sin);
    t.nivel = 0;
    for (const id in t.niv) t.nivel += t.niv[id];   // total de mejoras compradas (sube el daño de los combos)
    // Modo berserk: todas las mejoras compradas
    t.berserk = !!D.torres[t.tipo].berserk && t.nivel >= maxMejoras(t.tipo);
    if (t.bCarga == null) t.bCarga = 0;
  }

  // ── Colocación libre: las torres van en cualquier punto del campo ──
  const COLOC = D.colocacion, MEDIA = COLOC.tamTorre / 2;
  // Torre que está bajo el punto (x, y), si hay alguna
  function torreEn(x, y) {
    let mejor = null, md = Infinity;
    for (const t of G.torres) {
      const dx = Math.abs(x - t.x), dy = Math.abs(y - t.y);
      if (dx <= MEDIA + 2 && dy <= MEDIA + 2 && dx + dy < md) { md = dx + dy; mejor = t; }
    }
    return mejor;
  }
  // ¿Cabe una torre con centro en (x, y)? No puede salirse del campo, pisar el camino, la base ni otra torre
  function puedeConstruir(x, y) {
    if (x < MEDIA || y < MEDIA || x > W - MEDIA || y > H - MEDIA) return false;
    for (const t of TODOS) if (distSegmento(x, y, t.a.x, t.a.y, t.b.x, t.b.y) < COLOC.claroCamino) return false;
    const fin = PUNTOS[PUNTOS.length - 1];
    if (x > W - 24 - MEDIA && Math.abs(y - fin.y) < 24 + MEDIA) return false;
    for (const t of G.torres) if (t !== G.moviendo && Math.abs(x - t.x) < COLOC.tamTorre && Math.abs(y - t.y) < COLOC.tamTorre) return false;
    return true;
  }
  // Al mover, la propia torre no estorba
  function ajustarMover(x, y) { return ajustar(x, y); }
  // Si el punto tocado no sirve, busca el lugar válido más cercano (hasta 30 px)
  function ajustar(x, y) {
    x = Math.max(MEDIA, Math.min(W - MEDIA, x)); y = Math.max(MEDIA, Math.min(H - MEDIA, y));
    if (puedeConstruir(x, y)) return { x, y, ok: true };
    for (let r = 2; r <= 30; r += 2) {
      for (let i = 0; i < 24; i++) {
        const a = i * Math.PI / 12, nx = x + Math.cos(a) * r, ny = y + Math.sin(a) * r;
        if (puedeConstruir(nx, ny)) return { x: nx, y: ny, ok: true };
      }
    }
    return { x, y, ok: false };
  }
  // Dos torres forman combo si sus centros están a distCombo px o menos
  const contiguas = (a, b) => a !== b && Math.hypot(a.x - b.x, a.y - b.y) <= COLOC.distCombo;
  function sinergiaDe(tipoA, tipoB) {
    return D.sinergias.filter(sg =>
      (sg.entre[0] === tipoA && sg.entre[1] === tipoB) || (sg.entre[0] === tipoB && sg.entre[1] === tipoA));
  }

  // Arma los enlaces entre torres contiguas. Cada enlace tiene su combo y su barra de carga (0 a 1).
  function recalcularSinergias() {
    const previas = {};
    for (const en of G.enlaces || []) previas[en.clave] = en.carga;
    for (const t of G.torres) { t.sin = []; t.nEnl = 0; }
    G.enlaces = [];
    for (let i = 0; i < G.torres.length; i++) {
      for (let j = i + 1; j < G.torres.length; j++) {
        const a = G.torres[i], b = G.torres[j];
        if (!contiguas(a, b)) continue;
        for (const sg of sinergiaDe(a.tipo, b.tipo)) {
          for (const t of [a, b]) {
            if (t.tipo === sg.para && !t.sin.includes(sg.id)) t.sin.push(sg.id);
          }
          const clave = a.x + ',' + a.y + '|' + b.x + ',' + b.y + '|' + sg.id;
          G.enlaces.push({ a, b, torres: [a, b], sg, clave, carga: previas[clave] || 0, tDisparo: -9 });
          a.nEnl++; b.nEnl++;
        }
      }
    }
    // Tríos: tres torres pegadas entre sí (en triángulo) cuyos tipos son la receta de una torre combo
    const n = G.torres.length;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = G.torres[i], b = G.torres[j];
      if (!contiguas(a, b)) continue;
      for (let k = j + 1; k < n; k++) {
        const c = G.torres[k];
        if (!contiguas(a, c) || !contiguas(b, c)) continue;
        for (const sg of trioDe(a.tipo, b.tipo, c.tipo)) {
          const clave = [a, b, c].map(t => t.x + ',' + t.y).join('|') + '|' + sg.id;
          G.enlaces.push({ a, b, torres: [a, b, c], trio: true, sg, clave, carga: previas[clave] || 0, tDisparo: -9 });
        }
      }
    }
    for (const t of G.torres) calcular(t);   // los bonos dependen de las vecinas
  }
  // Fusiones cuya receta es este trío de tipos (sin importar el orden)
  const firma = tipos => tipos.slice().sort().join('+');
  function trioDe(ta, tb, tc) {
    const f = firma([ta, tb, tc]);
    return (D.fusiones || []).filter(sg => firma(sg.entre) === f);
  }
  // Una torre combo está desbloqueada si ya se fusionó alguna vez (o si datos.js abre todo para pruebas)
  const desbloqueada = tipo => !!(D.desbloquearTodo || (G.guardado.desbloqueadas || {})[tipo]);
  // El trío está listo para fusionar cuando las tres torres tienen todas sus mejoras
  const listoFusion = en => en.torres.every(t => t.nivel >= maxMejoras(t.tipo));
  function fusionar(en) {
    const f = en.sg, def = D.torres[f.torre];
    if (!en.trio || !listoFusion(en) || G.creditos < def.costo || en.torres.some(t => !G.torres.includes(t))) return false;
    G.creditos -= def.costo;
    SON.sfx('fusion');
    const x = Math.round(en.torres.reduce((s, t) => s + t.x, 0) / 3), y = Math.round(en.torres.reduce((s, t) => s + t.y, 0) / 3);
    for (const t of en.torres) {
      G.torres.splice(G.torres.indexOf(t), 1);
      G.minas = G.minas.filter(m => m.torre !== t);
    }
    const nueva = { tipo: f.torre, x, y, niv: {}, nivel: 0, invertido: def.costo, prioridad: 'primero', enfria: 0, ang: -Math.PI / 2, tCong: 0, sin: [] };
    calcular(nueva);
    G.torres.push(nueva);
    recalcularSinergias();
    G.torreSel = nueva;
    G.efectos.push({ k: 'estallido', x, y, r: 46, t: 0, dur: 0.8, color: 0xff7ad9 });
    cartel(x, y - 28, def.nombre, '#ffe0f6', '#5a0d48');
    if (!(G.guardado.desbloqueadas || {})[f.torre]) {
      G.guardado.desbloqueadas = G.guardado.desbloqueadas || {};
      G.guardado.desbloqueadas[f.torre] = true;
      guardar();
      aviso(def.nombre + ' desbloqueada: en las próximas partidas puedes construirla directo (★)');
      armarBotonesTorre();
    }
    return true;
  }

  // Qué combos se activarían si se construye "tipo" en el punto (x, y)
  function sinergiasPrevistas(tipo, x, y) {
    const nombres = new Set();
    for (const t of G.torres) {
      if (t === G.moviendo || !contiguas({ x, y }, t)) continue;
      for (const sg of sinergiaDe(tipo, t.tipo)) nombres.add(sg.nombre + ' (' + sg.combo.texto + ')');
      for (const u of G.torres) {
        if (u === t || u === G.moviendo || !contiguas({ x, y }, u) || !contiguas(t, u)) continue;
        for (const sg of trioDe(tipo, t.tipo, u.tipo)) nombres.add('trío para fusionar en ' + sg.nombre);
      }
    }
    return [...nombres];
  }

  function construir(tipo, x, y) {
    const def = D.torres[tipo];
    x = Math.round(x); y = Math.round(y);
    if (!def || !puedeConstruir(x, y) || G.creditos < def.costo) return null;
    if (def.combo && !desbloqueada(tipo)) return null;
    G.creditos -= def.costo;
    SON.sfx('construir');
    const t = {
      tipo, x, y,
      niv: {}, nivel: 0, invertido: def.costo, prioridad: 'primero',
      enfria: 0, ang: -Math.PI / 2, tCong: 0, sin: []
    };
    calcular(t);
    G.torres.push(t);
    recalcularSinergias();
    const nuevos = G.enlaces.filter(en => en.torres.includes(t) && !en.trio);
    const trios = G.enlaces.filter(en => en.torres.includes(t) && en.trio);
    if (trios.length) aviso('Trío armado: mejora las tres al máximo para fusionarlas en ' + trios[0].sg.nombre);
    else if (nuevos.length) aviso('Combo activo: ' + [...new Set(nuevos.map(en => en.sg.nombre))].join(' + '));
    return t;
  }

  // Cada atributo (daño, cadencia, alcance...) se mejora por separado
  function mejoraSiguiente(t, id) {
    const at = D.torres[t.tipo].atributos[id];
    return (at && at.niveles[t.niv[id] || 0]) || null;
  }
  function mejorar(t, id) {
    const m = mejoraSiguiente(t, id);
    if (!m || G.creditos < m.costo) return false;
    G.creditos -= m.costo;
    SON.sfx('mejorar');
    t.invertido += m.costo;
    t.niv[id] = (t.niv[id] || 0) + 1;
    const antes = t.berserk;
    calcular(t);
    for (const en of G.enlaces) {
      if (en.trio && en.torres.includes(t) && listoFusion(en)) { aviso('¡Fusión disponible: ' + en.sg.nombre + '! Toca una de las tres torres'); break; }
    }
    if (t.berserk && !antes) { t.bCarga = 0; t.tBerserk = G.t; aviso('¡Modo berserk! ' + D.torres[t.tipo].nombre + ': ' + D.torres[t.tipo].berserk.nombre); }
    return true;
  }
  function maxMejoras(tipo) {
    let n = 0;
    for (const id in D.torres[tipo].atributos) n += D.torres[tipo].atributos[id].niveles.length;
    return n;
  }

  const valorVenta = t => Math.floor(t.invertido * D.venta);
  function vender(t) {
    const i = G.torres.indexOf(t);
    if (i < 0) return false;
    G.creditos += valorVenta(t);
    SON.sfx('vender');
    G.torres.splice(i, 1);
    G.minas = G.minas.filter(m => m.torre !== t);   // sus minas se retiran con ella
    if (G.torreSel === t) G.torreSel = null;
    recalcularSinergias();
    return true;
  }

  // Mover una torre: cuesta mover.factor de lo invertido en ella. Mantiene mejoras; sus combos se recalculan.
  const precioMover = t => Math.ceil(t.invertido * D.mover.factor);
  function moverTorre(t, x, y) {
    x = Math.round(x); y = Math.round(y);
    const p = precioMover(t);
    if (!G.torres.includes(t) || G.creditos < p) return false;
    G.moviendo = t;   // para que puedeConstruir no choque con la propia torre
    const ok = puedeConstruir(x, y);
    G.moviendo = null;
    if (!ok) return false;
    G.creditos -= p;
    SON.sfx('construir');
    t.x = x; t.y = y; t.pm = null;   // la minadora vuelve a calcular dónde sembrar
    recalcularSinergias();
    aviso(D.torres[t.tipo].nombre + ' movida · −' + cr(p) + 'cr');
    return true;
  }

  function cambiarPrioridad(t) {
    const ks = Object.keys(D.prioridades);
    t.prioridad = ks[(ks.indexOf(t.prioridad) + 1) % ks.length];
  }

  // Oleadas
  // Oleadas en juego: las que todavía tienen enemigos por salir o vivos
  const enJuego = () => Object.keys(G.pendientes).filter(k => G.pendientes[k] > 0).length;
  // Bono por adelantar. Sin oleadas en juego: segundos de cuenta regresiva ahorrados (se paga al llamar).
  // Con k oleadas en juego: k × bonoPorEnJuego, que se paga al limpiar la oleada llamada.
  function bonoAdelanto() {
    if (G.oleada === 0) return 0;
    const k = enJuego();
    return k ? k * D.oleada.bonoPorEnJuego : Math.ceil(G.cuenta) * D.oleada.bonoAdelantoPorSeg;
  }
  function puedeIniciar() {
    return G.fase === 'jugando' && G.oleada < TOTAL_OLEADAS && enJuego() < D.oleada.maxEnJuego;
  }
  // Enemigos de la oleada n. Las primeras vienen escritas en datos.js; las demás se generan con una
  // pauta fija que crece con el número de oleada (bloque "generador" de datos.js).
  function gruposDe(n) {
    const lista = MAPA.oleadas[n - 1];
    const final = modo !== 'infinito' && n === TOTAL_OLEADAS;
    if (lista && (!final || lista.some(q => q.tipo === 'jefeFinal'))) return lista;
    return generarOleada(n, final);
  }
  function generarOleada(n, final) {
    const gen = D.generador, tipos = MAPA.enemigosGenerados || ['soldado', 'blindado'];
    const hay = t => tipos.includes(t);
    const g = Math.max(0.4, 1 + gen.crecimiento * (n - gen.base));   // cuánto más numerosa que la oleada "base"
    const R = x => Math.max(1, Math.round(x * g)), raiz = Math.sqrt(g);
    const rapido = hay('corredor') ? 'corredor' : 'soldado';
    const out = [];
    if (n % gen.jefeCada === 0) {
      // Oleada de jefe: escolta y uno o más jefes (en infinito se suma un jefe cada jefeExtraCada oleadas)
      const cuantos = final ? 1 : 1 + Math.max(0, Math.floor((n - gen.base) / gen.jefeExtraCada));
      out.push({ tipo: 'soldado', n: R(20), cada: 0.45, desde: 0 }, { tipo: 'blindado', n: R(12), cada: 1.2, desde: 3 },
        { tipo: final ? 'jefeFinal' : 'jefe', n: cuantos, cada: 6, desde: 8 });
      if (hay('corredor')) out.push({ tipo: 'corredor', n: R(12), cada: 0.4, desde: 11 });
      if (hay('dron')) out.push({ tipo: 'dron', n: R(12), cada: 0.5, desde: 12 });
      return out;
    }
    switch (n % 5) {
      case 1:   // enjambre de soldados
        out.push({ tipo: 'soldado', n: R(30), cada: Math.max(0.2, 0.34 / raiz), desde: 0 });
        if (hay('dron')) out.push({ tipo: 'dron', n: R(10), cada: 0.6, desde: 3 });
        break;
      case 2:   // columna blindada con apoyo
        out.push({ tipo: 'blindado', n: R(16), cada: Math.max(0.55, 1.1 / raiz), desde: 0 }, { tipo: rapido, n: R(14), cada: 0.45, desde: 3 });
        break;
      case 3:   // ataque rápido
        out.push({ tipo: rapido, n: R(22), cada: Math.max(0.2, 0.33 / raiz), desde: 0 });
        out.push(hay('dron') ? { tipo: 'dron', n: R(14), cada: 0.6, desde: 2 } : { tipo: 'blindado', n: R(10), cada: 1.2, desde: 2 });
        break;
      case 4:   // asalto pesado
        out.push({ tipo: 'blindado', n: R(18), cada: Math.max(0.55, 1.0 / raiz), desde: 0 }, { tipo: 'soldado', n: R(22), cada: 0.4, desde: 2 });
        if (hay('dron')) out.push({ tipo: 'dron', n: R(10), cada: 0.7, desde: 6 });
        break;
      default:  // de todo
        out.push({ tipo: 'soldado', n: R(26), cada: 0.35, desde: 0 }, { tipo: 'blindado', n: R(14), cada: 1.1, desde: 2 });
        if (hay('corredor')) out.push({ tipo: 'corredor', n: R(14), cada: 0.4, desde: 5 });
        if (hay('dron')) out.push({ tipo: 'dron', n: R(12), cada: 0.6, desde: 6 });
    }
    return out;
  }
  // Multiplicador extra de vida: refuerzo desde cierta oleada y, en modo infinito, crecimiento acumulado
  function multVida(n) {
    const r = D.oleada.refuerzo, inf = D.infinito;
    let m = 1;
    if (r && n >= r.desde) {
      // curva cuadrática: "extra" en la oleada "desde" y "extraEn" en la oleada "hasta"; después sigue creciendo
      const c = r.hasta > r.desde ? ((r.extraEn || r.extra) - r.extra) / ((r.hasta - r.desde) * (r.hasta - r.desde)) : 0;
      m *= 1 + r.extra + c * (n - r.desde) * (n - r.desde);
    }
    if (modo === 'infinito' && inf && n > inf.desde) m *= Math.pow(1 + inf.extraPorOleada, n - inf.desde);
    return m;
  }
  const oleadaConJefe = n => gruposDe(n).some(g => D.enemigos[g.tipo].jefe);
  function iniciarOleada(conBono) {
    if (!puedeIniciar()) return false;
    let pendiente = 0;
    if (conBono) {
      if (enJuego()) pendiente = bonoAdelanto();   // se cobra al limpiar esta oleada
      else G.creditos += bonoAdelanto();
    }
    G.oleada++;
    if (pendiente) G.bonoPend[G.oleada] = pendiente;
    const grupos = gruposDe(G.oleada);
    const cola = [];
    let fin = 0;
    for (const g of grupos) {
      const t0 = g.desde != null ? g.desde : (fin > 0 ? fin + 1 : 0);
      for (let i = 0; i < g.n; i++) cola.push({ t: t0 + i * g.cada, tipo: g.tipo });
      fin = Math.max(fin, t0 + (g.n - 1) * g.cada);
    }
    cola.sort((a, b) => a.t - b.t);
    // Cada oleada sale por su cuenta: puede haber varias saliendo a la vez
    G.salidas.push({ oleada: G.oleada, cola, t: 0 });
    G.pendientes[G.oleada] = cola.length;
    G.generando = true;
    G.enCuenta = false; G.cuenta = 0;
    SON.sfx(oleadaConJefe(G.oleada) ? 'jefe' : 'oleada');
    if (oleadaConJefe(G.oleada)) aviso(gruposDe(G.oleada).some(q => q.tipo === 'jefeFinal') ? '¡El Titán de TERMINUS se acerca!' : '¡Un Coloso se acerca!');
    return true;
  }

  function crearEnemigo(tipo, oleada) {
    const def = D.enemigos[tipo];
    const escala = MAPA.escalaVida != null ? MAPA.escalaVida : D.oleada.escalaVida;
    const vida = def.vida * (1 + escala * (oleada - 1)) * multVida(oleada);
    // Con varias entradas, los enemigos se reparten por turno entre ellas
    const ruta = RUTAS.length > 1 ? (G.rutaSig++ % RUTAS.length) : 0;
    const e = { tipo, def, oleada, vida, vidaMax: vida, dist: 0, ruta, x: 0, y: 0, lento: 0, fragil: 0, congelado: 0, aturdido: 0, vivo: true };
    const p = posDe(e);
    e.x = p.x; e.y = p.y;
    G.enemigos.push(e);
  }

  function resolverEnemigo(e) {
    e.vivo = false;
    if (--G.pendientes[e.oleada] === 0) {
      const extra = G.bonoPend[e.oleada] || 0;
      const bono = D.oleada.bonoBase + D.oleada.bonoPorOleada * e.oleada + extra;
      G.creditos += bono;
      SON.sfx('limpia');
      delete G.bonoPend[e.oleada];
      aviso('Oleada ' + e.oleada + ' superada · +' + bono + 'cr' + (extra ? ' (incluye ' + extra + ' por adelantar)' : ''));
      guardar();
    }
  }

  function aplicarDano(e, d) {
    if (!e.vivo) return;
    e.vida -= d;
    if (e.vida <= 0) {
      G.creditos += e.def.premio;
      G.bajas++;
      G.guardado.bajasTotales++;
      SON.sfx(e.def.jefe ? 'grande' : e.tipo === 'blindado' || e.tipo === 'dron' ? 'explosion' : 'muerte', e.def.jefe || e.tipo === 'blindado' || e.tipo === 'dron' ? 0.6 : 1);
      if (e.def.jefe) { G.efectos.push({ k: 'explosion', x: e.x, y: e.y, t: 0, dur: 0.9, e: 3 }); aviso('¡' + e.def.nombre + ' destruido! +' + e.def.premio + 'cr'); }
      else G.efectos.push(e.tipo === 'blindado' || e.tipo === 'dron' ? { k: 'explosion', x: e.x, y: e.y, t: 0, dur: 0.4 } : { k: 'polvo', x: e.x, y: e.y, t: 0, dur: 0.3 });
      flotar(e.x, e.y - 10, '+' + e.def.premio);
      resolverEnemigo(e);
    }
  }

  // Multiplicador contra enemigos ralentizados o congelados que dan algunos combos (el mayor que tenga la torre)
  function bonoALentos(t) {
    let m = 1;
    for (const id of t.sin) {
      const sg = D.sinergias.find(x => x.id === id);
      if (sg.danoALentos && sg.para === t.tipo && sg.danoALentos > m) m = sg.danoALentos;
    }
    return m;
  }

  // Daño de un disparo normal: aplica resistencias, fragilidad y el bono contra enemigos frenados
  function danar(e, dano, t) {
    const s = t.s;
    let m = e.def.resist[s.tipoDano];
    if (m == null) m = 1;
    if (s.perforante && m < 1) m = 1;
    let d = dano * m * (1 + e.fragil);
    if (e.lento > 0 || e.congelado > 0) d *= bonoALentos(t);
    aplicarDano(e, d);
  }

  // ── Combos ──
  const trabajando = t => !!t.activa;   // la torre tiene enemigos a tiro
  function distSegmento(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const k = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - x1 - dx * k, py - y1 - dy * k);
  }

  // Ataque especial de un enlace con la carga llena. Devuelve false si no había a quién atacar
  // (en ese caso la carga se conserva). Los combos ignoran las resistencias del enemigo.
  // Hay tres formas, según combo.tipo en datos.js: 'area', 'linea' y 'onda'.
  const CARTEL = { hielo: ['#e8fbff', '#0d3b55'], plasma: ['#f0e2ff', '#3a1f6b'], fuego: ['#fff3a0', '#5a3200'], rayo: ['#fffbd0', '#3d3a05'], laser: ['#ffe2e2', '#5a0d0d'] };
  const COLOR_COMBO = { hielo: 0x9fe8ff, plasma: 0xb98bff, fuego: 0xffd23f, rayo: 0xfff07a, laser: 0xff5050 };
  // Rayo: desde el primer objetivo salta al enemigo más cercano aún no tocado, hasta "saltos" veces
  function cadena(primero, saltos, radio, aire) {
    const out = [primero];
    let ult = primero;
    for (let i = 0; i < Math.round(saltos); i++) {
      let mejor = null, md = radio;
      for (const e of G.enemigos) {
        if (!e.vivo || out.includes(e) || (e.def.aereo && !aire)) continue;
        const d = Math.hypot(e.x - ult.x, e.y - ult.y);
        if (d <= md) { md = d; mejor = e; }
      }
      if (!mejor) break;
      out.push(mejor); ult = mejor;
    }
    return out;
  }
  function efectoCadena(x, y, lista, color) {
    for (const e of lista) {
      G.efectos.push({ k: 'chispa', x1: x, y1: y, x2: e.x, y2: e.y, t: 0, dur: 0.22, color, s: Math.random() * 1000 });
      x = e.x; y = e.y;
    }
  }

  // Minas: puntos del camino dentro del alcance de la torre (se guardan mientras no cambie el alcance)
  function puntosMinas(t) {
    if (t.pm && t.pmA === t.s.alcance) return t.pm;
    const r2 = t.s.alcance * t.s.alcance, out = [];
    for (let ri = 0; ri < RUTAS.length; ri++) {
      for (let d = 0; d <= RUTAS[ri].largo; d += 6) {
        const p = posEn(d, ri), dx = p.x - t.x, dy = p.y - t.y;
        if (dx * dx + dy * dy <= r2 && p.x >= 4 && p.x <= W - 4 && p.y >= 4 && p.y <= H - 4) out.push(p);
      }
    }
    t.pm = out; t.pmA = t.s.alcance;
    return out;
  }
  // Siembra hasta n minas de la torre t. "extra" (combos y berserk) permite pasar del máximo, hasta el doble.
  function sembrar(t, n, dano, extra) {
    const pts = puntosMinas(t);
    if (!pts.length) return 0;
    const mias = G.minas.filter(m => m.torre === t);
    const tope = Math.floor(t.s.maxMinas) * (extra ? 2 : 1);
    let k = 0;
    for (; k < n && mias.length < tope; k++) {
      // De varios puntos al azar, el más alejado de las minas que ya hay: así quedan repartidas
      let mejor = null, md = -1;
      for (let i = 0; i < 6; i++) {
        const p = pts[Math.floor(Math.random() * pts.length)];
        let dmin = 1e9;
        for (const m of mias) dmin = Math.min(dmin, Math.hypot(m.x - p.x, m.y - p.y));
        if (dmin > md) { md = dmin; mejor = p; }
      }
      const m = { x: mejor.x + (Math.random() - 0.5) * 8, y: mejor.y + (Math.random() - 0.5) * 8, torre: t, dano, radio: t.s.radio, aturde: t.s.aturde || 0, t0: G.t };
      G.minas.push(m); mias.push(m);
    }
    return k;
  }

  function lanzarCombo(en) {
    const { a, b, sg } = en, c = sg.combo, ts = en.torres;
    const fuerza = c.dano + c.danoPorMejora * ts.reduce((s, t) => s + t.nivel, 0);
    const deTipo = tipo => ts.find(t => t.tipo === tipo);
    const efecto = CARTEL[c.efecto] ? c.efecto : 'fuego', color = COLOR_COMBO[efecto];
    const golpear = e => {
      if (c.congela && !e.def.aereo && !e.def.noCongela) e.congelado = Math.max(e.congelado, c.congela);
      if (c.aturde && !e.def.jefe) e.aturdido = Math.max(e.aturdido, c.aturde);
      aplicarDano(e, fuerza * (1 + e.fragil));
    };
    if (c.tipo === 'area') {
      // La torre "desde" dispara una carga que estalla sobre su objetivo y golpea todo lo que esté en el radio
      const tD = deTipo(c.desde);
      const obj = elegirObjetivo(tD);
      if (!obj) return false;
      const ox = obj.x, oy = obj.y;
      for (const e of G.enemigos) if (e.vivo && Math.hypot(e.x - ox, e.y - oy) <= c.radio) golpear(e);
      tD.ang = Math.atan2(oy - tD.y, ox - tD.x); tD.tFuego = G.t;
      G.efectos.push({ k: 'rayo', x1: tD.x, y1: tD.y, x2: ox, y2: oy, t: 0, dur: 0.25, color });
      G.efectos.push(efecto === 'hielo' ? { k: 'hielo', x: ox, y: oy, r: c.radio, t: 0, dur: 0.5 } : { k: 'estallido', x: ox, y: oy, r: c.radio, t: 0, dur: 0.5, color });
      cartel(ox, oy - Math.min(40, c.radio * 0.6), sg.nombre, CARTEL[efecto][0], CARTEL[efecto][1]);
    } else if (c.tipo === 'linea') {
      // Las torres del combo disparan un rayo que atraviesa a todos los enemigos en su línea
      let obj = null;
      for (const t of ts) if (!obj) obj = elegirObjetivo(t);
      if (!obj) return false;
      const ox = obj.x, oy = obj.y, tocados = new Set();
      for (const t of ts) {
        const ang = Math.atan2(oy - t.y, ox - t.x);
        const x2 = t.x + Math.cos(ang) * c.largo, y2 = t.y + Math.sin(ang) * c.largo;
        t.ang = ang; t.tFuego = G.t;
        for (const e of G.enemigos) if (e.vivo && distSegmento(e.x, e.y, t.x, t.y, x2, y2) <= c.ancho) tocados.add(e);
        G.efectos.push({ k: 'rayo', x1: t.x, y1: t.y, x2, y2, t: 0, dur: 0.28, color });
      }
      for (const e of tocados) golpear(e);
      cartel(ox, oy - 22, sg.nombre, CARTEL[efecto][0], CARTEL[efecto][1]);
    } else if (c.tipo === 'cadena') {
      // La torre de rayos lanza una descarga que salta entre enemigos cercanos
      const tD = deTipo(c.desde);
      const obj = elegirObjetivo(tD);
      if (!obj) return false;
      const lista = cadena(obj, c.saltos, c.radioSalto || 70, true);
      for (const e of lista) golpear(e);
      efectoCadena(tD.x, tD.y, lista, color);
      tD.ang = Math.atan2(obj.y - tD.y, obj.x - tD.x); tD.tFuego = G.t;
      cartel(obj.x, obj.y - 22, sg.nombre, CARTEL[efecto][0], CARTEL[efecto][1]);
    } else if (c.tipo === 'minas') {
      // La minadora siembra minas extra con el daño del combo
      const tD = deTipo(c.desde);
      if (!sembrar(tD, c.minas, fuerza, true)) return false;
      tD.tFuego = G.t;
      cartel(tD.x, tD.y - 24, sg.nombre, CARTEL[efecto][0], CARTEL[efecto][1]);
    } else {
      // Onda desde el centro de las torres del combo (solo enemigos en tierra)
      const mx = ts.reduce((s, t) => s + t.x, 0) / ts.length, my = ts.reduce((s, t) => s + t.y, 0) / ts.length;
      const dentro = G.enemigos.filter(e => e.vivo && !e.def.aereo && Math.hypot(e.x - mx, e.y - my) <= c.radio);
      if (!dentro.length) return false;
      for (const e of dentro) golpear(e);
      G.efectos.push(efecto === 'hielo' ? { k: 'hielo', x: mx, y: my, r: c.radio, t: 0, dur: 0.6 } : { k: 'estallido', x: mx, y: my, r: c.radio, t: 0, dur: 0.6, color });
      cartel(mx, my - 26, sg.nombre, CARTEL[efecto][0], CARTEL[efecto][1]);
    }
    return true;
  }

  // Ataque berserk de una torre con todas sus mejoras. Devuelve false si no tiene a quién disparar.
  function lanzarBerserk(t) {
    SON.sfx('berserk');
    const b = D.torres[t.tipo].berserk, s = t.s, r2 = s.alcance * s.alcance;
    const crio = t.tipo === 'crio';
    const aTiro = () => G.enemigos.filter(e => e.vivo && !(e.def.aereo && (crio || !s.antiaerea)) && (e.x - t.x) * (e.x - t.x) + (e.y - t.y) * (e.y - t.y) <= r2)
      .sort((p, q) => q.dist / largoDe(q) - p.dist / largoDe(p));
    let objs = aTiro();
    if (!objs.length) return false;
    if (crio) {
      for (const e of objs) {
        if (!e.def.noCongela) e.congelado = Math.max(e.congelado, b.congela);
        aplicarDano(e, b.dano * (1 + e.fragil));
      }
      G.efectos.push({ k: 'hielo', x: t.x, y: t.y, r: s.alcance, t: 0, dur: 0.7 });
    } else if (s.arma === 'bala') {
      for (let i = 0; i < b.balas; i++) {
        objs = objs.filter(e => e.vivo);
        if (!objs.length) break;
        const e = objs[i % objs.length];
        G.efectos.push({ k: 'traza', x1: t.x, y1: t.y, x2: e.x, y2: e.y, t: 0, dur: 0.16, h: false });
        danar(e, s.dano * b.multDano, t);
      }
    } else if (s.arma === 'mina') {
      sembrar(t, b.minas, s.dano * b.multDano, true);
    } else if (s.arma === 'laser') {
      t.bHasta = G.t + b.seg;   // el haz se potencia durante b.seg segundos (ver el disparo del láser)
    } else if (s.arma === 'rayo') {
      for (const e of objs) {
        if (!e.def.jefe) e.aturdido = Math.max(e.aturdido, b.aturde);
        danar(e, s.dano * b.multDano, t);
      }
      for (const e of objs) G.efectos.push({ k: 'chispa', x1: t.x, y1: t.y, x2: e.x, y2: e.y, t: 0, dur: 0.3, color: 0xfff07a, s: Math.random() * 1000 });
    } else if (s.arma === 'plasma') {
      const e = elegirObjetivo(t) || objs[0];
      G.proyectiles.push({ k: 'plasma', x: t.x, y: t.y, tx: e.x, ty: e.y, obj: e, vel: s.velProyectil, dano: s.dano * b.multDano, onda: b.onda, critico: true, torre: t, espera: 0 });
    } else {
      for (let i = 0; i < b.misiles; i++) {
        const e = objs[i % objs.length];
        G.proyectiles.push({ k: 'misil', x: t.x, y: t.y, tx: e.x, ty: e.y, obj: e, vel: s.velProyectil * 1.3, dano: s.dano * b.multDano, radio: s.radio, aturde: s.aturde || 0, torre: t, espera: i * 0.1, lado: i % 2 ? 1 : -1 });
      }
    }
    if (!crio) { t.ang = Math.atan2(objs.length ? objs[0].y - t.y : 0, objs.length ? objs[0].x - t.x : 1); t.tFuego = G.t; }
    cartel(t.x, t.y - 24, b.nombre, '#ffe1d6', '#6b1408');
    return true;
  }

  // Los n enemigos a tiro más cerca de la base, sin contar a "salvo"
  function otrosObjetivos(t, salvo, n) {
    const s = t.s, r2 = s.alcance * s.alcance, out = [];
    for (const e of G.enemigos) {
      if (!e.vivo || e === salvo || (e.def.aereo && !s.antiaerea)) continue;
      const dx = e.x - t.x, dy = e.y - t.y;
      if (dx * dx + dy * dy <= r2) out.push(e);
    }
    return out.sort((p, q) => (largoDe(p) - p.dist) - (largoDe(q) - q.dist)).slice(0, n);
  }

  function elegirObjetivo(t) {
    const s = t.s, r2 = s.alcance * s.alcance;
    let mejor = null, mv = -Infinity;
    for (const e of G.enemigos) {
      if (!e.vivo || (e.def.aereo && !s.antiaerea)) continue;
      const dx = e.x - t.x, dy = e.y - t.y;
      if (dx * dx + dy * dy > r2) continue;
      let v = 1e4 - (largoDe(e) - e.dist);   // el que está más cerca de la base (sirve con varias entradas)
      if (t.prioridad === 'fuerte') v += e.vida * 1e5;
      else if (t.prioridad === 'rapido') v += e.def.vel * 1e5;
      if (v > mv) { mv = v; mejor = e; }
    }
    return mejor;
  }

  // ───────────────────────── 4. SIMULACIÓN ─────────────────────────
  // Avanza el juego dt segundos (dt pequeño; update() lo llama en pasos de 1/30 s como máximo)
  function avanzar(dt) {
    if (G.fase !== 'jugando') return;
    G.t += dt;

    // Salida de enemigos
    if (G.generando) {
      for (const sa of G.salidas) {
        sa.t += dt;
        while (sa.cola.length && sa.cola[0].t <= sa.t) crearEnemigo(sa.cola.shift().tipo, sa.oleada);
      }
      G.salidas = G.salidas.filter(sa => sa.cola.length);
      if (!G.salidas.length) G.generando = false;
    }

    // Efectos de las torres criogénicas (se recalculan en cada paso)
    for (const e of G.enemigos) { e.lento = 0; e.fragil = 0; if (e.congelado > 0) e.congelado -= dt; if (e.aturdido > 0) e.aturdido -= dt; }
    for (const t of G.torres) {
      if (t.tipo !== 'crio' && !t.s.lento) continue;   // la crío y las torres con aura de frío (cañón glacial)
      const s = t.s, r2 = s.alcance * s.alcance;
      let enRango = 0;
      for (const e of G.enemigos) {
        if (e.def.aereo) continue;
        const dx = e.x - t.x, dy = e.y - t.y;
        if (dx * dx + dy * dy > r2) continue;
        enRango++;
        const lento = s.lento * (e.def.resFrio == null ? 1 : e.def.resFrio);   // el jefe resiste el frío
        if (lento > e.lento) e.lento = lento;
        if (s.fragil && s.fragil > e.fragil) e.fragil = s.fragil;
      }
      t.activa = enRango > 0;
      if (s.congela && s.cadaSeg) {
        t.tCong += dt;
        if (t.tCong >= s.cadaSeg && enRango > 0) {
          t.tCong = 0;
          for (const e of G.enemigos) {
            if (e.def.aereo) continue;
            const dx = e.x - t.x, dy = e.y - t.y;
            if (dx * dx + dy * dy <= r2 && !e.def.noCongela) e.congelado = s.congela;
          }
          G.efectos.push({ k: 'anillo', x: t.x, y: t.y, r: s.alcance, t: 0, dur: 0.45 });
          SON.sfx('hielo');
        }
      }
    }

    // Movimiento
    for (const e of G.enemigos) {
      if (e.congelado > 0 || e.aturdido > 0) continue;
      e.dist += e.def.vel * (1 - e.lento) * dt;
      if (e.dist >= largoDe(e)) {
        const quita = e.def.vidas || 1;
        G.vidas -= quita;
        SON.sfx('vida');
        aviso(e.def.jefe ? '¡El ' + e.def.nombre + ' llegó a la base! −' + quita + ' vidas' : 'Un enemigo llegó a la base');
        resolverEnemigo(e);
        continue;
      }
      const p = posDe(e);
      e.x = p.x; e.y = p.y;
    }

    // Minas: estallan cuando un enemigo de tierra pasa encima y dañan a todos los de tierra en su radio
    if (G.minas.length) {
      for (const m of G.minas) {
        let pisa = false;
        for (const e of G.enemigos) {
          if (e.vivo && !e.def.aereo && Math.abs(e.x - m.x) < 11 && Math.abs(e.y - m.y) < 11) { pisa = true; break; }
        }
        if (!pisa) continue;
        m.fin = true;
        for (const e of G.enemigos) {
          if (!e.vivo || e.def.aereo || Math.hypot(e.x - m.x, e.y - m.y) > m.radio) continue;
          if (m.aturde && !e.def.jefe) e.aturdido = Math.max(e.aturdido, m.aturde);
          danar(e, m.dano, m.torre);
        }
        G.efectos.push({ k: 'explosion', x: m.x, y: m.y, t: 0, dur: 0.4, e: m.radio / 22 });
        SON.sfx('mina');
      }
      G.minas = G.minas.filter(m => !m.fin);
    }

    // Disparo. Cada torre con arma apunta al objetivo que le toca según su prioridad.
    for (const t of G.torres) {
      const s = t.s;
      if (!s.arma) continue;
      t.enfria -= dt;
      if (s.arma === 'mina') {
        // La minadora siembra una mina cada "cadencia" segundos, haya o no enemigos, hasta su máximo
        t.activa = !!elegirObjetivo(t);
        if (t.enfria <= 0) {
          if (sembrar(t, 1, s.dano, false)) { t.tFuego = G.t; t.enfria = s.cadencia; }
          else t.enfria = 0;
        }
        continue;
      }
      if (s.arma === 'laser') {
        // Haz continuo del largo de su alcance: daña a todo lo que esté en la línea.
        // Apunta hacia donde el haz atraviesa más enemigos (a igualdad, al más avanzado).
        const furia = t.bHasta > G.t ? D.torres[t.tipo].berserk : null;
        const ancho = s.ancho * (furia ? furia.multAncho : 1), dps = s.danoSeg * (furia ? furia.multDano : 1);
        const r2 = s.alcance * s.alcance, cand = [];
        for (const o of G.enemigos) {
          if (!o.vivo || (o.def.aereo && !s.antiaerea)) continue;
          const dx = o.x - t.x, dy = o.y - t.y;
          if (dx * dx + dy * dy <= r2) cand.push(o);
        }
        t.activa = cand.length > 0; t.haz = null; t.hacesExtra = null;
        if (!cand.length) continue;
        const opciones = [];
        for (const o of cand) {
          const an = Math.atan2(o.y - t.y, o.x - t.x), ex = t.x + Math.cos(an) * s.alcance, ey = t.y + Math.sin(an) * s.alcance;
          let n = 0;
          for (const q of cand) if (distSegmento(q.x, q.y, t.x, t.y, ex, ey) <= ancho) n++;
          opciones.push({ an, v: n * 1e5 + 1e4 - (largoDe(o) - o.dist) });
        }
        opciones.sort((p, q) => q.v - p.v);
        // El láser prismático dispara varios haces, en direcciones distintas entre sí
        const angs = [];
        for (const op of opciones) {
          if (angs.length >= (s.haces || 1)) break;
          if (angs.every(a0 => Math.abs(Math.atan2(Math.sin(op.an - a0), Math.cos(op.an - a0))) > 0.4)) angs.push(op.an);
        }
        t.ang = angs[0];
        for (let i = 0; i < angs.length; i++) {
          const x2 = t.x + Math.cos(angs[i]) * s.alcance, y2 = t.y + Math.sin(angs[i]) * s.alcance;
          const h = { x2, y2, ancho, furia: !!furia, ang: angs[i] };
          if (i === 0) t.haz = h; else (t.hacesExtra = t.hacesExtra || []).push(h);
          for (const o of G.enemigos) {
            if (o.vivo && !(o.def.aereo && !s.antiaerea) && distSegmento(o.x, o.y, t.x, t.y, x2, y2) <= ancho) danar(o, dps * dt, t);
          }
        }
        if (s.arcoCada) {
          // Reactor de fusión: cada arcoCada s, un arco eléctrico que salta entre enemigos
          t.tArco = (t.tArco || 0) + dt;
          const vivos = cand.filter(o => o.vivo);
          if (t.tArco >= s.arcoCada && vivos.length) {
            t.tArco = 0;
            const lista = cadena(vivos[0], s.arcoSaltos, 75, true);
            for (const o of lista) danar(o, s.arcoDano, t);
            efectoCadena(t.x, t.y, lista, 0xff7ad9);
          }
        }
        continue;
      }
      const e = elegirObjetivo(t);
      t.activa = !!e;
      if (!e) { if (t.enfria < 0) t.enfria = 0; continue; }
      t.ang = Math.atan2(e.y - t.y, e.x - t.x);
      if (t.enfria > 0) continue;
      t.tFuego = G.t;
      if (s.arma === 'bala') {
        // Impacto inmediato (el cañón rotativo reparte el disparo entre varios objetivos)
        const objs = s.objetivos > 1 ? [e, ...otrosObjetivos(t, e, s.objetivos - 1)] : [e];
        SON.sfx('bala');
        for (const o of objs) {
          G.efectos.push({ k: 'traza', x1: t.x, y1: t.y, x2: o.x, y2: o.y, t: 0, dur: 0.07, h: (o.lento > 0 || o.congelado > 0) && bonoALentos(t) > 1 });
          danar(o, s.dano, t);
        }
      } else if (s.arma === 'plasma') {
        t.tiros = (t.tiros || 0) + 1;
        const critico = !!s.critCada && t.tiros % s.critCada === 0;
        SON.sfx('plasma');
        G.proyectiles.push({ k: 'plasma', x: t.x, y: t.y, tx: e.x, ty: e.y, obj: e, vel: s.velProyectil, dano: s.dano * (critico ? s.critMult : 1), onda: s.onda || 0, critico, torre: t, espera: 0, congela: s.congelaImpacto || 0 });
      } else if (s.arma === 'rayo') {
        const lista = cadena(e, s.saltos, s.radioSalto, s.antiaerea);
        let f = 1;
        for (const o of lista) {
          if (s.aturde && !o.def.jefe) o.aturdido = Math.max(o.aturdido, s.aturde);
          danar(o, s.dano * f, t);
          f *= s.caida;
        }
        efectoCadena(t.x, t.y, lista, 0xfff07a);
        SON.sfx('rayo');
      } else if (s.arma === 'misil') {
        SON.sfx('misil');
        for (let i = 0; i < (s.salva || 1); i++) {
          const o = i === 0 || !(s.salva > 2) ? e : (otrosObjetivos(t, e, s.salva - 1)[i - 1] || e);   // salvas grandes reparten objetivos
          G.proyectiles.push({ k: 'misil', x: t.x, y: t.y, tx: o.x, ty: o.y, obj: o, vel: s.velProyectil, dano: s.dano, radio: s.radio, aturde: s.aturde || 0, torre: t, espera: i * 0.18, lado: i % 2 ? 1 : -1, multAire: s.multAire || 1, saltos: s.saltosImpacto || 0, congela: s.congelaImpacto || 0, minas: s.minasImpacto || 0 });
        }
      }
      t.enfria += s.cadencia;
      if (t.enfria < 0) t.enfria = 0;
    }

    // Proyectiles en vuelo: siguen a su objetivo; si muere, llegan al último lugar donde estuvo
    for (const p of G.proyectiles) {
      if (p.espera > 0) { p.espera -= dt; continue; }
      if (p.obj && p.obj.vivo) { p.tx = p.obj.x; p.ty = p.obj.y; }
      const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), paso = p.vel * dt;
      p.ang = Math.atan2(dy, dx);
      if (d > paso) { p.x += dx / d * paso; p.y += dy / d * paso; continue; }
      p.fin = true; p.x = p.tx; p.y = p.ty;
      if (p.k === 'plasma') {
        const vivo = p.obj && p.obj.vivo;
        if (vivo) danar(p.obj, p.dano, p.torre);
        if (p.onda > 0) {
          for (const e of G.enemigos) {
            if (e.vivo && e !== p.obj && !e.def.aereo && Math.hypot(e.x - p.x, e.y - p.y) <= p.onda) danar(e, p.dano * 0.5, p.torre);
          }
        }
        if (p.congela) {
          // Plasma helado: congela todo lo que está en la onda (jefes no)
          for (const e of G.enemigos) {
            if (e.vivo && !e.def.aereo && !e.def.noCongela && Math.hypot(e.x - p.x, e.y - p.y) <= Math.max(14, p.onda)) e.congelado = Math.max(e.congelado, p.congela);
          }
          G.efectos.push({ k: 'hielo', x: p.x, y: p.y, r: Math.max(14, p.onda), t: 0, dur: 0.45 });
        }
        if (vivo || p.onda > 0) G.efectos.push({ k: 'estallido', x: p.x, y: p.y, r: Math.max(10, p.onda) * (p.critico ? 1.3 : 1), t: 0, dur: 0.28, color: 0xb98bff });
      } else {
        for (const e of G.enemigos) {
          if (!e.vivo || Math.hypot(e.x - p.x, e.y - p.y) > p.radio) continue;
          if (p.aturde && !e.def.jefe) e.aturdido = Math.max(e.aturdido, p.aturde);
          danar(e, p.dano * (e.def.aereo ? (p.multAire || 1) : 1), p.torre);
        }
        G.efectos.push({ k: 'explosion', x: p.x, y: p.y, t: 0, dur: 0.4, e: p.radio / 20 });
        SON.sfx('explosion');
        if (p.congela) {
          // Bombardero criogénico: congela todo lo de tierra en el radio (jefes no)
          for (const e of G.enemigos) {
            if (e.vivo && !e.def.aereo && !e.def.noCongela && Math.hypot(e.x - p.x, e.y - p.y) <= p.radio) e.congelado = Math.max(e.congelado, p.congela);
          }
          G.efectos.push({ k: 'hielo', x: p.x, y: p.y, r: p.radio, t: 0, dur: 0.5 });
        }
        if (p.minas && G.torres.includes(p.torre)) {
          // ...y deja minas donde estalla (hasta 12 de esta torre a la vez)
          const s2 = p.torre.s;
          for (let k = 0; k < p.minas && G.minas.filter(m => m.torre === p.torre).length < 12; k++) {
            G.minas.push({ x: p.x + (Math.random() - 0.5) * 16, y: p.y + (Math.random() - 0.5) * 16, torre: p.torre, dano: s2.danoMina, radio: s2.radioMina, aturde: 0, t0: G.t });
          }
        }
        if (p.saltos) {
          // Domo antiaéreo: al estallar descarga un rayo que salta desde el enemigo más cercano
          let primero = null, md = p.radio + 30;
          for (const e of G.enemigos) { const dd = Math.hypot(e.x - p.x, e.y - p.y); if (e.vivo && dd < md) { md = dd; primero = e; } }
          if (primero) {
            const lista = cadena(primero, p.saltos, 70, true);
            for (const e of lista) danar(e, p.dano * 0.5, p.torre);
            efectoCadena(p.x, p.y, lista, 0xfff07a);
          }
        }
      }
    }
    G.proyectiles = G.proyectiles.filter(p => !p.fin);

    // Combos: cada enlace carga mientras alguna de sus dos torres está trabajando.
    // Una torre con varias vecinas reparte su carga: cada enlace carga más lento.
    for (const en of G.enlaces) {
      if (en.trio || !en.torres.some(trabajando)) continue;   // los tríos no atacan: son la receta de una fusión
      // Los tríos no reparten carga; los combos de 2 sí (una torre con varias vecinas carga cada uno más lento)
      en.carga += dt / (en.sg.combo.cargaSeg * (en.trio ? 1 : Math.max(en.a.nEnl, en.b.nEnl)));
      if (en.carga >= 1) {
        if (lanzarCombo(en)) { en.carga = 0; en.tDisparo = G.t; SON.sfx('combo'); }
        else en.carga = 1;
      }
    }

    // Berserk: las torres con todas sus mejoras cargan un ataque propio mientras tienen enemigos a tiro
    for (const t of G.torres) {
      if (!t.berserk) continue;
      if (trabajando(t)) t.bCarga += dt / D.torres[t.tipo].berserk.cargaSeg;
      if (t.bCarga >= 1) {
        if (lanzarBerserk(t)) { t.bCarga = 0; t.tBerserk = G.t; }
        else t.bCarga = 1;
      }
    }

    G.enemigos = G.enemigos.filter(e => e.vivo);
    for (const f of G.efectos) f.t += dt;
    G.efectos = G.efectos.filter(f => f.t < f.dur);

    // Fin de partida y cuenta regresiva
    if (G.vidas <= 0) { G.vidas = 0; terminar('derrota'); return; }
    if (!G.generando && !G.enemigos.length && G.oleada > 0) {
      if (G.oleada >= TOTAL_OLEADAS) { terminar('victoria'); return; }
      if (!G.enCuenta) { G.enCuenta = true; G.cuenta = D.oleada.esperaSeg; guardarPartida(); }
      else {
        G.cuenta -= dt;
        if (G.cuenta <= 0) iniciarOleada(false);
      }
    }
  }

  let esRecord = false;
  function terminar(resultado) {
    G.fase = resultado;
    SON.sfx(resultado === 'victoria' ? 'victoria' : 'derrota');
    borrarPartida();
    esRecord = false;
    if (resultado === 'victoria') {
      G.guardado.victorias++;
      G.guardado.mejorVidas = Math.max(G.guardado.mejorVidas, G.vidas);
      G.guardado.completados[mapaId] = true;
      G.guardado.mejor[mapaId] = Math.max(G.guardado.mejor[mapaId] || 0, G.vidas);
    }
    if (modo === 'infinito') {
      esRecord = G.oleada > (G.guardado.recordInfinito[mapaId] || 0);
      if (esRecord) G.guardado.recordInfinito[mapaId] = G.oleada;
    }
    guardar();
    G.tipoSel = null; G.puntoSel = null; G.torreSel = null;
    mostrarFinal();
  }

  // ───────────────────────── 5. DIBUJO (Phaser) ─────────────────────────
  // Paleta: desierto de día. Defensores en verde oliva y acero; atacantes en gris carbón y rojo.
  const COL = {
    arena: 0xd8b878, arenaClara: 0xe6cc94, arenaOscura: 0xc29e5e,
    ruta: 0xa98250, rutaBorde: 0x86633a, huella: 0x8a6739,
    losa: 0x928f85, losaBorde: 0x5d5a52, losaLuz: 0xbab7ab,
    oliva: 0x6b7a3e, olivaOsc: 0x39421f, acero: 0x2b2e30,
    hielo: 0xcfefff, crioAzul: 0x2f86ad, crioLuz: 0x7fd4f0,
    carbon: 0x4f4a48, carbonOsc: 0x2a2625, rojo: 0xa83232, rojoOsc: 0x4a1513,
    oro: 0xffd23f, sombra: 0x000000,
    plasma: 0x6a4fb0, plasmaOsc: 0x2f2350, plasmaLuz: 0xd2b6ff,
    misil: 0x56646e, misilOsc: 0x2b343b,
    alcance: { ametralladora: 0xffffff, crio: 0xdff6ff, plasma: 0xe9dcff, misiles: 0xffe9c9, minas: 0xf3e6b8, laser: 0xffd9d9, rayo: 0xfff7c2, rotativo: 0xffffff, glacial: 0xdff6ff, domo: 0xffe9c9, reactor: 0xffd9f3, nucleo: 0xdff6ff, artilleria: 0xffe9c9, tesla: 0xfff7c2, prismatico: 0xffd9d9, minero: 0xf3e6b8, criobomba: 0xdff6ff }
  };
  const ANCHO_CAMINO = 24;
  let escena = null, gDin = null, gFondo = null, txtEntradas = [], txtBase = null, TM = null;
  let flotantes = [];

  // Números "al azar" repetibles: el terreno sale igual en cada partida
  function azar(semilla) {
    let a = semilla >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Polígono girado alrededor de (cx, cy). pts en coordenadas locales: x hacia adelante, y hacia la derecha
  function poli(g, cx, cy, ang, pts, color, alfa, borde, anchoBorde) {
    const cs = Math.cos(ang), sn = Math.sin(ang), out = [];
    for (const p of pts) out.push({ x: cx + p[0] * cs - p[1] * sn, y: cy + p[0] * sn + p[1] * cs });
    g.fillStyle(color, alfa).fillPoints(out, true);
    if (anchoBorde) g.lineStyle(anchoBorde, borde, alfa).strokePoints(out, true, true);
  }
  const caja = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  function anguloEn(d, ruta) {
    const tr = RUTAS[ruta || 0].tramos;
    for (const t of tr) if (d <= t.ini + t.l) return Math.atan2(t.b.y - t.a.y, t.b.x - t.a.x);
    const u = tr[tr.length - 1];
    return Math.atan2(u.b.y - u.a.y, u.b.x - u.a.x);
  }

  function flotar(x, y, txt) {
    if (!escena || flotantes.length > 40) return;
    const o = escena.add.text(x, y, txt, {
      fontFamily: 'system-ui, sans-serif', fontSize: '11px', fontStyle: 'bold',
      color: '#fff0a0', stroke: '#4a3200', strokeThickness: 3
    }).setOrigin(0.5).setResolution(resTxt()).setDepth(5);
    flotantes.push({ o, t: 0, y0: y });
  }
  // Cartel grande con el nombre del combo
  function cartel(x, y, txt, color, borde) {
    if (!escena) return;
    x = Math.max(70, Math.min(W - 70, x)); y = Math.max(16, y);
    const o = escena.add.text(x, y, '¡' + txt + '!', {
      fontFamily: 'system-ui, sans-serif', fontSize: '15px', fontStyle: 'bold',
      color, stroke: borde, strokeThickness: 4
    }).setOrigin(0.5).setResolution(resTxt()).setDepth(6);
    flotantes.push({ o, t: 0, y0: y, dur: 1.2, sube: 14 });
  }
  function limpiarFlotantes() { for (const f of flotantes) f.o.destroy(); flotantes = []; }

  function bandaCamino(g, ancho, color, alfa) {
    g.fillStyle(color, alfa);
    for (const t of TODOS) {
      const x1 = Math.min(t.a.x, t.b.x) - ancho / 2, y1 = Math.min(t.a.y, t.b.y) - ancho / 2;
      g.fillRect(x1, y1, Math.abs(t.b.x - t.a.x) + ancho, Math.abs(t.b.y - t.a.y) + ancho);
    }
  }

  // Aspecto del terreno según el escenario (campo "tema" de cada mapa en datos.js)
  const TEMAS = {
    desierto: {
      suelo: 0xd8b878, claro: 0xe6cc94, oscuro: 0xc29e5e, ondas: true,
      grano: [0x7a5a2c, 0xfff0c8], ruta: 0xa98250, rutaBorde: 0x86633a, huella: 0x8a6739, rutaGrano: [0x7a5a2c, 0xc9a66c],
      roca: 0x8c7b63, rocaLuz: 0xb7a686, mata: [0x6f7a3a, 0x8a7a3e], texto: '#5a3d1a', polvo: [0xe9d3a4, 0xb8935a]
    },
    nieve: {
      suelo: 0xe3ebf1, claro: 0xf8fcff, oscuro: 0xc3d2de, ondas: true,
      grano: [0x9db4c6, 0xffffff], ruta: 0x93a2af, rutaBorde: 0x6e7e8c, huella: 0x7b8a97, rutaGrano: [0x5f6f7d, 0xdfe8ef],
      roca: 0x5d6770, rocaLuz: 0xf4f9fc, mata: [0x7fb0cc, 0xa9cfe3], texto: '#3d5266', polvo: [0xffffff, 0xbcd0de]
    },
    selva: {
      suelo: 0x4f7a34, claro: 0x6b9a45, oscuro: 0x35592a, ondas: false, hojas: true,
      grano: [0x2a4a1c, 0x8fbf5a], ruta: 0x7a5a36, rutaBorde: 0x553d22, huella: 0x4a331c, rutaGrano: [0x3a2814, 0x9a7a4e],
      roca: 0x5f6a55, rocaLuz: 0x8a9a6e, mata: [0x2f5a1f, 0x8fc456], texto: '#eef7dc', polvo: [0x8a6a42, 0x5f7f3a]
    }
  };

  function dibujarFondo(g) {
    const r = azar(20261111 + mapaId.length * 97), T = TM;
    // Suelo con manchas claras y oscuras
    g.fillStyle(T.suelo, 1).fillRect(0, 0, W, H);
    for (let i = 0; i < 46; i++) {
      g.fillStyle(r() < 0.5 ? T.claro : T.oscuro, 0.10 + r() * 0.12)
        .fillEllipse(r() * W, r() * H, 50 + r() * 110, 22 + r() * 46);
    }
    // Selva: charcos y hojas grandes en el suelo
    if (T.hojas) {
      for (let i = 0; i < 9; i++) {
        const x = r() * W, y = r() * H, a = 14 + r() * 22;
        g.fillStyle(0x2e4f3a, 0.55).fillEllipse(x, y, a * 1.6, a);
        g.fillStyle(0x5d8f86, 0.45).fillEllipse(x - 2, y - 2, a * 1.3, a * 0.7);
      }
      for (let i = 0; i < 70; i++) {
        const x = r() * W, y = r() * H, a = r() * Math.PI * 2, l = 7 + r() * 9;
        poli(g, x, y, a, [[0, 0], [l * 0.5, -l * 0.28], [l, 0], [l * 0.5, l * 0.28]], r() < 0.5 ? 0x3d6b2a : 0x6fa042, 0.75);
        g.lineStyle(0.8, 0x2a4a1c, 0.6).lineBetween(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l);
      }
    }
    // Ondas de duna o de nieve
    for (let i = 0; i < (T.ondas === false ? 0 : 34); i++) {
      const x = r() * W, y = r() * H, largo = 24 + r() * 46;
      g.lineStyle(1.2, T.oscuro, 0.35);
      g.beginPath(); g.moveTo(x, y);
      for (let k = 1; k <= 6; k++) g.lineTo(x + largo * k / 6, y + Math.sin(k * 1.1) * 2.2);
      g.strokePath();
      g.lineStyle(1, T.claro, 0.4);
      g.beginPath(); g.moveTo(x, y + 2);
      for (let k = 1; k <= 6; k++) g.lineTo(x + largo * k / 6, y + 2 + Math.sin(k * 1.1) * 2.2);
      g.strokePath();
    }
    // Grano
    for (let i = 0; i < 700; i++) {
      g.fillStyle(T.grano[r() < 0.5 ? 0 : 1], 0.16).fillRect(r() * W, r() * H, 1.2, 1.2);
    }

    // Camino con huellas de vehículos
    bandaCamino(g, ANCHO_CAMINO + 5, T.oscuro, 0.55);
    bandaCamino(g, ANCHO_CAMINO, T.rutaBorde, 1);
    bandaCamino(g, ANCHO_CAMINO - 3, T.ruta, 1);
    bandaCamino(g, 14, T.huella, 0.55);
    bandaCamino(g, 7, T.ruta, 1);
    for (let ri = 0; ri < RUTAS.length; ri++) for (let d = 0; d < RUTAS[ri].largo; d += 3) {
      const p = posEn(d, ri);
      g.fillStyle(T.rutaGrano[r() < 0.5 ? 0 : 1], 0.25)
        .fillRect(p.x + (r() - 0.5) * (ANCHO_CAMINO - 4), p.y + (r() - 0.5) * (ANCHO_CAMINO - 4), 1.5, 1.5);
    }

    // Rocas y matorrales (o esquirlas de hielo) repartidos fuera del camino
    for (let c = 0; c < D.cols; c++) {
      for (let f = 0; f < D.filas; f++) {
        if (CAMINO.has(c + ',' + f)) continue;
        const v = r();
        if (v > 0.34) continue;
        const ex = r() < 0.5 ? 6 : C - 6, ey = r() < 0.5 ? 6 : C - 6;
        const x = c * C + ex, y = f * C + ey;
        if (v < 0.2) {
          const n = 1 + Math.floor(r() * 3);
          for (let k = 0; k < n; k++) {
            const rx = x + (r() - 0.5) * 8, ry = y + (r() - 0.5) * 8, t = 2.5 + r() * 3;
            g.fillStyle(COL.sombra, 0.22).fillEllipse(rx + 1.5, ry + 2, t * 2.4, t * 1.7);
            g.fillStyle(T.roca, 1).fillEllipse(rx, ry, t * 2.2, t * 1.6);
            g.fillStyle(T.rocaLuz, 1).fillEllipse(rx - t * 0.3, ry - t * 0.3, t * 1.1, t * 0.7);
          }
        } else {
          for (let k = 0; k < 7; k++) {
            const a = r() * Math.PI * 2, l = 2 + r() * 4;
            g.lineStyle(1.2, T.mata[r() < 0.5 ? 0 : 1], 0.9).lineBetween(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l);
          }
        }
      }
    }

    // Ruta aérea: línea punteada tenue, solo en escenarios con enemigos voladores
    if (MAPA.oleadas.some(o => o.some(q => recto(D.enemigos[q.tipo])))) {
      const n = Math.floor(AIRE.l / 12);
      g.fillStyle(T.rutaBorde, 0.5);
      for (let i = 2; i < n - 1; i++) {
        const k = i / n;
        g.fillCircle(AIRE.a.x + (AIRE.b.x - AIRE.a.x) * k, AIRE.a.y + (AIRE.b.y - AIRE.a.y) * k, 1.3);
      }
    }

    // Entradas: barreras a ambos lados del camino, en el borde por donde entra cada ruta (izquierda o arriba)
    const fin = PUNTOS[PUNTOS.length - 1];
    for (const R of RUTAS) {
      const p0 = R.puntos[0], p1 = R.puntos[1], horiz = Math.abs(p1.x - p0.x) >= Math.abs(p1.y - p0.y);
      for (const lado of [-1, 1]) {
        if (horiz) {
          const by = p0.y + lado * (ANCHO_CAMINO / 2 + 5);
          g.fillStyle(COL.sombra, 0.25).fillRect(2, by - 1, 14, 5);
          for (let k = 0; k < 4; k++) g.fillStyle(k % 2 ? 0xf2f2f2 : 0xc0392b, 1).fillRect(k * 3.5, by - 3, 3.5, 5);
        } else {
          const bx = p0.x + lado * (ANCHO_CAMINO / 2 + 5);
          g.fillStyle(COL.sombra, 0.25).fillRect(bx - 1, 2, 5, 14);
          for (let k = 0; k < 4; k++) g.fillStyle(k % 2 ? 0xf2f2f2 : 0xc0392b, 1).fillRect(bx - 3, k * 3.5, 5, 3.5);
        }
      }
    }

    // Base: búnker de hormigón en el borde derecho
    const bx = W - 24, by = fin.y - 24;
    g.fillStyle(COL.sombra, 0.28).fillRoundedRect(bx + 3, by + 4, 26, 48, 3);
    g.fillStyle(0x9a9ea3, 1).fillRoundedRect(bx, by, 26, 48, 3);
    g.lineStyle(1.5, 0x55595e, 1).strokeRoundedRect(bx, by, 26, 48, 3);
    g.fillStyle(0xb9bdc2, 1).fillRect(bx + 5, by + 5, 16, 38);
    g.lineStyle(1, 0x6f7378, 1).strokeRect(bx + 5, by + 5, 16, 38);
    for (let k = 0; k < 6; k++) g.fillStyle(k % 2 ? 0x222222 : 0xf1c40f, 1).fillRect(bx, by + 12 + k * 4, 4, 4);
    g.fillStyle(0x1f6fc2, 1).fillCircle(bx + 13, by + 24, 4.5);
    g.fillStyle(0x8fc8ff, 1).fillCircle(bx + 12, by + 23, 2);
  }

  // Repinta el terreno del escenario actual y ubica los rótulos
  function pintarMapa() {
    TM = TEMAS[MAPA.tema] || TEMAS.desierto;
    gFondo.clear();
    dibujarFondo(gFondo);
    const fin = PUNTOS[PUNTOS.length - 1];
    // Un rótulo "ENTRADA" por ruta: sobre el camino si entra por la izquierda, al lado si entra por arriba
    for (const o of txtEntradas) o.destroy();
    txtEntradas = RUTAS.map(R => {
      const p0 = R.puntos[0], p1 = R.puntos[1], horiz = Math.abs(p1.x - p0.x) >= Math.abs(p1.y - p0.y);
      const o = escena.add.text(0, 0, 'ENTRADA', { fontFamily: 'system-ui, sans-serif', fontSize: '8px', fontStyle: 'bold', color: TM.texto }).setResolution(resTxt());
      if (horiz) o.setPosition(4, p0.y - 30); else o.setPosition(p0.x + 20, 3);
      return o;
    });
    txtBase.setPosition(W - 3, fin.y - 36).setColor(TM.texto);
  }

  function circuloPunteado(g, x, y, r, color, alfa, ancho) {
    g.lineStyle(ancho, color, alfa);
    const n = Math.max(16, Math.round(r / 3));
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 0.55) / n) * Math.PI * 2;
      g.beginPath(); g.arc(x, y, r, a0, a1); g.strokePath();
    }
  }
  function marcarAlcance(g, x, y, r, tipo) {
    g.fillStyle(COL.alcance[tipo], 0.16).fillCircle(x, y, r);
    circuloPunteado(g, x, y, r, 0x3a2a10, 0.55, 3);
    circuloPunteado(g, x, y, r, 0xffffff, 0.95, 1.4);
  }
  function enlace(g, x1, y1, x2, y2, alfa) {
    g.lineStyle(5, 0x3a2a10, 0.45 * alfa).lineBetween(x1, y1, x2, y2);
    g.lineStyle(2.5, COL.oro, alfa).lineBetween(x1, y1, x2, y2);
  }

  // Medidor de carga del combo: círculo entre las dos torres que se va llenando
  // Medidores de combo. Los que caen a menos de 14 px entre sí (racimos de torres) se dibujan como uno solo:
  // muestra la carga del más avanzado y "×n" con cuántos combos agrupa. Cada combo sigue cargando por su cuenta.
  let txtMedidores = [];
  function medidoresCombo(g) {
    const grupos = [];
    for (const en of G.enlaces || []) {
      if (en.trio) continue;
      const mx = (en.a.x + en.b.x) / 2, my = (en.a.y + en.b.y) / 2;
      let gr = grupos.find(q => Math.hypot(q.x - mx, q.y - my) < 14);
      if (!gr) { gr = { x: mx, y: my, sx: 0, sy: 0, ens: [] }; grupos.push(gr); }
      gr.ens.push(en); gr.sx += mx; gr.sy += my;
    }
    let usados = 0;
    for (const gr of grupos) {
      const n = gr.ens.length, mx = gr.sx / n, my = gr.sy / n;
      const k = Math.min(1, Math.max(...gr.ens.map(en => en.carga)));
      const R = n > 1 ? 8 : 7, r = n > 1 ? 5.8 : 4.6;   // el medidor agrupado es un poco más grande
      g.fillStyle(0x2a1c08, 0.9).fillCircle(mx, my, R);
      g.lineStyle(1, 0x000000, 0.5).strokeCircle(mx, my, R);
      if (k > 0) {
        g.lineStyle(n > 1 ? 2.4 : 3.2, k >= 1 ? 0xffffff : COL.oro, 1);
        g.beginPath(); g.arc(mx, my, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); g.strokePath();
      }
      for (const en of gr.ens) {
        const hace = G.t - en.tDisparo;
        if (hace >= 0.4) continue;
        const q = hace / 0.4;
        g.lineStyle(3, 0xffffff, 1 - q).strokeCircle(mx, my, 7 + 16 * q);
        g.lineStyle(6, 0xffffff, 0.8 * (1 - q)).lineBetween(en.a.x, en.a.y, en.b.x, en.b.y);
      }
      if (n > 1 && escena) {
        let o = txtMedidores[usados];
        if (!o) {
          o = escena.add.text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: '6px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5).setResolution(resTxt(3)).setDepth(3);
          txtMedidores.push(o);
        }
        if (o.text !== '×' + n) o.setText('×' + n);
        o.setPosition(mx, my + 0.3).setVisible(true);   // el número va dentro del medidor
        usados++;
      }
    }
    for (let i = usados; i < txtMedidores.length; i++) txtMedidores[i].setVisible(false);
  }

  // Marca del trío: un triangulito magenta en la esquina de cada una de las tres torres (así no tapa a los
  // medidores de combo). Se rellena a medida que se mejoran las tres; blanco y latiendo = listas para fusionar.
  function marcasTrio(g, en) {
    const ts = en.torres, tope = ts.reduce((s, t) => s + maxMejoras(t.tipo), 0) || 1;
    const k = Math.min(1, ts.reduce((s, t) => s + t.nivel, 0) / tope), late = (Math.sin(G.t * 6) + 1) / 2;
    for (const t of ts) {
      const x = t.x - 11, y = t.y - 11;
      g.fillStyle(0x2a0f24, 0.9).fillTriangle(x, y - 5.5, x - 5, y + 3.5, x + 5, y + 3.5);
      if (k >= 1) g.fillStyle(0xffffff, 0.6 + 0.4 * late).fillTriangle(x, y - 4, x - 3.6, y + 2.5, x + 3.6, y + 2.5);
      else if (k > 0) {
        const h = 6.5 * k;   // se llena de abajo hacia arriba
        g.fillStyle(0xff7ad9, 1).fillTriangle(x - 3.6 * (h / 6.5), y + 2.5 - h, x - 3.6, y + 2.5, x + 3.6, y + 2.5);
        g.fillStyle(0xff7ad9, 1).fillTriangle(x - 3.6 * (h / 6.5), y + 2.5 - h, x + 3.6 * (h / 6.5), y + 2.5 - h, x + 3.6, y + 2.5);
      }
      g.lineStyle(1.2, k >= 1 ? 0xffffff : 0xff7ad9, 1).strokeTriangle(x, y - 5.5, x - 5, y + 3.5, x + 5, y + 3.5);
    }
  }
  function medidorTrio(g, en) {
    const ts = en.torres, mx = (ts[0].x + ts[1].x + ts[2].x) / 3, my = (ts[0].y + ts[1].y + ts[2].y) / 3;
    const tope = ts.reduce((s, t) => s + maxMejoras(t.tipo), 0) || 1;
    const k = Math.min(1, ts.reduce((s, t) => s + t.nivel, 0) / tope), hace = k >= 1 ? (G.t % 1.2) : 9;
    g.fillStyle(0x2a0f24, 0.92).fillCircle(mx, my, 9);
    g.lineStyle(1, 0x000000, 0.5).strokeCircle(mx, my, 9);
    g.fillStyle(k >= 1 ? 0xffffff : 0xff7ad9, 0.95).fillTriangle(mx, my - 4.2, mx - 3.8, my + 2.6, mx + 3.8, my + 2.6);
    if (k > 0) {
      g.lineStyle(3.2, k >= 1 ? 0xffffff : 0xff7ad9, 1);
      g.beginPath(); g.arc(mx, my, 6.6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); g.strokePath();
    }
    if (hace < 0.5) {
      const q = hace / 0.5;
      g.lineStyle(3, 0xff7ad9, 1 - q).strokeCircle(mx, my, 9 + 24 * q);
      g.lineStyle(5, 0xffffff, 0.7 * (1 - q));
      for (const t of ts) g.lineBetween(mx, my, t.x, t.y);
    }
  }

  // Torres combo: losa grande oscura con borde dorado y su torreta propia
  function dibujarTorreCombo(g, t, alfa) {
    const x = t.x, y = t.y, a = t.ang, cs = Math.cos(a), sn = Math.sin(a), late = (Math.sin(G.t * 5 + x) + 1) / 2;
    const recien = t.tFuego != null && G.t - t.tFuego < 0.1;
    g.fillStyle(COL.sombra, 0.3 * alfa).fillRoundedRect(x - 15, y - 14, 36, 36, 6);
    g.fillStyle(0x3d4048, alfa).fillRoundedRect(x - 18, y - 18, 36, 36, 6);
    g.lineStyle(2, COL.oro, alfa).strokeRoundedRect(x - 18, y - 18, 36, 36, 6);
    g.lineStyle(1, 0xff7ad9, 0.7 * alfa).strokeRoundedRect(x - 15.5, y - 15.5, 31, 31, 5);
    if (t.tipo === 'rotativo') {
      g.fillStyle(0x2b2e30, alfa).fillCircle(x, y, 11);
      g.fillStyle(0x6b7a3e, alfa).fillCircle(x, y, 9);
      const giro = G.t * (t.activa ? 30 : 2);
      for (let i = 0; i < 6; i++) {
        const o = Math.sin(giro + i * 1.047) * 3.6;
        poli(g, x, y, a, caja(4, o - 0.9, 15, 1.8), 0x1a1c1e, alfa);
      }
      poli(g, x, y, a, caja(16, -4.6, 3, 9.2), 0x2b2e30, alfa);
      g.fillStyle(0x39421f, alfa).fillCircle(x, y, 4.5);
      if (recien) g.fillStyle(0xfff3a0, 0.95).fillCircle(x + cs * 21, y + sn * 21, 3.4);
    } else if (t.tipo === 'glacial') {
      g.lineStyle(3, COL.crioAzul, alfa).strokeCircle(x, y, 12);
      g.fillStyle(0x3a3350, alfa).fillCircle(x, y, 10.5);
      poli(g, x, y, a, caja(5, -3.4, 13, 6.8), 0x26202f, alfa);
      poli(g, x, y, a, caja(16, -4.6, 3, 9.2), COL.crioLuz, alfa);
      g.fillStyle(0xeaf8fd, alfa).fillCircle(x, y, 5 + late);
      g.fillStyle(COL.plasmaLuz, alfa).fillCircle(x, y, 2.6);
    } else if (t.tipo === 'domo') {
      g.fillStyle(0x56646e, alfa).fillCircle(x, y, 12);
      g.lineStyle(1.5, 0x2b343b, alfa).strokeCircle(x, y, 12);
      for (let i = 0; i < 4; i++) {
        const an = a + i * Math.PI / 2 + Math.PI / 4, px = x + Math.cos(an) * 6.5, py = y + Math.sin(an) * 6.5;
        g.fillStyle(0x15191c, alfa).fillCircle(px, py, 2.8);
        g.fillStyle(0xc0392b, alfa).fillCircle(px, py, 1.5);
      }
      g.lineStyle(1.6, 0xb87333, alfa).strokeCircle(x, y, 3.5);
      g.fillStyle(0xdfe8ff, alfa).fillCircle(x, y, 1.8);
    } else if (t.tipo === 'nucleo') {
      g.lineStyle(2.5, COL.crioAzul, alfa).strokeCircle(x, y, 12.5);
      g.fillStyle(0xeaf8fd, alfa).fillCircle(x, y, 10.5);
      for (let i = 0; i < 6; i++) {
        const an = i * 1.047 + G.t * 0.6;
        g.lineStyle(2, COL.crioAzul, alfa).lineBetween(x + Math.cos(an) * 4, y + Math.sin(an) * 4, x + Math.cos(an) * 10, y + Math.sin(an) * 10);
      }
      g.fillStyle(COL.crioLuz, alfa).fillCircle(x, y, 4 + late);
      g.fillStyle(0xffffff, alfa).fillCircle(x - 1, y - 1, 1.6);
    } else if (t.tipo === 'artilleria') {
      g.fillStyle(0x3d474e, alfa).fillCircle(x, y, 12.5);
      poli(g, x, y, a, caja(-11, -11, 22, 22), COL.misil, alfa, COL.misilOsc, 1.3);
      for (let i = 0; i < 8; i++) {
        const fx = -6 + (i % 4) * 4.2, fy = i < 4 ? -4 : 4, px = x + fx * cs - fy * sn, py = y + fx * sn + fy * cs;
        g.fillStyle(0x15191c, alfa).fillCircle(px, py, 1.9);
        g.fillStyle(0xc0392b, alfa).fillCircle(px, py, 1);
      }
      if (recien) poli(g, x, y, a, [[-11, -7], [-19, 0], [-11, 7]], 0xffc24a, 0.9);
    } else if (t.tipo === 'tesla') {
      g.fillStyle(0x33373d, alfa).fillCircle(x, y, 12.5);
      for (const r of [11, 8.5, 6]) g.lineStyle(2, 0xb87333, alfa).strokeCircle(x, y, r);
      g.fillStyle(0xdfe8ff, alfa).fillCircle(x, y, 4);
      if (t.activa && late > 0.5) {
        for (let i = 0; i < 5; i++) {
          const an = G.t * 11 + i * 1.257;
          g.lineStyle(1.4, 0xfff07a, 0.9 * alfa).lineBetween(x, y, x + Math.cos(an) * 15, y + Math.sin(an) * 15);
        }
      }
    } else if (t.tipo === 'prismatico') {
      g.fillStyle(0x3b3236, alfa).fillCircle(x, y, 12);
      for (const h of [t.haz, ...(t.hacesExtra || [])]) if (h && t.activa) poli(g, x, y, h.ang, caja(4, -1.8, 13, 3.6), 0x22191c, alfa);
      if (!t.activa) for (let i = 0; i < 3; i++) poli(g, x, y, i * 2.094 - 1.571, caja(4, -1.8, 13, 3.6), 0x22191c, alfa);
      g.fillStyle(0x8a2f2f, alfa).fillTriangle(x, y - 7, x - 6.2, y + 4.5, x + 6.2, y + 4.5);
      g.fillStyle(0xff9a9a, alfa).fillTriangle(x, y - 3.5, x - 3, y + 2.3, x + 3, y + 2.3);
    } else if (t.tipo === 'minero') {
      g.fillStyle(0x6d6340, alfa).fillCircle(x, y, 12);
      g.lineStyle(1.4, 0x37311c, alfa).strokeCircle(x, y, 12);
      g.fillStyle(0x4a4329, alfa).fillRect(x - 6, y - 6, 12, 12);
      g.fillStyle(recien ? 0xffd23f : 0x2a2615, alfa).fillRect(x - 4.5, y - 1, 9, 2);
      for (let i = 0; i < 5; i++) {
        const an = i * 1.257 + 0.3, mx = x + Math.cos(an) * 9.5, my = y + Math.sin(an) * 9.5;
        g.fillStyle(0x2b2a20, alfa).fillCircle(mx, my, 2.3);
        g.fillStyle(0xc0392b, alfa).fillCircle(mx, my, 0.9);
      }
    } else if (t.tipo === 'criobomba') {
      g.fillStyle(0x3d474e, alfa).fillCircle(x, y, 12.5);
      g.lineStyle(2, COL.crioAzul, alfa).strokeCircle(x, y, 12.5);
      poli(g, x, y, a, caja(-9, -8, 18, 16), 0x6b8a99, alfa, COL.misilOsc, 1.2);
      for (const fy of [-4, 0, 4]) {
        const px = x + 4 * cs - fy * sn, py = y + 4 * sn + fy * cs;
        g.fillStyle(0x15191c, alfa).fillCircle(px, py, 2);
        g.fillStyle(COL.crioLuz, alfa).fillCircle(px, py, 1.1);
      }
    } else {
      // Reactor: núcleo que late, anillo de cobre y emisor
      g.lineStyle(2.4, 0xb87333, alfa).strokeCircle(x, y, 12);
      g.fillStyle(0x2a0f24, alfa).fillCircle(x, y, 10.5);
      poli(g, x, y, a, caja(4, -2.6, 15, 5.2), 0x22191c, alfa);
      g.fillStyle(0xff7ad9, (0.55 + 0.4 * late) * alfa).fillCircle(x, y, 7);
      g.fillStyle(0xffffff, alfa).fillCircle(x, y, 3 + late);
      g.fillStyle(0xff3b3b, alfa).fillCircle(x + cs * 18, y + sn * 18, 2.6);
    }
  }

  function dibujarTorre(g, t, alfa) {
    if (D.torres[t.tipo].combo) {
      // Torre combo: se dibuja al mismo tamaño que las demás (30 px) y se distingue por un aura magenta que late
      const late = (Math.sin(G.t * 3 + t.x) + 1) / 2;
      g.fillStyle(0xff7ad9, (0.10 + 0.12 * late) * alfa).fillCircle(t.x, t.y, 19 + 2 * late);
      g.lineStyle(1.2, 0xff7ad9, (0.35 + 0.35 * late) * alfa).strokeCircle(t.x, t.y, 19 + 2 * late);
      g.save();
      g.translateCanvas(t.x, t.y);
      g.scaleCanvas(30 / 36, 30 / 36);
      dibujarTorreCombo(g, Object.assign({}, t, { x: 0, y: 0 }), alfa);
      g.restore();
      return;
    }
    const x = t.x, y = t.y, crio = t.tipo === 'crio';
    // Losa de hormigón con pernos
    g.fillStyle(COL.sombra, 0.25 * alfa).fillRoundedRect(x - 13, y - 12, 31, 31, 5);
    g.fillStyle(crio ? 0x8d959b : t.tipo === 'plasma' ? 0x8b879b : t.tipo === 'misiles' ? 0x8a9296 : COL.losa, alfa).fillRoundedRect(x - 15, y - 15, 30, 30, 5);
    g.lineStyle(1.5, COL.losaBorde, alfa).strokeRoundedRect(x - 15, y - 15, 30, 30, 5);
    g.lineStyle(1, COL.losaLuz, 0.8 * alfa).lineBetween(x - 11, y - 13.5, x + 11, y - 13.5).lineBetween(x - 13.5, y - 11, x - 13.5, y + 11);
    g.fillStyle(COL.losaBorde, alfa);
    for (const [dx, dy] of [[-11, -11], [11, -11], [-11, 11], [11, 11]]) g.fillCircle(x + dx, y + dy, 1.3);

    if (t.tipo === 'plasma') {
      // Emisor de plasma: cañón corto y grueso con núcleo violeta que late
      const a = t.ang, late = (Math.sin(G.t * 5 + x) + 1) / 2;
      const recien = t.tFuego != null && G.t - t.tFuego < 0.12;
      g.fillStyle(COL.sombra, 0.3 * alfa).fillCircle(x + 1.5, y + 2.5, 10);
      g.fillStyle(0x3a3350, alfa).fillCircle(x, y, 10);
      g.lineStyle(1, COL.plasmaOsc, alfa).strokeCircle(x, y, 10);
      poli(g, x, y, a, caja(3, -3.4, 12, 6.8), 0x26202f, alfa);
      poli(g, x, y, a, caja(13, -4.4, 3, 8.8), COL.plasma, alfa);
      poli(g, x, y, a, [[-7, -4], [-3, -7.5], [4, -7.5], [8, -4], [8, 4], [4, 7.5], [-3, 7.5], [-7, 4]], COL.plasma, alfa, COL.plasmaOsc, 1.2);
      const cs = Math.cos(a), sn = Math.sin(a);
      g.fillStyle(COL.plasmaLuz, alfa).fillCircle(x, y, 3.4 + late * 0.8);
      g.fillStyle(0xffffff, 0.9 * alfa).fillCircle(x, y, 1.5);
      g.fillStyle(recien ? 0xffffff : COL.plasmaLuz, (recien ? 1 : 0.55 + 0.3 * late) * alfa).fillCircle(x + cs * 16.5, y + sn * 16.5, recien ? 4.5 : 2.4);
    } else if (t.tipo === 'misiles') {
      // Lanzador: caja giratoria con cuatro tubos
      const a = t.ang;
      const recien = t.tFuego != null && G.t - t.tFuego < 0.15;
      g.fillStyle(COL.sombra, 0.3 * alfa).fillCircle(x + 1.5, y + 2.5, 9.5);
      g.fillStyle(0x3d474e, alfa).fillCircle(x, y, 9.5);
      g.lineStyle(1, COL.misilOsc, alfa).strokeCircle(x, y, 9.5);
      poli(g, x, y, a, caja(-8, -7.5, 17, 15), COL.misil, alfa, COL.misilOsc, 1.2);
      poli(g, x, y, a, caja(-8, -1, 17, 2), COL.misilOsc, alfa);
      poli(g, x, y, a, caja(-8, -7.5, 3, 15), 0x3d474e, alfa);
      for (const [tx, ty] of [[4, -4.4], [4, 4.4], [-2, -4.4], [-2, 4.4]]) {
        const cs = Math.cos(a), sn = Math.sin(a), px = x + tx * cs - ty * sn, py = y + tx * sn + ty * cs;
        g.fillStyle(0x15191c, alfa).fillCircle(px, py, 2.5);
        g.fillStyle(0xc0392b, alfa).fillCircle(px, py, 1.3);
      }
      if (recien) poli(g, x, y, a, [[-9, -5], [-16, 0], [-9, 5]], 0xffc24a, 0.9);
    } else if (t.tipo === 'minas') {
      // Minadora: tambor con escotilla y minas listas alrededor
      const recien = t.tFuego != null && G.t - t.tFuego < 0.25;
      g.fillStyle(COL.sombra, 0.3 * alfa).fillCircle(x + 1.5, y + 2.5, 9.5);
      g.fillStyle(0x6d6340, alfa).fillCircle(x, y, 9.5);
      g.lineStyle(1.2, 0x37311c, alfa).strokeCircle(x, y, 9.5);
      g.fillStyle(0x4a4329, alfa).fillRect(x - 4.5, y - 4.5, 9, 9);
      g.lineStyle(1, 0x2a2615, alfa).strokeRect(x - 4.5, y - 4.5, 9, 9);
      g.fillStyle(recien ? 0xffd23f : 0x2a2615, alfa).fillRect(x - 3, y - 0.8, 6, 1.6);
      for (let i = 0; i < 3; i++) {
        const an = i * 2.094 + 0.5, mx = x + Math.cos(an) * 6.8, my = y + Math.sin(an) * 6.8;
        g.fillStyle(0x2b2a20, alfa).fillCircle(mx, my, 2.4);
        g.fillStyle(0xc0392b, alfa).fillCircle(mx, my, 0.9);
      }
    } else if (t.tipo === 'laser') {
      // Láser: torreta con cañón largo y lente roja
      const a = t.ang, cs = Math.cos(a), sn = Math.sin(a), on = !!(t.haz && t.activa);
      g.fillStyle(COL.sombra, 0.3 * alfa).fillCircle(x + 1.5, y + 2.5, 9.5);
      g.fillStyle(0x3b3236, alfa).fillCircle(x, y, 9.5);
      g.lineStyle(1, 0x1c1719, alfa).strokeCircle(x, y, 9.5);
      poli(g, x, y, a, caja(0, -2.2, 16, 4.4), 0x22191c, alfa);
      poli(g, x, y, a, caja(13, -3, 3, 6), 0x5a2a2a, alfa);
      poli(g, x, y, a, [[-6, -6], [4, -5], [6, 0], [4, 5], [-6, 6], [-8, 0]], 0x8a2f2f, alfa, 0x3a1414, 1.1);
      g.fillStyle(on ? 0xffffff : 0xff6b6b, alfa).fillCircle(x, y, on ? 3 : 2.4);
      g.fillStyle(on ? 0xff3b3b : 0xff8a8a, alfa).fillCircle(x + cs * 16, y + sn * 16, on ? 3.2 : 1.8);
    } else if (t.tipo === 'rayo') {
      // Bobina de Tesla: anillos de cobre y esfera que chisporrotea
      const late = (Math.sin(G.t * 7 + x) + 1) / 2, recien = t.tFuego != null && G.t - t.tFuego < 0.15;
      g.fillStyle(COL.sombra, 0.3 * alfa).fillCircle(x + 1.5, y + 2.5, 10);
      g.fillStyle(0x33373d, alfa).fillCircle(x, y, 10);
      g.lineStyle(2.2, 0xb87333, alfa).strokeCircle(x, y, 8);
      g.lineStyle(2, 0xd08a4a, alfa).strokeCircle(x, y, 5.6);
      g.fillStyle(0xdfe8ff, alfa).fillCircle(x, y, 3.6);
      g.fillStyle(0xffffff, alfa).fillCircle(x - 1, y - 1, 1.3);
      if (recien || (t.activa && late > 0.85)) {
        for (let i = 0; i < 4; i++) {
          const an = G.t * 13 + i * 1.57;
          g.lineStyle(1.3, 0xfff07a, 0.9 * alfa).lineBetween(x, y, x + Math.cos(an) * 11, y + Math.sin(an) * 11);
        }
      }
    } else if (!crio) {
      const a = t.ang, doble = t.s && t.s.doble;
      const disparando = t.tFuego != null && G.t - t.tFuego < 0.06;
      g.fillStyle(COL.sombra, 0.3 * alfa).fillCircle(x + 1.5, y + 2.5, 9.5);
      g.fillStyle(0x4a5530, alfa).fillCircle(x, y, 9.5);
      g.lineStyle(1, COL.olivaOsc, alfa).strokeCircle(x, y, 9.5);
      // Cañones
      if (doble) {
        poli(g, x, y, a, caja(3, -4.6, 13, 3), COL.acero, alfa);
        poli(g, x, y, a, caja(3, 1.6, 13, 3), COL.acero, alfa);
        poli(g, x, y, a, caja(15, -5.2, 2.5, 4.2), 0x15171a, alfa);
        poli(g, x, y, a, caja(15, 1, 2.5, 4.2), 0x15171a, alfa);
      } else {
        poli(g, x, y, a, caja(3, -1.7, 14, 3.4), COL.acero, alfa);
        poli(g, x, y, a, caja(16, -2.6, 2.5, 5.2), 0x15171a, alfa);
      }
      // Torreta
      poli(g, x, y, a, [[-7, -5], [-5, -7], [4, -7], [7, -4], [7, 4], [4, 7], [-5, 7], [-7, 5]], COL.oliva, alfa, COL.olivaOsc, 1.2);
      poli(g, x, y, a, caja(-6, -3, 3, 6), 0x55622f, alfa);
      const cs = Math.cos(a), sn = Math.sin(a);
      g.fillStyle(0x8c9b58, alfa).fillCircle(x - cs * 0.5, y - sn * 0.5, 2.6);
      g.lineStyle(1, COL.olivaOsc, alfa).strokeCircle(x - cs * 0.5, y - sn * 0.5, 2.6);
      if (disparando) {
        for (const oy of doble ? [-3.1, 3.1] : [0]) {
          poli(g, x, y, a, [[18, oy - 3], [27, oy], [18, oy + 3]], 0xfff3a0, 1);
          poli(g, x, y, a, [[18, oy - 1.5], [23, oy], [18, oy + 1.5]], 0xffffff, 1);
        }
      }
    } else {
      // Boquillas en diagonal y estanque criogénico al centro
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + i * Math.PI / 2;
        poli(g, x, y, a, caja(6, -2.2, 7, 4.4), 0x5f7f92, alfa, 0x2d4654, 1);
        poli(g, x, y, a, caja(12, -1.4, 2.5, 2.8), COL.hielo, alfa);
      }
      g.fillStyle(COL.sombra, 0.3 * alfa).fillCircle(x + 1.5, y + 2.5, 9);
      g.fillStyle(0xeaf8fd, alfa).fillCircle(x, y, 8.5);
      g.lineStyle(2, COL.crioAzul, alfa).strokeCircle(x, y, 8.5);
      g.fillStyle(COL.crioLuz, alfa).fillCircle(x, y, 4.8);
      g.fillStyle(0xffffff, 0.9 * alfa).fillCircle(x - 2.6, y - 2.8, 1.7);
      if (t.activa) {
        const k = (Math.sin(G.t * 6) + 1) / 2;
        g.lineStyle(1.5, 0xffffff, 0.35 + 0.4 * k).strokeCircle(x, y, 11 + k * 2);
      }
    }
    // Marcas de mejora: un punto dorado por cada mejora comprada
    const n = t.nivel || 0;
    for (let i = 0; i < n; i++) {
      const px = x - (n - 1) * 1.5 + i * 3;
      g.fillStyle(0x3a2a10, alfa).fillRect(px - 1.5, y + 10, 3, 3.6);
      g.fillStyle(COL.oro, alfa).fillRect(px - 0.9, y + 10.6, 1.8, 2.4);
    }
    // Berserk: marco rojo que late, medidor de carga alrededor y destello al disparar
    if (t.berserk) {
      const k = (Math.sin(G.t * 5) + 1) / 2, c = Math.min(1, t.bCarga || 0), hace = G.t - (t.tBerserk == null ? -9 : t.tBerserk);
      g.lineStyle(1.6, 0xff4a2a, (0.45 + 0.45 * k) * alfa).strokeRoundedRect(x - 16.5, y - 16.5, 33, 33, 6);
      if (c > 0) {
        g.lineStyle(2.4, c >= 1 ? 0xffffff : 0xff7a3a, alfa);
        g.beginPath(); g.arc(x, y, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * c); g.strokePath();
      }
      if (hace >= 0 && hace < 0.45) {
        const q = hace / 0.45;
        g.lineStyle(3, 0xff6a3a, 1 - q).strokeCircle(x, y, 18 + 22 * q);
      }
    }
  }

  function dibujarEnemigo(g, e) {
    const x = e.x, y = e.y, blind = e.tipo === 'blindado', jefe = !!e.def.jefe;
    // Giro suave en las curvas (solo visual)
    const meta = recto(e.def) ? AIRE.ang : anguloEn(e.dist, e.ruta);
    if (e.va == null) e.va = meta;
    let dif = meta - e.va;
    while (dif > Math.PI) dif -= Math.PI * 2;
    while (dif < -Math.PI) dif += Math.PI * 2;
    e.va += dif * 0.25;
    const a = e.va;

    if (jefe) {
      // Tanque pesado: casco ancho negro con franjas rojas, borde dorado y cañón doble
      poli(g, x + 3, y + 4, a, caja(-19, -15, 38, 30), COL.sombra, 0.32);
      poli(g, x, y, a, caja(-18, -15.5, 36, 7), 0x1a1716, 1);
      poli(g, x, y, a, caja(-18, 8.5, 36, 7), 0x1a1716, 1);
      const paso = (e.dist * 0.5) % 5;
      for (let k = -17 + paso; k < 17; k += 5) {
        poli(g, x, y, a, caja(k, -15.5, 1.4, 7), 0x6a6460, 0.9);
        poli(g, x, y, a, caja(k, 8.5, 1.4, 7), 0x6a6460, 0.9);
      }
      poli(g, x, y, a, [[-17, -11], [11, -11], [19, -5], [19, 5], [11, 11], [-17, 11]], 0x2f2a28, 1, COL.oro, 1.6);
      const franja = e.tipo === 'jefeFinal' ? COL.oro : COL.rojo;   // el jefe final lleva franjas doradas
      poli(g, x, y, a, caja(-12, -11, 4, 22), franja, 1);
      poli(g, x, y, a, caja(-5, -11, 4, 22), franja, 1);
      poli(g, x, y, a, caja(-16, -5, 3, 10), 0x15171a, 1);
      poli(g, x, y, a, caja(5, -5.2, 17, 3.4), 0x121110, 1);
      poli(g, x, y, a, caja(5, 1.8, 17, 3.4), 0x121110, 1);
      poli(g, x, y, a, caja(20, -6, 3, 5), 0x000000, 1);
      poli(g, x, y, a, caja(20, 1, 3, 5), 0x000000, 1);
      const cs = Math.cos(a), sn = Math.sin(a);
      g.fillStyle(0x3a3634, 1).fillCircle(x + cs * 2, y + sn * 2, 8.5);
      g.lineStyle(1.6, COL.oro, 1).strokeCircle(x + cs * 2, y + sn * 2, 8.5);
      g.fillStyle(COL.rojo, 1).fillCircle(x + cs * 2, y + sn * 2, 3.6);
      g.fillStyle(0xff8a8a, 1).fillCircle(x + cs * 2 - 1, y + sn * 2 - 1.2, 1.3);
      // Antena de enlace con TERMINUS
      const ax = x - cs * 10 + sn * 7, ay = y - sn * 10 - cs * 7;
      g.lineStyle(1.4, 0x8a949e, 1).lineBetween(x - cs * 6 + sn * 5, y - sn * 6 - cs * 5, ax, ay);
      g.fillStyle(0xff3b3b, 0.6 + 0.4 * Math.sin(G.t * 6)).fillCircle(ax, ay, 1.8);
    } else if (blind) {
      poli(g, x + 2, y + 3, a, caja(-12, -9, 24, 18), COL.sombra, 0.28);
      poli(g, x, y, a, caja(-11, -9.5, 22, 4.5), COL.carbonOsc, 1);
      poli(g, x, y, a, caja(-11, 5, 22, 4.5), COL.carbonOsc, 1);
      const paso = (e.dist * 0.5) % 4;
      for (let k = -10 + paso; k < 10; k += 4) {
        poli(g, x, y, a, caja(k, -9.5, 1, 4.5), 0x6a6460, 0.9);
        poli(g, x, y, a, caja(k, 5, 1, 4.5), 0x6a6460, 0.9);
      }
      poli(g, x, y, a, [[-10, -6.5], [7, -6.5], [11.5, -3], [11.5, 3], [7, 6.5], [-10, 6.5]], COL.carbon, 1, COL.carbonOsc, 1.2);
      poli(g, x, y, a, caja(-5, -6.5, 3, 13), COL.rojo, 1);
      poli(g, x, y, a, caja(-9, -3.5, 2.5, 7), COL.carbonOsc, 1);
      poli(g, x, y, a, caja(2, -1.1, 9, 2.2), 0x1c1a19, 1);
      const cs = Math.cos(a), sn = Math.sin(a);
      g.fillStyle(0x3a3634, 1).fillCircle(x + cs * 1, y + sn * 1, 4.6);
      g.lineStyle(1, 0x1c1a19, 1).strokeCircle(x + cs * 1, y + sn * 1, 4.6);
      g.fillStyle(0xff3b3b, 1).fillCircle(x + cs * 2.4, y + sn * 2.4, 1.6);   // sensor de TERMINUS (sin tripulación)
    } else if (e.tipo === 'corredor') {
      // Rastreador: robot de cuatro patas, cuerpo en cuña y ojo sensor rojo
      poli(g, x + 1.5, y + 2.5, a, caja(-9, -5.5, 18, 11), COL.sombra, 0.26);
      const zanc = Math.sin(e.dist * 0.6) * 2.2;
      for (const [rx, ry, f] of [[-5, -4, 1], [4, -4, -1], [-5, 4, -1], [4, 4, 1]]) {
        const cs2 = Math.cos(a), sn2 = Math.sin(a), bx = x + rx * cs2 - ry * sn2, by = y + rx * sn2 + ry * cs2;
        const lx = rx + zanc * f, ly = ry + Math.sign(ry) * 3.5;
        g.lineStyle(1.6, 0x262b30, 1).lineBetween(bx, by, x + lx * cs2 - ly * sn2, y + lx * sn2 + ly * cs2);
      }
      poli(g, x, y, a, [[-8, -3.6], [3, -3.6], [9, -1.2], [9, 1.2], [3, 3.6], [-8, 3.6]], 0x5d6670, 1, 0x262b30, 1.1);
      poli(g, x, y, a, caja(-6, -1, 7, 2), 0xff3b3b, 0.85);
      const cs = Math.cos(a), sn = Math.sin(a);
      g.fillStyle(0x262b30, 1).fillCircle(x + cs * 5.5, y + sn * 5.5, 2.3);
      g.fillStyle(0xff3b3b, 1).fillCircle(x + cs * 6, y + sn * 6, 1.3);
    } else if (e.tipo === 'dron') {
      // Dron de cuatro rotores: la sombra queda lejos porque vuela
      g.fillStyle(COL.sombra, 0.2).fillEllipse(x + 8, y + 11, 18, 11);
      poli(g, x, y, a + Math.PI / 4, caja(-9.5, -1.3, 19, 2.6), 0x3a3634, 1);
      poli(g, x, y, a - Math.PI / 4, caja(-9.5, -1.3, 19, 2.6), 0x3a3634, 1);
      for (let i = 0; i < 4; i++) {
        const ar = a + Math.PI / 4 + i * Math.PI / 2, rx = x + Math.cos(ar) * 9.5, ry = y + Math.sin(ar) * 9.5;
        g.fillStyle(0xcfd6dc, 0.55).fillCircle(rx, ry, 4.8);
        g.lineStyle(1, 0x2a2625, 0.9).strokeCircle(rx, ry, 4.8);
        const ap = G.t * 40 + i;
        g.lineStyle(1.2, 0x2a2625, 0.8).lineBetween(rx - Math.cos(ap) * 4.2, ry - Math.sin(ap) * 4.2, rx + Math.cos(ap) * 4.2, ry + Math.sin(ap) * 4.2);
      }
      g.fillStyle(0x2a2625, 1).fillCircle(x, y, 4.6);
      g.lineStyle(1, 0x000000, 1).strokeCircle(x, y, 4.6);
      g.fillStyle(COL.rojo, 1).fillCircle(x, y, 2);
    } else {
      // Androide de TERMINUS: hombros de metal, núcleo de energía en la espalda, brazo-cañón y visor rojo
      const vaiven = Math.sin(e.dist * 0.45) * 0.9;
      const px = x - Math.sin(a) * vaiven, py = y + Math.cos(a) * vaiven;
      g.fillStyle(COL.sombra, 0.26).fillEllipse(px + 1.5, py + 2.5, 14, 11);
      poli(g, px, py, a, caja(-6.5, -2.6, 3, 5.2), 0x2b3036, 1);                     // batería
      poli(g, px, py, a, caja(-6, -1.2, 1.6, 2.4), 0xff3b3b, 0.9);                   // luz de la batería
      poli(g, px, py, a, [[-4, -6.8], [2.5, -6.8], [4.2, -4.5], [4.2, 4.5], [2.5, 6.8], [-4, 6.8], [-5, 0]], 0x5d6670, 1, 0x262b30, 1.1);
      poli(g, px, py, a, caja(1.5, 2.8, 10, 2.2), 0x262b30, 1);                      // brazo-cañón
      poli(g, px, py, a, caja(10.5, 3.1, 1.5, 1.6), 0xff3b3b, 1);
      const cs = Math.cos(a), sn = Math.sin(a), hx = px + cs * 0.8, hy = py + sn * 0.8;
      g.fillStyle(0x8a949e, 1).fillCircle(hx, hy, 3.7);
      g.lineStyle(1, 0x262b30, 1).strokeCircle(hx, hy, 3.7);
      poli(g, hx, hy, a, caja(1.2, -2.4, 2.2, 4.8), 0xff3b3b, 1);                    // visor
    }

    const rr = jefe ? 24 : blind ? 14 : e.tipo === 'corredor' ? 12 : 10;
    if (e.congelado > 0) {
      g.fillStyle(COL.hielo, 0.6).fillCircle(x, y, rr);
      g.lineStyle(1.8, 0xffffff, 1).strokeCircle(x, y, rr);
    } else if (e.lento > 0) {
      g.fillStyle(COL.crioLuz, 0.22).fillCircle(x, y, rr);
      g.lineStyle(1.5, COL.crioAzul, 0.9).strokeCircle(x, y, rr);
    }
    if (e.aturdido > 0) {
      // Aturdido: chispas amarillas girando
      for (let i = 0; i < 3; i++) {
        const as = G.t * 9 + i * 2.1;
        g.fillStyle(COL.oro, 1).fillCircle(x + Math.cos(as) * rr, y + Math.sin(as) * rr * 0.7 - 2, 1.8);
      }
    }
    if (e.vida < e.vidaMax) {
      const k = Math.max(0, e.vida / e.vidaMax), w = jefe ? 40 : blind ? 24 : 18, by = y - (jefe ? 27 : blind ? 19 : 15);
      g.fillStyle(0x1b1b1b, 0.8).fillRect(x - w / 2 - 1, by - 1, w + 2, 5);
      g.fillStyle(k > 0.5 ? 0x3ddc6a : k > 0.25 ? 0xffb020 : 0xff4a3a, 1).fillRect(x - w / 2, by, w * k, 3);
    }
  }

  function dibujar() {
    const g = gDin;
    g.clear();

    // Zonas de frío activas
    for (const t of G.torres) {
      if (t.s && t.s.lento && t.activa) {
        g.fillStyle(COL.hielo, 0.22).fillCircle(t.x, t.y, t.s.alcance);
        g.lineStyle(1, 0xffffff, 0.5).strokeCircle(t.x, t.y, t.s.alcance);
      }
    }

    // Lugar elegido para construir: muestra alcance, combos que se activarían y la torre "fantasma"
    if (G.puntoSel && G.tipoSel) {
      const { x, y, ok } = G.puntoSel, def = D.torres[G.tipoSel];
      // Zona de combo de las torres cercanas que combinan con la que se va a construir
      for (const t of G.torres) {
        if (sinergiaDe(G.tipoSel, t.tipo).length && Math.hypot(t.x - x, t.y - y) < 130) {
          circuloPunteado(g, t.x, t.y, COLOC.distCombo, 0x3a2a10, 0.35, 2.5);
          circuloPunteado(g, t.x, t.y, COLOC.distCombo, COL.oro, 0.85, 1.2);
        }
      }
      marcarAlcance(g, x, y, def.alcance, G.tipoSel);
      if (ok) {
        for (const t of G.torres) {
          if (contiguas({ x, y }, t) && sinergiaDe(G.tipoSel, t.tipo).length) enlace(g, x, y, t.x, t.y, 0.9);
        }
        g.lineStyle(2, 0xffffff, 0.9).strokeRoundedRect(x - 18, y - 18, 36, 36, 7);
      }
      dibujarTorre(g, { tipo: G.tipoSel, x, y, ang: -Math.PI / 2, nivel: 0 }, 0.7);
      if (!ok) {
        g.fillStyle(0xe5342a, 0.45).fillRoundedRect(x - 17, y - 17, 34, 34, 6);
        g.lineStyle(2.5, 0xffffff, 0.95).lineBetween(x - 8, y - 8, x + 8, y + 8).lineBetween(x + 8, y - 8, x - 8, y + 8);
      }
    }

    if (G.torreSel) marcarAlcance(g, G.torreSel.x, G.torreSel.y, G.torreSel.s.alcance, G.torreSel.tipo);
    for (const en of G.enlaces || []) if (!en.trio) enlace(g, en.a.x, en.a.y, en.b.x, en.b.y, 0.85);
    // Minas sembradas en el camino
    for (const m of G.minas || []) {
      g.fillStyle(0x000000, 0.25).fillCircle(m.x + 1, m.y + 1.5, 4.6);
      g.fillStyle(0x3b3a2c, 1).fillCircle(m.x, m.y, 4.3);
      g.lineStyle(1, 0x1c1b14, 1).strokeCircle(m.x, m.y, 4.3);
      g.fillStyle(0x6d6340, 1).fillCircle(m.x, m.y, 2.2);
      const parpadeo = Math.sin((G.t - m.t0) * 6) > 0.4;
      g.fillStyle(parpadeo ? 0xff4a3a : 0x7a2a22, 1).fillCircle(m.x, m.y, 1.1);
    }
    for (const t of G.torres) dibujarTorre(g, t, 1);
    medidoresCombo(g);
    for (const en of G.enlaces || []) if (en.trio) marcasTrio(g, en);
    if (G.torreSel) {
      const t = G.torreSel;
      g.lineStyle(4, 0x3a2a10, 0.5).strokeRoundedRect(t.x - 18, t.y - 18, 36, 36, 7);
      g.lineStyle(2, 0xffffff, 1).strokeRoundedRect(t.x - 18, t.y - 18, 36, 36, 7);
    }

    for (const e of G.enemigos) dibujarEnemigo(g, e);

    // Haces de las torres láser
    for (const t of G.torres) {
      if (!t.haz || !t.activa) continue;
      const parpadeo = 0.85 + 0.15 * Math.sin(G.t * 40 + t.x);
      for (const h of [t.haz, ...(t.hacesExtra || [])]) {
        const an = h.ang != null ? h.ang : t.ang, ox = t.x + Math.cos(an) * 16, oy = t.y + Math.sin(an) * 16;
        g.lineStyle(h.ancho * 1.6, h.furia ? 0xff9a3a : 0xff3b3b, 0.18 * parpadeo).lineBetween(ox, oy, h.x2, h.y2);
        g.lineStyle(Math.max(2, h.ancho * 0.55), h.furia ? 0xffb35a : 0xff4d4d, 0.65 * parpadeo).lineBetween(ox, oy, h.x2, h.y2);
        g.lineStyle(h.furia ? 2.4 : 1.4, 0xffffff, 0.9).lineBetween(ox, oy, h.x2, h.y2);
      }
    }

    // Proyectiles en vuelo
    for (const p of G.proyectiles) {
      if (p.espera > 0) continue;
      const a = p.ang || 0, cs = Math.cos(a), sn = Math.sin(a);
      if (p.k === 'plasma') {
        const r = p.critico ? 6 : 4;
        g.lineStyle(r, 0xb98bff, 0.35).lineBetween(p.x - cs * 12, p.y - sn * 12, p.x, p.y);
        g.fillStyle(0xb98bff, 0.6).fillCircle(p.x, p.y, r + 2);
        g.fillStyle(COL.plasmaLuz, 1).fillCircle(p.x, p.y, r);
        g.fillStyle(0xffffff, 1).fillCircle(p.x, p.y, r * 0.45);
      } else {
        g.lineStyle(3, 0xffffff, 0.35).lineBetween(p.x - cs * 16, p.y - sn * 16, p.x - cs * 6, p.y - sn * 6);
        poli(g, p.x, p.y, a, [[-9, -1.5], [-5, 0], [-9, 1.5]], 0xffa62b, 1);
        poli(g, p.x, p.y, a, caja(-5, -1.8, 8, 3.6), 0xe8ecef, 1, 0x3d474e, 0.8);
        poli(g, p.x, p.y, a, [[3, -1.8], [6.5, 0], [3, 1.8]], 0xc0392b, 1);
      }
    }

    for (const f of G.efectos) {
      const k = f.t / f.dur;
      if (f.k === 'traza') {
        g.lineStyle(f.h ? 3 : 2, f.h ? 0x9fe8ff : 0xfff3a0, 0.9 * (1 - k)).lineBetween(f.x1, f.y1, f.x2, f.y2);
        g.fillStyle(0xffffff, 1 - k).fillCircle(f.x2, f.y2, f.h ? 3.4 : 2.2);
      } else if (f.k === 'chispa') {
        // Descarga eléctrica en zigzag
        const dx = f.x2 - f.x1, dy = f.y2 - f.y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
        const pts = [[f.x1, f.y1]];
        for (let i = 1; i < 5; i++) {
          const off = Math.sin(f.s + i * 2.7 + f.t * 30) * Math.min(7, L * 0.12);
          pts.push([f.x1 + dx * i / 5 + nx * off, f.y1 + dy * i / 5 + ny * off]);
        }
        pts.push([f.x2, f.y2]);
        for (let i = 0; i < pts.length - 1; i++) {
          g.lineStyle(4, f.color, 0.45 * (1 - k)).lineBetween(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
          g.lineStyle(1.4, 0xffffff, 1 - k).lineBetween(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
        }
        g.fillStyle(0xffffff, 0.9 * (1 - k)).fillCircle(f.x2, f.y2, 2.6);
      } else if (f.k === 'rayo') {
        g.lineStyle(3 + 9 * (1 - k), f.color, 0.6 * (1 - k)).lineBetween(f.x1, f.y1, f.x2, f.y2);
        g.lineStyle(1 + 3 * (1 - k), 0xffffff, 1 - k).lineBetween(f.x1, f.y1, f.x2, f.y2);
      } else if (f.k === 'hielo') {
        const r = f.r * (0.35 + 0.65 * k);
        g.fillStyle(0xe8fbff, 0.6 * (1 - k)).fillCircle(f.x, f.y, r);
        g.lineStyle(3, 0xffffff, 1 - k).strokeCircle(f.x, f.y, r);
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4 + 0.3, cs = Math.cos(a), sn = Math.sin(a);
          g.lineStyle(2.2, COL.crioAzul, 1 - k).lineBetween(f.x + cs * r * 0.4, f.y + sn * r * 0.4, f.x + cs * r * 1.08, f.y + sn * r * 1.08);
        }
      } else if (f.k === 'anillo') {
        g.lineStyle(4, 0xffffff, 0.9 * (1 - k)).strokeCircle(f.x, f.y, f.r * (0.3 + 0.7 * k));
        g.lineStyle(2, COL.crioAzul, 1 - k).strokeCircle(f.x, f.y, f.r * (0.3 + 0.7 * k) - 3);
      } else if (f.k === 'estallido') {
        const r = f.r * (0.4 + 0.6 * k);
        g.fillStyle(f.color, 0.5 * (1 - k)).fillCircle(f.x, f.y, r);
        g.fillStyle(0xffffff, 0.7 * (1 - k)).fillCircle(f.x, f.y, r * 0.45);
        g.lineStyle(2.5, f.color, 1 - k).strokeCircle(f.x, f.y, r);
      } else if (f.k === 'polvo') {
        g.fillStyle(TM.polvo[0], 0.75 * (1 - k)).fillCircle(f.x, f.y, 4 + 9 * k);
        g.fillStyle(TM.polvo[1], 0.5 * (1 - k)).fillCircle(f.x + 3, f.y - 2, 3 + 6 * k);
      } else if (f.k === 'explosion') {
        const z = f.e || 1;
        g.fillStyle(0x2a2625, 0.5 * (1 - k)).fillCircle(f.x, f.y, (8 + 14 * k) * z);
        g.fillStyle(0xff8a1f, 0.95 * (1 - k)).fillCircle(f.x, f.y, (5 + 11 * k) * z);
        g.fillStyle(0xfff3a0, 1 - k).fillCircle(f.x, f.y, (3 + 5 * k) * z);
      }
    }

    // Barra de vida del jefe: va en la página (no en el mapa) para que se vea aunque haya zoom
    const jefe = G.enemigos.find(e => e.def.jefe && e.vivo);
    mostrar($('barraJefe'), !!jefe);
    if (jefe) {
      poner($('barraJefeVida').style, 'width', Math.round(Math.max(0, jefe.vida / jefe.vidaMax) * 100) + '%');
      poner($('barraJefeNombre'), 'textContent', jefe.def.nombre.toUpperCase());
    }
  }

  // ── Zoom del mapa: pellizcar con dos dedos, rueda del mouse o botones + / −. Con zoom, un dedo arrastra el mapa ──
  const ZMAX = 2.5;
  let zoomMapa = 1;
  // Cambia el zoom dejando fijo el punto del mapa que está bajo (sx, sy) en la pantalla del juego
  function fijarZoom(z, sx, sy) {
    if (!escena) return;
    const cam = escena.cameras.main, w = cam.width, h = cam.height;
    z = Math.max(1, Math.min(ZMAX, z));
    if (sx == null) { sx = w / 2; sy = h / 2; }
    const z0 = ESC * zoomMapa, z1 = ESC * z;
    const px = cam.scrollX + w / 2 + (sx - w / 2) / z0, py = cam.scrollY + h / 2 + (sy - h / 2) / z0;
    zoomMapa = z;
    cam.setZoom(z1);
    cam.setScroll(px - (sx - w / 2) / z1 - w / 2, py - (sy - h / 2) / z1 - h / 2);
    mostrar($('zoomMenos'), z > 1.01);
  }
  function zoomInicial() {
    if (!escena) return;
    zoomMapa = 1;
    const cam = escena.cameras.main;
    cam.setZoom(ESC);
    cam.centerOn(W / 2, H / 2);
    mostrar($('zoomMenos'), false);
  }

  const escenaJuego = {
    create() {
      escena = this;
      const cam = this.cameras.main;
      cam.setBounds(0, 0, W, H);
      cam.setZoom(ESC);
      cam.centerOn(W / 2, H / 2);
      this.input.addPointer(1);   // segundo dedo, para pellizcar
      gFondo = this.add.graphics();
      const estilo = { fontFamily: 'system-ui, sans-serif', fontSize: '8px', fontStyle: 'bold', color: '#5a3d1a' };
      txtBase = this.add.text(0, 0, 'BASE', estilo).setOrigin(1, 0).setResolution(resTxt());
      pintarMapa();
      gDin = this.add.graphics().setDepth(2);
      this.input.mouse && this.input.mouse.disableContextMenu();
      // Toques: al construir o mover, tocar ubica la torre y arrastrar la acomoda (como siempre).
      // En otro caso, el toque se resuelve al soltar: si el dedo no se movió es un toque normal; si se movió
      // y hay zoom, arrastra el mapa. Dos dedos: pellizcar para acercar o alejar.
      let arrastre = false, toque = null, pinza = null;
      const p1 = () => this.input.pointer1, p2 = () => this.input.pointer2;
      const dosDedos = () => p1().isDown && p2().isDown;
      const umbral = 7 * ESC;
      this.input.on('pointerdown', p => {
        if (dosDedos()) {
          const a = p1(), b = p2();
          pinza = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: zoomMapa };
          toque = null; arrastre = false;
          return;
        }
        const pt = cam.getWorldPoint(p.x, p.y);
        if (G.tipoSel || G.moviendo) { arrastre = tocarMapa(pt.x, pt.y); toque = null; return; }
        toque = { x: p.x, y: p.y, sx: cam.scrollX, sy: cam.scrollY, movio: false };
      });
      this.input.on('pointermove', p => {
        if (pinza) {
          if (!dosDedos()) return;
          const a = p1(), b = p2();
          fijarZoom(pinza.z * Math.hypot(a.x - b.x, a.y - b.y) / pinza.d, (a.x + b.x) / 2, (a.y + b.y) / 2);
          return;
        }
        if (arrastre) {
          if (!p.isDown || !G.tipoSel || G.fase !== 'jugando') return;
          const pt = cam.getWorldPoint(p.x, p.y);
          G.puntoSel = ajustar(pt.x, pt.y);
          return;
        }
        if (toque && p.isDown) {
          const dx = p.x - toque.x, dy = p.y - toque.y;
          if (!toque.movio && Math.hypot(dx, dy) > umbral) toque.movio = true;
          if (toque.movio && zoomMapa > 1) cam.setScroll(toque.sx - dx / cam.zoom, toque.sy - dy / cam.zoom);
        }
      });
      this.input.on('pointerup', p => {
        if (pinza) { if (!dosDedos()) pinza = null; toque = null; arrastre = false; return; }
        if (toque && !toque.movio) {
          const pt = cam.getWorldPoint(p.x, p.y);
          tocarMapa(pt.x, pt.y);
        }
        toque = null; arrastre = false;
      });
      // Rueda del mouse (PC): acerca o aleja donde está el puntero
      this.input.on('wheel', (p, objs, dx, dy) => fijarZoom(zoomMapa * (dy < 0 ? 1.2 : 1 / 1.2), p.x, p.y));
      listo = true;
      refrescarTodo();
    },
    update() {
      // Tiempo real entre cuadros (tope 200 ms), medido con el reloj y no con el de Phaser,
      // para que el juego avance a su velocidad aunque el teléfono dibuje lento
      const ahora = performance.now();
      const delta = Math.min(200, ahora - (tPrevio || ahora));
      tPrevio = ahora;
      if (G.fase === 'jugando' && !G.pausa) {
        let resto = delta / 1000 * G.vel;
        while (resto > 1e-6 && G.fase === 'jugando') {
          const paso = Math.min(resto, 1 / 30);
          avanzar(paso);
          resto -= paso;
        }
      }
      const dtReal = delta / 1000;
      for (const f of flotantes) {
        const dur = f.dur || 0.8;
        f.t += dtReal; f.o.y = f.y0 - (f.sube || 22) * f.t;
        f.o.setAlpha(Math.max(0, Math.min(1, (1 - f.t / dur) * 2.5)));
      }
      flotantes = flotantes.filter(f => { if (f.t >= (f.dur || 0.8)) { f.o.destroy(); return false; } return true; });
      dibujar();
      // Música según la situación y zumbido de los láser
      if (SON.activo()) {
        const hayJefe = G.enemigos.some(e => e.def.jefe && e.vivo);
        SON.fijarIntensidad(G.fase !== 'jugando' ? 0 : G.pausa ? 1 : hayJefe ? 3 : (G.enemigos.length || G.generando) ? 2 : 1);
        SON.laser(G.fase === 'jugando' && !G.pausa && G.torres.some(t => t.haz && t.activa));
      }
      tUI += delta;
      if (tUI >= 100) { tUI = 0; refrescarTodo(); }
    }
  };
  let listo = false, tUI = 0, tPrevio = 0;

  // ───────────────────────── 6. INTERFAZ HTML ─────────────────────────
  // Devuelve true si quedó una torre por ubicar (para permitir arrastrarla)
  function tocarMapa(x, y) {
    if (G.fase !== 'jugando') return false;
    let colocando = false;
    const t = torreEn(x, y);
    if (G.moviendo) { G.puntoSel = ajustarMover(x, y); return true; }
    if (t) { G.torreSel = t; G.puntoSel = null; G.tipoSel = null; }
    else if (G.tipoSel) { G.puntoSel = ajustar(x, y); G.torreSel = null; colocando = true; }
    else { G.torreSel = null; G.puntoSel = null; }
    refrescarTodo();
    return colocando;
  }

  // Escribe en el DOM solo si el valor cambió (evita perder toques al redibujar)
  function poner(el, prop, v) { if (el[prop] !== v) el[prop] = v; }
  function mostrar(el, si) { poner(el, 'hidden', !si); }

  const ICONO = {
    ametralladora: '<svg viewBox="0 0 20 20" width="22" height="22"><rect x="2" y="2" width="16" height="16" rx="3" fill="#928f85" stroke="#5d5a52"/><rect x="8.6" y="1" width="2.8" height="9" fill="#2b2e30"/><circle cx="10" cy="11" r="4.6" fill="#6b7a3e" stroke="#39421f"/><circle cx="10" cy="11" r="1.6" fill="#8c9b58"/></svg>',
    crio: '<svg viewBox="0 0 20 20" width="22" height="22"><rect x="2" y="2" width="16" height="16" rx="3" fill="#8d959b" stroke="#5d5a52"/><path d="M5 5l10 10M15 5L5 15" stroke="#5f7f92" stroke-width="2.6"/><circle cx="10" cy="10" r="4.6" fill="#eaf8fd" stroke="#2f86ad" stroke-width="1.4"/><circle cx="10" cy="10" r="2.2" fill="#7fd4f0"/></svg>',
    plasma: '<svg viewBox="0 0 20 20" width="22" height="22"><rect x="2" y="2" width="16" height="16" rx="3" fill="#8b879b" stroke="#5d5a52"/><rect x="8" y="1.5" width="4" height="8" fill="#26202f"/><circle cx="10" cy="11" r="5" fill="#6a4fb0" stroke="#2f2350"/><circle cx="10" cy="11" r="2.2" fill="#d2b6ff"/><circle cx="10" cy="2.6" r="1.6" fill="#d2b6ff"/></svg>',
    misiles: '<svg viewBox="0 0 20 20" width="22" height="22"><rect x="2" y="2" width="16" height="16" rx="3" fill="#8a9296" stroke="#5d5a52"/><rect x="5" y="5" width="10" height="11" rx="1" fill="#56646e" stroke="#2b343b"/><circle cx="7.8" cy="8" r="1.6" fill="#c0392b" stroke="#15191c"/><circle cx="12.2" cy="8" r="1.6" fill="#c0392b" stroke="#15191c"/><circle cx="7.8" cy="12.5" r="1.6" fill="#c0392b" stroke="#15191c"/><circle cx="12.2" cy="12.5" r="1.6" fill="#c0392b" stroke="#15191c"/></svg>',
    minas: '<svg viewBox="0 0 20 20" width="22" height="22"><rect x="2" y="2" width="16" height="16" rx="3" fill="#8f8a78" stroke="#5d5a52"/><circle cx="10" cy="10" r="5.2" fill="#6d6340" stroke="#37311c"/><rect x="7.6" y="7.6" width="4.8" height="4.8" fill="#4a4329"/><circle cx="4.8" cy="15" r="1.7" fill="#2b2a20"/><circle cx="15.2" cy="15" r="1.7" fill="#2b2a20"/><circle cx="4.8" cy="15" r=".7" fill="#e5342a"/><circle cx="15.2" cy="15" r=".7" fill="#e5342a"/></svg>',
    laser: '<svg viewBox="0 0 20 20" width="22" height="22"><rect x="2" y="2" width="16" height="16" rx="3" fill="#8e8688" stroke="#5d5a52"/><rect x="9" y="1" width="2" height="8" fill="#22191c"/><circle cx="10" cy="11.5" r="4.8" fill="#8a2f2f" stroke="#3a1414"/><circle cx="10" cy="11.5" r="1.8" fill="#ff6b6b"/><circle cx="10" cy="1.8" r="1.4" fill="#ff3b3b"/></svg>',
    rayo: '<svg viewBox="0 0 20 20" width="22" height="22"><rect x="2" y="2" width="16" height="16" rx="3" fill="#878d94" stroke="#5d5a52"/><circle cx="10" cy="10" r="5.6" fill="#33373d" stroke="#b87333" stroke-width="1.4"/><circle cx="10" cy="10" r="3.4" fill="none" stroke="#d08a4a" stroke-width="1.2"/><circle cx="10" cy="10" r="1.9" fill="#dfe8ff"/><path d="M14.5 3.5l-2 3h2l-2 3" stroke="#fff07a" stroke-width="1" fill="none"/></svg>',
    rotativo: '<svg viewBox="0 0 20 20" width="22" height="22"><rect x="1.5" y="1.5" width="17" height="17" rx="3" fill="#3d4048" stroke="#ffd23f" stroke-width="1.2"/><rect x="8" y="1" width="1.4" height="9" fill="#1a1c1e"/><rect x="10.6" y="1" width="1.4" height="9" fill="#1a1c1e"/><circle cx="10" cy="11.5" r="4.6" fill="#6b7a3e" stroke="#2b2e30"/><circle cx="10" cy="11.5" r="1.8" fill="#39421f"/></svg>',
    glacial: '<svg viewBox="0 0 20 20" width="22" height="22"><rect x="1.5" y="1.5" width="17" height="17" rx="3" fill="#3d4048" stroke="#ffd23f" stroke-width="1.2"/><circle cx="10" cy="11" r="5.6" fill="#3a3350" stroke="#2f86ad" stroke-width="1.4"/><rect x="8.4" y="1.5" width="3.2" height="6" fill="#26202f"/><circle cx="10" cy="11" r="2.4" fill="#eaf8fd"/><circle cx="10" cy="2.5" r="1.4" fill="#7fd4f0"/></svg>',
    domo: '<svg viewBox="0 0 20 20" width="22" height="22"><rect x="1.5" y="1.5" width="17" height="17" rx="3" fill="#3d4048" stroke="#ffd23f" stroke-width="1.2"/><circle cx="10" cy="10" r="6" fill="#56646e" stroke="#2b343b"/><circle cx="7.2" cy="7.2" r="1.4" fill="#c0392b"/><circle cx="12.8" cy="7.2" r="1.4" fill="#c0392b"/><circle cx="7.2" cy="12.8" r="1.4" fill="#c0392b"/><circle cx="12.8" cy="12.8" r="1.4" fill="#c0392b"/><circle cx="10" cy="10" r="1.6" fill="#dfe8ff" stroke="#b87333" stroke-width=".8"/></svg>',
    reactor: '<svg viewBox="0 0 20 20" width="22" height="22"><rect x="1.5" y="1.5" width="17" height="17" rx="3" fill="#3d4048" stroke="#ffd23f" stroke-width="1.2"/><circle cx="10" cy="11" r="5.6" fill="#2a0f24" stroke="#b87333" stroke-width="1.3"/><rect x="9" y="1.5" width="2" height="6" fill="#22191c"/><circle cx="10" cy="11" r="3.2" fill="#ff7ad9"/><circle cx="10" cy="11" r="1.4" fill="#fff"/><circle cx="10" cy="2.4" r="1.2" fill="#ff3b3b"/></svg>',
    nucleo: '<svg viewBox="0 0 20 20" width="22" height="22"><rect x="1.5" y="1.5" width="17" height="17" rx="3" fill="#3d4048" stroke="#ffd23f" stroke-width="1.2"/><circle cx="10" cy="10" r="6" fill="#eaf8fd" stroke="#2f86ad" stroke-width="1.4"/><path d="M10 5v10M5.7 7.5l8.6 5M5.7 12.5l8.6-5" stroke="#2f86ad" stroke-width="1.2"/><circle cx="10" cy="10" r="2" fill="#7fd4f0"/></svg>',
    artilleria: '<svg viewBox="0 0 20 20" width="22" height="22"><rect x="1.5" y="1.5" width="17" height="17" rx="3" fill="#3d4048" stroke="#ffd23f" stroke-width="1.2"/><rect x="4" y="5" width="12" height="10" rx="1" fill="#56646e" stroke="#2b343b"/><g fill="#c0392b"><circle cx="6.5" cy="8" r="1.1"/><circle cx="9" cy="8" r="1.1"/><circle cx="11.5" cy="8" r="1.1"/><circle cx="14" cy="8" r="1.1"/><circle cx="6.5" cy="12" r="1.1"/><circle cx="9" cy="12" r="1.1"/><circle cx="11.5" cy="12" r="1.1"/><circle cx="14" cy="12" r="1.1"/></g></svg>',
    tesla: '<svg viewBox="0 0 20 20" width="22" height="22"><rect x="1.5" y="1.5" width="17" height="17" rx="3" fill="#3d4048" stroke="#ffd23f" stroke-width="1.2"/><circle cx="10" cy="10" r="6.4" fill="#33373d" stroke="#b87333" stroke-width="1.2"/><circle cx="10" cy="10" r="4.4" fill="none" stroke="#b87333" stroke-width="1"/><circle cx="10" cy="10" r="2.2" fill="#dfe8ff"/><path d="M15 3l-2 3h2l-2 3M5 11l-2 3h2l-2 3" stroke="#fff07a" stroke-width=".9" fill="none"/></svg>',
    prismatico: '<svg viewBox="0 0 20 20" width="22" height="22"><rect x="1.5" y="1.5" width="17" height="17" rx="3" fill="#3d4048" stroke="#ffd23f" stroke-width="1.2"/><path d="M10 2.5v5M3.5 15l4-2.5M16.5 15l-4-2.5" stroke="#ff3b3b" stroke-width="1.4"/><path d="M10 6l-4.5 7.5h9z" fill="#8a2f2f"/><path d="M10 8.5l-2.2 3.6h4.4z" fill="#ff9a9a"/></svg>',
    minero: '<svg viewBox="0 0 20 20" width="22" height="22"><rect x="1.5" y="1.5" width="17" height="17" rx="3" fill="#3d4048" stroke="#ffd23f" stroke-width="1.2"/><circle cx="10" cy="10" r="5.4" fill="#6d6340" stroke="#37311c"/><rect x="7.5" y="7.5" width="5" height="5" fill="#4a4329"/><g fill="#2b2a20"><circle cx="4.5" cy="4.8" r="1.5"/><circle cx="15.5" cy="4.8" r="1.5"/><circle cx="4.5" cy="15.2" r="1.5"/><circle cx="15.5" cy="15.2" r="1.5"/></g></svg>',
    criobomba: '<svg viewBox="0 0 20 20" width="22" height="22"><rect x="1.5" y="1.5" width="17" height="17" rx="3" fill="#3d4048" stroke="#ffd23f" stroke-width="1.2"/><circle cx="10" cy="10" r="6.2" fill="#3d474e" stroke="#2f86ad" stroke-width="1.3"/><rect x="6" y="6.5" width="8" height="7" rx="1" fill="#6b8a99"/><g fill="#7fd4f0"><circle cx="12" cy="8" r="1"/><circle cx="12" cy="10" r="1"/><circle cx="12" cy="12" r="1"/></g></svg>',
    estrella: '<svg viewBox="0 0 20 20" width="22" height="22"><path d="M10 2l2.4 5 5.4.6-4 3.7 1.1 5.4L10 14l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z" fill="#ff7ad9" stroke="#5a0d48" stroke-width=".8"/></svg>',
    flecha: '<svg viewBox="0 0 20 20" width="22" height="22" fill="none" stroke="#9cc9f2" stroke-width="2"><path d="M12 4l-6 6 6 6"/></svg>',
    candado: '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="#4a6080" stroke-width="1.6"><rect x="5" y="9" width="10" height="8" rx="1.5"/><path d="M7 9V6.5a3 3 0 016 0V9"/></svg>'
  };

  // Barra de torres: la fila normal termina en ★, que cambia a la fila de torres combo (y ← vuelve)
  let filaCombo = false;
  function armarBotonesTorre() {
    const cont = $('torres');
    cont.innerHTML = '';
    cont.classList.toggle('combo', filaCombo);
    for (const tipo in D.torres) {
      const def = D.torres[tipo];
      if (!!def.combo !== filaCombo) continue;
      const abierta = !def.combo || desbloqueada(tipo);
      const b = document.createElement('button');
      b.className = 'torre' + (abierta ? '' : ' bloq'); b.dataset.tipo = tipo;
      b.innerHTML = (abierta ? ICONO[tipo] : ICONO.candado) + '<span class="tn">' + def.corto + '</span><span class="tc">' + (abierta ? cr(def.costo) + 'cr' : '?') + '</span>';
      b.addEventListener('click', () => {
        if (G.fase !== 'jugando') return;
        if (G.moviendo) { G.moviendo = null; G.puntoSel = null; }
        if (!abierta) { aviso('Se desbloquea fusionando ' + def.receta.map(x => D.torres[x].corto).join(' + ') + ' con todas sus mejoras'); return; }
        G.tipoSel = G.tipoSel === tipo && !G.puntoSel ? null : tipo;
        G.torreSel = null;
        refrescarTodo();
      });
      cont.appendChild(b);
    }
    const b = document.createElement('button');
    b.className = 'torre cambio';
    b.innerHTML = filaCombo ? ICONO.flecha + '<span class="tn">Volver</span><span class="tc">&nbsp;</span>' : ICONO.estrella + '<span class="tn">Combo</span><span class="tc">★</span>';
    b.addEventListener('click', () => { filaCombo = !filaCombo; G.tipoSel = null; G.puntoSel = null; armarBotonesTorre(); refrescarTodo(); });
    cont.appendChild(b);
  }

  function textoStats(tipo, s) {
    if (tipo === 'rotativo') return 'Daño ' + s.dano + ' · cada ' + dec(s.cadencia) + ' s · a ' + s.objetivos + ' enemigos a la vez · alcance ' + s.alcance + ' · perforante';
    if (tipo === 'glacial') return 'Daño ' + s.dano + ' · cada ' + dec(s.cadencia) + ' s · onda ' + s.onda + ' que congela ' + dec(s.congelaImpacto) + ' s · aura que ralentiza ' + Math.round(s.lento * 100) + '% · alcance ' + s.alcance;
    if (tipo === 'domo') return 'Salva de ' + s.salva + ' misiles de ' + s.dano + ' en radio ' + s.radio + ' · cada ' + dec(s.cadencia) + ' s · ×' + s.multAire + ' a aéreos · rayo de ' + s.saltosImpacto + ' saltos al estallar · alcance ' + s.alcance;
    if (tipo === 'nucleo') return 'Aura que ralentiza ' + Math.round(s.lento * 100) + '% · congela ' + dec(s.congela) + ' s cada ' + s.cadaSeg + ' s · fragilidad +' + Math.round(s.fragil * 100) + '% · alcance ' + s.alcance + ' · sin daño';
    if (tipo === 'artilleria') return 'Salva de ' + s.salva + ' misiles de ' + s.dano + ' en radio ' + s.radio + ' · cada ' + dec(s.cadencia) + ' s · aturde ' + dec(s.aturde) + ' s · alcance ' + s.alcance;
    if (tipo === 'tesla') return 'Daño ' + s.dano + ' · salta ' + s.saltos + ' veces (−' + Math.round((1 - s.caida) * 100) + '% por salto) · cada ' + dec(s.cadencia) + ' s · aturde · alcance ' + s.alcance;
    if (tipo === 'prismatico') return s.haces + ' haces de ' + s.danoSeg + ' por segundo · ancho ' + s.ancho + ' · largo ' + s.alcance + ' · perforante';
    if (tipo === 'minero') return 'Minas de ' + s.dano + ' en radio ' + s.radio + ' · una cada ' + dec(s.cadencia) + ' s · hasta ' + s.maxMinas + ' · aturden · alcance ' + s.alcance;
    if (tipo === 'criobomba') return 'Salva de ' + s.salva + ' bombas de ' + s.dano + ' en radio ' + s.radio + ' que congelan ' + dec(s.congelaImpacto) + ' s · deja ' + s.minasImpacto + ' minas de ' + s.danoMina + ' · cada ' + dec(s.cadencia) + ' s · alcance ' + s.alcance;
    if (tipo === 'reactor') return 'Haz de ' + s.danoSeg + ' por segundo · ancho ' + s.ancho + ' · largo ' + s.alcance + ' · perforante · arco de ' + s.arcoDano + ' a ' + s.arcoSaltos + ' enemigos cada ' + s.arcoCada + ' s';
    if (tipo === 'ametralladora') {
      return 'Daño ' + s.dano + ' · cada ' + dec(s.cadencia) + ' s · alcance ' + Math.round(s.alcance) + (s.perforante ? ' · perforante' : '');
    }
    if (tipo === 'plasma') {
      return 'Daño ' + s.dano + ' · cada ' + dec(s.cadencia) + ' s · alcance ' + Math.round(s.alcance) +
        (s.onda ? ' · onda ' + Math.round(s.onda) : '') + (s.critCada ? ' · crítico cada ' + s.critCada + ' tiros' : '');
    }
    if (tipo === 'minas') {
      return 'Mina de daño ' + s.dano + ' en radio ' + Math.round(s.radio) + ' · una cada ' + dec(s.cadencia) + ' s · hasta ' + Math.floor(s.maxMinas) + ' minas · alcance ' + Math.round(s.alcance) + (s.aturde ? ' · aturde' : '');
    }
    if (tipo === 'laser') {
      return 'Daño ' + dec(s.danoSeg) + ' por segundo a todo lo que está en el haz · ancho ' + Math.round(s.ancho) + ' · largo ' + Math.round(s.alcance) + (s.perforante ? ' · perforante' : '');
    }
    if (tipo === 'rayo') {
      return 'Daño ' + dec(s.dano) + ' · salta ' + Math.round(s.saltos) + ' veces (−' + Math.round((1 - s.caida) * 100) + '% por salto) · cada ' + dec(s.cadencia) + ' s · alcance ' + Math.round(s.alcance) + (s.aturde ? ' · electrocuta' : '');
    }
    if (tipo === 'misiles') {
      return 'Daño ' + s.dano + ' en radio ' + Math.round(s.radio) + ' · cada ' + dec(s.cadencia) + ' s · alcance ' + Math.round(s.alcance) +
        (s.salva > 1 ? ' · salva doble' : '') + (s.aturde ? ' · aturde' : '');
    }
    return 'Ralentiza ' + Math.round(s.lento * 100) + '% · alcance ' + s.alcance +
      (s.congela ? ' · congela ' + dec(s.congela) + ' s cada ' + s.cadaSeg + ' s' : '') +
      (s.fragil ? ' · fragilidad +' + Math.round(s.fragil * 100) + '%' : '');
  }

  // Cómo se muestra el valor de cada atributo en su botón
  const VER = {
    dano: s => String(s.dano),
    cadencia: s => dec(s.cadencia) + ' s',
    alcance: s => String(Math.round(s.alcance)),
    onda: s => s.onda ? String(Math.round(s.onda)) : 'no',
    radio: s => String(Math.round(s.radio)),
    frio: s => Math.round(s.lento * 100) + '%',
    congelacion: s => s.congela ? dec(s.congela) + ' s' : 'no',
    cantidad: s => String(Math.floor(s.maxMinas)),
    potencia: s => dec(s.danoSeg) + '/s',
    haz: s => Math.round(s.ancho) + ' px',
    saltos: s => String(Math.round(s.saltos))
  };
  function ponerHtml(el, html) { if (el._h !== html) { el._h = html; el.innerHTML = html; } }

  // Botones de mejora por atributo de la torre seleccionada (reemplazan a la fila de torres)
  function refrescarAtributos(t) {
    const def = D.torres[t.tipo], ids = Object.keys(def.atributos), botones = $('atributos').children;
    for (let i = 0; i < botones.length; i++) {
      const b = botones[i], id = ids[i];
      if (!id) { mostrar(b, false); continue; }
      mostrar(b, true);
      b.dataset.id = id;
      const at = def.atributos[id], n = t.niv[id] || 0, sig = at.niveles[n], ver = VER[id] || (() => '');
      let puntos = '';
      for (let k = 0; k < at.niveles.length; k++) puntos += '<i class="' + (k < n ? 'on' : '') + '"></i>';
      const ahora = ver(t.s);
      let l2, l3;
      if (sig) {
        const nv = Object.assign({}, t.niv); nv[id] = n + 1;
        const luego = ver(statsTorre(t.tipo, nv, t.sin));
        l2 = luego !== ahora ? ahora + ' → ' + luego : ahora;
        l3 = sig.costo + 'cr' + (sig.nota ? ' · ' + sig.nota : '');
      } else { l2 = ahora; l3 = 'Máximo'; }
      ponerHtml(b, '<span class="an">' + at.nombre + '<span class="pp">' + puntos + '</span></span><span class="av">' + l2 + '</span><span class="ac">' + l3 + '</span>');
      poner(b, 'disabled', !sig || G.creditos < sig.costo);
      b.classList.toggle('max', !sig);
    }
  }

  function refrescarPanel() {
    const tit = $('infoTitulo'), det = $('infoDet'), sin = $('infoSin');
    const bC = $('btnConstruir'), bX = $('btnCancelar'), bP = $('btnPrioridad'), bV = $('btnVender'), bM = $('btnMejorar'), bMo = $('btnMover');
    let vC = false, vX = false, vP = false, vV = false, vM = false, vMo = false, tSin = '';

    if (G.torreSel) {
      const t = G.torreSel, def = D.torres[t.tipo];
      poner(tit, 'textContent', def.nombre + (def.combo ? ' · TORRE COMBO' : t.berserk ? ' · BERSERK' : ' · mejoras ' + t.nivel + '/' + maxMejoras(t.tipo)));
      if (!def.combo) refrescarAtributos(t);
      poner(det, 'textContent', textoStats(t.tipo, t.s));
      const mios = {};
      for (const en of G.enlaces) {
        if (!en.torres.includes(t) || en.trio) continue;
        const nom = en.sg.nombre;
        const m0 = mios[nom] || (mios[nom] = { n: 0, carga: 0 });
        m0.n++; m0.carga = Math.max(m0.carga, Math.min(1, en.carga));
      }
      const nombres = Object.keys(mios);
      if (nombres.length) {
        tSin = 'Combo: ' + nombres.map(n => n + (mios[n].n > 1 ? ' ×' + mios[n].n : '') + ' ' + Math.floor(mios[n].carga * 100) + '%').join(' · ');
      } else {
        tSin = 'Sin combo: pégale cualquier otra torre para activar uno';
      }
      // Fusión: si la torre es parte de un trío, el botón muestra cuánto falta o permite fusionar
      const trios = G.enlaces.filter(en => en.trio && en.torres.includes(t));
      const enF = trios.find(listoFusion) || trios[0];
      if (enF) {
        const dF = D.torres[enF.sg.torre], falta = enF.torres.reduce((s2, u) => s2 + maxMejoras(u.tipo) - u.nivel, 0);
        vM = true;
        poner(bM, 'textContent', falta > 0 ? 'Fusión: faltan ' + falta + ' mejoras' : G.creditos >= dF.costo ? 'Fusionar ' + cr(dF.costo) + 'cr' : 'Fusión: faltan ' + cr(dF.costo - G.creditos) + 'cr');
        poner(bM, 'disabled', falta > 0 || G.creditos < dF.costo);
        tSin = 'Trío para ' + dF.nombre + ' (consume las tres torres) · ' + tSin;
      }
      if (def.combo) tSin = 'Torre combo: no tiene mejoras ni forma combos.';
      if (def.berserk) tSin = (t.berserk ? 'Berserk: ' + def.berserk.nombre + ' ' + Math.floor(Math.min(1, t.bCarga) * 100) + '%' : 'Berserk: faltan ' + (maxMejoras(t.tipo) - t.nivel) + ' mejoras') + ' · ' + tSin;
      vV = true; vP = !!t.s.arma && t.s.arma !== 'mina' && t.s.arma !== 'laser';   // minas y láser no eligen objetivo
      vMo = true;
      poner(bMo, 'textContent', 'Mover ' + cr(precioMover(t)) + 'cr');
      poner(bMo, 'disabled', G.creditos < precioMover(t));
      poner(bP, 'textContent', 'Objetivo: ' + D.prioridades[t.prioridad]);
      poner(bV, 'textContent', 'Vender +' + valorVenta(t) + 'cr');
    } else if (G.moviendo) {
      const t = G.moviendo, def = D.torres[t.tipo], p = precioMover(t);
      poner(tit, 'textContent', 'Mover ' + def.nombre + ' · ' + cr(p) + 'cr');
      poner(det, 'textContent', 'Toca el nuevo lugar en el mapa (puedes arrastrarla). Mantiene sus mejoras; sus combos se recalculan según sus nuevas vecinas.');
      if (G.puntoSel) {
        const prev = G.puntoSel.ok ? sinergiasPrevistas(t.tipo, G.puntoSel.x, G.puntoSel.y) : [];
        tSin = !G.puntoSel.ok ? 'Aquí no cabe: muévela lejos del camino y de otras torres.' : prev.length ? 'Combos en el nuevo lugar: ' + prev.join(' · ') : 'Sin combos en el nuevo lugar.';
      }
      vC = !!G.puntoSel; vX = true;
      poner(bC, 'textContent', !G.puntoSel ? '' : !G.puntoSel.ok ? 'No cabe aquí' : 'Mover aquí');
      poner(bC, 'disabled', !G.puntoSel || !G.puntoSel.ok || G.creditos < p);
    } else if (G.tipoSel) {
      const def = D.torres[G.tipoSel];
      const s = statsDe(G.tipoSel, null);
      poner(tit, 'textContent', def.nombre + ' · ' + def.costo + 'cr');
      if (G.puntoSel) {
        poner(det, 'textContent', textoStats(G.tipoSel, s));
        const prev = G.puntoSel.ok ? sinergiasPrevistas(G.tipoSel, G.puntoSel.x, G.puntoSel.y) : [];
        tSin = !G.puntoSel.ok ? 'Aquí no cabe: muévela lejos del camino y de otras torres.' : prev.length ? 'Activa combo: ' + prev.join(' · ') : 'Sin combo aquí. Acércala a otra torre para activarlo.';
        vC = true; vX = true;
        poner(bC, 'textContent', !G.puntoSel.ok ? 'No cabe aquí' : G.creditos >= def.costo ? 'Construir ' + def.costo + 'cr' : 'Faltan ' + (def.costo - G.creditos) + 'cr');
        poner(bC, 'disabled', !G.puntoSel.ok || G.creditos < def.costo);
      } else {
        poner(det, 'textContent', def.desc);
        tSin = 'Toca el lugar del mapa donde la quieres. Puedes arrastrarla antes de construir.';
      }
    } else {
      poner(tit, 'textContent', G.oleada === 0 ? 'Prepara tu defensa' : 'Sin selección');
      poner(det, 'textContent', 'Elige una torre de arriba y toca el lugar donde la quieres. Toca una torre ya construida para mejorar sus atributos o venderla.');
    }
    poner(sin, 'textContent', tSin);
    mostrar(bC, vC); mostrar(bX, vX); mostrar(bP, vP); mostrar(bV, vV); mostrar(bM, vM); mostrar(bMo, vMo);
    mostrar($('torres'), !G.torreSel); mostrar($('atributos'), !!G.torreSel && !D.torres[G.torreSel.tipo].combo);

    for (const b of document.querySelectorAll('#torres .torre[data-tipo]')) {
      const tipo = b.dataset.tipo;
      b.classList.toggle('sel', G.tipoSel === tipo);
      b.classList.toggle('caro', G.creditos < D.torres[tipo].costo);
    }
  }

  function refrescarHud() {
    poner($('hudCreditos'), 'textContent', cr(G.creditos));
    poner($('hudOleada'), 'textContent', 'Oleada ' + G.oleada + (modo === 'infinito' ? ' · ∞' : ' / ' + TOTAL_OLEADAS));
    poner($('hudVidas'), 'textContent', String(G.vidas));
    const b = $('btnOleada');
    let txt, on = true;
    if (G.fase !== 'jugando') { txt = '—'; on = false; }
    else if (G.oleada === 0) txt = '▶ Iniciar oleada 1';
    else if (G.oleada >= TOTAL_OLEADAS) { txt = 'Última oleada'; on = false; }
    else if (enJuego() >= D.oleada.maxEnJuego) { txt = 'Máximo: ' + D.oleada.maxEnJuego + ' oleadas en juego'; on = false; }
    else if (enJuego()) txt = '▶ Adelantar ' + (G.oleada + 1) + (oleadaConJefe(G.oleada + 1) ? ' (JEFE)' : '') + ' · ' + enJuego() + '/' + D.oleada.maxEnJuego + ' · +' + bonoAdelanto() + 'cr';
    else txt = '▶ Oleada ' + (G.oleada + 1) + (oleadaConJefe(G.oleada + 1) ? ' (JEFE)' : '') + ' en ' + Math.ceil(G.cuenta) + ' s · +' + bonoAdelanto() + 'cr';
    poner(b, 'textContent', txt);
    poner(b, 'disabled', !on);
    poner($('btnVel'), 'textContent', '×' + G.vel);
    poner($('btnPausa'), 'textContent', G.pausa ? '▶' : 'II');
    $('btnPausa').classList.toggle('activo', G.pausa);
    const enPausa = G.pausa && G.fase === 'jugando';
    mostrar($('pausa'), enPausa);
    if (!enPausa) desarmarReinicio();
    $('btnVel').classList.toggle('activo', G.vel > 1);
  }

  function refrescarTodo() { if (!listo) return; refrescarHud(); refrescarPanel(); }

  let tAviso = 0;
  function aviso(txt) {
    const el = $('aviso');
    if (!el) return;
    el.textContent = txt;
    el.classList.add('ver');
    clearTimeout(tAviso);
    tAviso = setTimeout(() => el.classList.remove('ver'), 1800);
  }

  // Un escenario está abierto si no exige otro, si ya se completó el que exige, o si datos.js los abre todos
  let mapaElegido = null;
  const mapaAbierto = id => {
    const m = D.mapas[id];
    return !!m && (D.desbloquearTodo || !m.requiere || !!G.guardado.completados[m.requiere]);
  };
  function pintarSelector() {
    const cont = $('veloMapas');
    cont.innerHTML = '';
    for (const id in D.mapas) {
      const m = D.mapas[id], abierto = mapaAbierto(id), hecho = !!G.guardado.completados[id];
      const b = document.createElement('button');
      b.className = 'mapaBtn' + (id === mapaElegido ? ' sel' : '');
      b.disabled = !abierto;
      const estado = !abierto ? 'Completa ' + D.mapas[m.requiere].nombre
        : hecho ? 'Completado · ' + (G.guardado.mejor[id] || 0) + ' vidas' : 'Sin completar';
      b.innerHTML = '<b>' + m.nombre + '</b><span>' + m.dificultad + (m.caminos ? ' · ' + m.caminos.length + ' entradas' : '') + '</span><span' + (hecho && abierto ? ' class="ok"' : '') + '>' + estado + '</span>';
      b.addEventListener('click', () => { mapaElegido = id; pintarSelector(); pintarModos(); pintarLore(); });
      cont.appendChild(b);
    }
  }

  // Selector de modo: campaña (con final) o infinito (hasta perder)
  let modoElegido = 'campana';
  function pintarModos() {
    const cont = $('veloModos'), m = D.mapas[mapaElegido] || MAPA, rec = G.guardado.recordInfinito[mapaElegido] || 0;
    cont.innerHTML = '';
    const ops = [['campana', 'Campaña', (m.totalOleadas || m.oleadas.length) + ' oleadas y jefe final'],
                 ['infinito', 'Infinito', rec ? 'Sin final · récord: oleada ' + rec : 'Sin final · hasta que caiga la base']];
    for (const [id, nombre, texto] of ops) {
      const b = document.createElement('button');
      b.className = 'mapaBtn' + (id === modoElegido ? ' sel' : '');
      b.innerHTML = '<b>' + nombre + '</b><span>' + texto + '</span>';
      b.addEventListener('click', () => { modoElegido = id; pintarModos(); pintarLore(); });
      cont.appendChild(b);
    }
  }

  // ── Historia: introducción con texto que se escribe solo. Se ve la primera vez y desde el botón Historia ──
  let histI = 0, histTimer = null, histAl = null;
  function pintarHistoria() {
    const txt = D.historia[histI], el = $('historiaTexto');
    clearInterval(histTimer);
    el.textContent = '';
    let n = 0;
    histTimer = setInterval(() => {
      n += 2;
      el.textContent = txt.slice(0, n);
      if (n >= txt.length) clearInterval(histTimer);
    }, 30);
    $('historiaPuntos').innerHTML = D.historia.map((_, i) => '<i class="' + (i === histI ? 'on' : '') + '"></i>').join('');
    $('historiaSig').textContent = histI < D.historia.length - 1 ? 'Siguiente' : 'Defender la base';
    // El nombre del juego encabeza la primera pantalla de la historia
    mostrar($('historiaNombre'), histI === 0);
    $('historiaNombre').textContent = D.nombre;
  }
  function abrirHistoria(alTerminar) {
    histI = 0; histAl = alTerminar || null;
    $('historia').hidden = false;
    pintarHistoria();
  }
  function cerrarHistoria() {
    clearInterval(histTimer);
    $('historia').hidden = true;
    if (!G.guardado.historiaVista) { G.guardado.historiaVista = true; guardar(); }
    if (histAl) { const f = histAl; histAl = null; f(); }
  }
  // Preferencias de sonido: se guardan con el resto de los datos del jugador
  function guardarSonido() {
    G.guardado.sonido = { musica: SON.cfg.musica, efectos: SON.cfg.efectos };
    guardar();
    SON.aplicarCfg();
    pintarSonido();
  }
  function pintarSonido() {
    const algo = SON.cfg.musica || SON.cfg.efectos;
    poner($('btnSonido'), 'innerHTML', algo
      ? '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 8h3l4-3v10l-4-3H3z" fill="currentColor"/><path d="M13 7.5a3.5 3.5 0 010 5M15.2 5.3a6.5 6.5 0 010 9.4"/></svg>'
      : '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 8h3l4-3v10l-4-3H3z" fill="currentColor"/><path d="M13 8l4 4M17 8l-4 4"/></svg>');
    $('btnSonido').classList.toggle('activo', !algo);
    poner($('veloMusica'), 'textContent', 'Música: ' + (SON.cfg.musica ? 'sí' : 'no'));
    poner($('veloEfectos'), 'textContent', 'Efectos: ' + (SON.cfg.efectos ? 'sí' : 'no'));
    $('veloMusica').classList.toggle('off', !SON.cfg.musica);
    $('veloEfectos').classList.toggle('off', !SON.cfg.efectos);
  }

  // Línea de historia bajo los selectores: la del escenario elegido (o la del modo infinito)
  function pintarLore() {
    const m = D.mapas[mapaElegido] || MAPA;
    poner($('veloLore'), 'textContent', modoElegido === 'infinito' ? D.historiaInfinito : (m.lore ? m.lore.intro : ''));
  }

  function mostrarMenu() {
    const g = G.guardado;
    $('veloTitulo').textContent = D.nombre;
    $('veloSub').textContent = 'Elige un escenario';
    mapaElegido = mapaId; modoElegido = modo;
    pintarSelector(); pintarModos(); pintarLore();
    $('veloDatos').innerHTML = g.partidas
      ? '<div><b>' + cr(g.bajasTotales) + '</b><span>enemigos eliminados</span></div><div><b>' + g.victorias + '</b><span>victorias</span></div><div><b>' + (g.victorias ? g.mejorVidas : '—') + '</b><span>mejor resultado (vidas)</span></div>'
      : '<p>Defiende la base. Ubica torres en cualquier lugar del campo y ponlas pegadas entre sí: cargan un combo, un ataque especial que se dispara solo.</p>';
    $('veloBoton').textContent = 'Jugar';
    const p = leerPartida();
    mostrar($('veloContinuar'), !!p);
    if (p) $('veloContinuar').textContent = '▶ Continuar: ' + D.mapas[p.mapa].nombre + (p.modo === 'infinito' ? ' (infinito)' : '') + ' · oleada ' + p.oleada;
    $('velo').hidden = false;
  }
  function mostrarFinal() {
    mostrar($('veloContinuar'), false);
    const gano = G.fase === 'victoria';
    $('veloTitulo').textContent = gano ? 'Base defendida' : 'Base destruida';
    $('veloSub').textContent = MAPA.nombre + ' · ' + (modo === 'infinito' ? 'modo infinito · llegaste a la oleada ' + G.oleada + (esRecord ? ' · ¡nuevo récord!' : ' · récord: ' + (G.guardado.recordInfinito[mapaId] || 0))
      : gano ? 'superaste las ' + TOTAL_OLEADAS + ' oleadas' : 'caíste en la oleada ' + G.oleada + ' de ' + TOTAL_OLEADAS);
    // Tras ganar, deja elegido el escenario que se acaba de abrir, si hay uno
    mapaElegido = mapaId; modoElegido = modo;
    if (gano) for (const id in D.mapas) if (D.mapas[id].requiere === mapaId && !G.guardado.completados[id]) { mapaElegido = id; break; }
    pintarSelector(); pintarModos();
    // Línea de historia del resultado
    poner($('veloLore'), 'textContent', modo === 'infinito' ? D.historiaInfinito : gano ? (MAPA.lore ? MAPA.lore.victoria : '') : D.historiaDerrota);
    $('veloDatos').innerHTML = '<div><b>' + G.vidas + '</b><span>vidas restantes</span></div><div><b>' + G.bajas + '</b><span>enemigos eliminados</span></div><div><b>' + cr(G.guardado.bajasTotales) + '</b><span>eliminados en total</span></div>';
    $('veloBoton').textContent = mapaElegido === mapaId ? 'Jugar de nuevo' : 'Jugar';
    $('velo').hidden = false;
    refrescarTodo();
  }

  // ───────────────────────── MANUAL ─────────────────────────
  // Se arma con los valores de datos.js, así siempre coincide con el juego.
  const pct = x => Math.round(x * 100) + '%';
  const NOMBRE_DANO = { fisico: 'físico', energia: 'de energía', explosivo: 'explosivo' };
  let manualTab = 'jugar';

  function manualJugar() {
    const o = D.oleada, total = MAPA.totalOleadas || MAPA.oleadas.length, cada = D.generador.jefeCada;
    return '<h3>Objetivo</h3><p>Defiende la base. Empiezas con <b>' + D.inicio.vidas + ' vidas</b> y <b>' + D.inicio.creditos + ' créditos</b>. Cada enemigo que llega a la base te quita una vida; los jefes quitan varias. Si llegas a cero, pierdes.</p>' +
      '<h3>Construir</h3><ol><li>Toca una torre en el panel de abajo.</li><li>Toca el lugar del campo donde la quieres. Aparece en transparencia con su alcance.</li><li>Arrástrala para afinar la posición y toca <b>Construir</b>.</li></ol><p>No se puede construir sobre el camino, sobre la base ni encima de otra torre.</p>' +
      '<h3>Mejorar y vender</h3><p>Toca una torre ya construida. Cada torre tiene <b>tres atributos</b> que se mejoran por separado, con tres niveles cada uno. <b>Vender</b> devuelve el ' + pct(D.venta) + ' de todo lo que invertiste en ella.</p>' +
      '<h3>Modo berserk</h3><p>Cuando una torre tiene sus <b>tres atributos al máximo</b> entra en modo berserk: aparece un marco rojo y, mientras tenga enemigos a tiro, carga un ataque de mayor potencia que se dispara solo cada cierto tiempo. El ataque de cada torre está en la pestaña <b>Torres</b>.</p>' +
      '<h3>Mover torres</h3><p>Toca una torre y luego <b>Mover</b>: cuesta el ' + pct(D.mover.factor) + ' de lo invertido en ella (precio más mejoras). Conserva sus mejoras; sus combos se recalculan según sus nuevas vecinas.</p>' +
      '<h3>Objetivo de la torre</h3><p>En las torres que disparan puedes elegir a quién apuntan: <b>Primero</b> (el más avanzado), <b>Más fuerte</b> (el de más vida) o <b>Más rápido</b>.</p>' +
      '<h3>Oleadas y modos</h3><p><b>Campaña:</b> ' + total + ' oleadas, con un jefe cada ' + cada + ' y el jefe final en la última. <b>Infinito:</b> las oleadas no terminan y cada vez son más duras; el objetivo es llegar lo más lejos posible y superar tu récord. El modo se elige en la pantalla de inicio.</p><p>Al limpiar una oleada empieza una cuenta de ' + o.esperaSeg + ' segundos; si la adelantas, ganas ' + o.bonoAdelantoPorSeg + ' créditos por cada segundo que ahorres.</p><p><b>Adelantar con enemigos en el mapa:</b> puedes llamar la siguiente oleada aunque la actual siga en curso, hasta tener ' + o.maxEnJuego + ' oleadas en juego a la vez. Cada llamada da ' + o.bonoPorEnJuego + ' créditos por cada oleada que ya estaba en juego, y se cobran al limpiar la oleada que llamaste.</p>' +
      '<h3>Créditos</h3><p>Ganas créditos por cada enemigo eliminado y un bono al limpiar cada oleada, que crece con el número de oleada.</p>' +
      '<h3>Combos</h3><p>Dos torres pegadas forman un combo: un bono permanente y un ataque especial que se dispara solo. Están todos en la pestaña <b>Combos</b>.</p>' +
      '<h3>Zoom</h3><p>Pellizca el mapa con dos dedos (o usa la rueda del mouse, o los botones <b>+</b> y <b>−</b> a la derecha) para acercarte. Con zoom, arrastra un dedo para moverte por el mapa. Al construir o mover una torre, arrastrar acomoda la torre y no el mapa.</p>' +
      '<h3>Sonido</h3><p>El botón del parlante, en la barra de arriba, silencia o activa todo. En la pantalla de inicio puedes apagar por separado la <b>música</b> o los <b>efectos</b>. La música se intensifica durante el combate y cuando hay un jefe.</p>' +
      '<h3>Controles</h3><p>En pausa, <b>⌂ Inicio</b> vuelve a la pantalla de inicio; la partida queda guardada desde la última oleada limpiada y se retoma con <b>Continuar</b>. <b>×1 / ×2 / ×3</b> cambia la velocidad. <b>II</b> pausa: en pausa puedes seguir construyendo y aparece el botón para reiniciar la partida.</p>';
  }

  function textoBerserk(tipo) {
    const def = D.torres[tipo], b = def.berserk;
    if (!b) return '';
    const que = tipo === 'crio' ? 'hace ' + b.dano + ' de daño y congela ' + dec(b.congela) + ' s a todos los enemigos de tierra dentro de su alcance'
      : def.arma === 'bala' ? 'ráfaga de ' + b.balas + ' disparos repartidos entre los enemigos a tiro, cada uno con daño ×' + dec(b.multDano)
      : def.arma === 'plasma' ? 'un disparo con daño ×' + dec(b.multDano) + ' y onda expansiva de ' + b.onda + ' px'
      : def.arma === 'mina' ? 'siembra ' + b.minas + ' minas de golpe con daño ×' + dec(b.multDano) + ', aunque pase de su máximo'
      : def.arma === 'laser' ? 'durante ' + b.seg + ' s el haz hace ' + dec(b.multDano) + ' veces el daño y es ' + dec(b.multAncho) + ' veces más ancho'
      : def.arma === 'rayo' ? 'descarga sobre todos los enemigos dentro de su alcance con daño ×' + dec(b.multDano) + ' y los aturde ' + dec(b.aturde) + ' s (jefes no)'
      : b.misiles + ' misiles a la vez repartidos entre los enemigos a tiro, con daño ×' + dec(b.multDano);
    return '<b>' + b.nombre + ':</b> ' + que + '. Cada ' + b.cargaSeg + ' s.';
  }

  function manualTorres() {
    let h = '<p class="mnota">Cada atributo se compra por separado. Se muestra el valor de cada nivel y su costo.</p>';
    for (const tipo in D.torres) {
      const def = D.torres[tipo];
      if (def.combo) continue;   // las torres combo están en la pestaña Fusión
      h += '<div class="mcard"><div class="mcab">' + ICONO[tipo] + '<div><b>' + def.nombre + '</b><span>' + def.costo + ' créditos</span></div></div>' +
        '<p>' + def.desc + '</p>' +
        '<p class="mdato">' + (def.arma ? 'Daño ' + NOMBRE_DANO[def.tipoDano] + ' · ataca ' + (def.antiaerea ? 'tierra y aire' : 'solo tierra') : 'No dispara · afecta solo a enemigos en tierra') + '</p>' +
        '<p class="mdato">Al construir: ' + textoStats(tipo, statsDe(tipo, null)) + '</p><table>';
      for (const id in def.atributos) {
        const at = def.atributos[id], ver = VER[id] || (() => '');
        h += '<tr><th>' + at.nombre + '</th>';
        at.niveles.forEach((nv, i) => {
          const niv = {}; niv[id] = i + 1;
          h += '<td><b>' + ver(statsDe(tipo, niv)) + '</b>' + (nv.nota ? '<i>' + nv.nota + '</i>' : '') + '<span>' + nv.costo + 'cr</span></td>';
        });
        h += '</tr>';
      }
      h += '</table>' + (def.berserk ? '<p class="mdato">Berserk (con las ' + maxMejoras(tipo) + ' mejoras) — ' + textoBerserk(tipo) + '</p>' : '') + '</div>';
    }
    return h;
  }

  function textoBono(sg) {
    if (!sg.para) return 'Sin bono permanente.';
    const quien = D.torres[sg.para].nombre;
    if (sg.danoALentos) return quien + ': +' + pct(sg.danoALentos - 1) + ' de daño a enemigos ralentizados o congelados.';
    if (sg.bono) {
      const b = sg.bono;
      if (b.stat === 'cadencia') return quien + ': dispara ' + pct(1 - b.mult) + ' más rápido.';
      const que = { alcance: 'de alcance', dano: 'de daño', radio: 'de radio de explosión', danoSeg: 'de daño del haz', ancho: 'de ancho del haz', maxMinas: 'de minas en el camino' }[b.stat] || 'de ' + b.stat;
      return quien + ': +' + pct(b.mult - 1) + ' ' + que + '.';
    }
    return 'Sin bono permanente.';
  }
  function textoAtaque(sg, trio) {
    const c = sg.combo, cuantas = trio ? 'las tres torres' : 'las dos torres';
    let t = c.tipo === 'area' ? 'La ' + D.torres[c.desde].nombre.toLowerCase() + ' lanza una carga que estalla en un radio de ' + c.radio + ' sobre su objetivo'
      : c.tipo === 'linea' ? (trio ? 'Las tres torres disparan' : 'Las dos torres disparan') + ' un rayo que atraviesa a todos los enemigos en su línea'
      : c.tipo === 'cadena' ? 'La torre de rayos lanza una descarga que salta ' + c.saltos + ' veces entre enemigos cercanos, sin perder fuerza'
      : c.tipo === 'minas' ? 'La minadora siembra ' + c.minas + ' minas extra (puede pasar de su máximo)'
      : 'Onda de radio ' + c.radio + ' alrededor de ' + cuantas + ' (solo enemigos en tierra)';
    t += ': ' + c.dano + ' de daño, más ' + c.danoPorMejora + ' por cada mejora de ' + cuantas + '.';
    if (c.congela) t += ' Congela ' + dec(c.congela) + ' s.';
    if (c.aturde) t += ' Aturde ' + dec(c.aturde) + ' s.';
    return t;
  }
  function manualCombos() {
    let h = '<h3>Cómo funcionan</h3><ul><li>Dos torres <b>pegadas</b> forman un combo. Al ubicar una torre, las vecinas con las que combina muestran un círculo dorado punteado: si la sueltas dentro, hay combo.</li>' +
      '<li>Entre las dos torres aparece un <b>círculo que se llena</b> mientras alguna tiene enemigos a tiro. Al llenarse, el ataque especial sale solo.</li>' +
      '<li>Además, una de las torres recibe un <b>bono permanente</b>.</li>' +
      '<li>Una torre con varias vecinas <b>reparte su carga</b>: con dos combos, cada uno tarda el doble.</li>' +
      '<li>El ataque especial ignora las resistencias del enemigo y pega más fuerte mientras más mejoras tengan las dos torres.</li>' +
      '<li>Los jefes no se congelan ni se aturden.</li></ul><h3>Los ' + D.sinergias.length + ' combos</h3>';
    for (const sg of D.sinergias) {
      const a = sg.entre[0], b = sg.entre[1];
      h += '<div class="mcard ' + (sg.combo.efecto || 'fuego') + '"><div class="mcab">' + ICONO[a] + '<em>+</em>' + ICONO[b] + '<div><b>' + sg.nombre + '</b><span>' + D.torres[a].nombre + ' + ' + D.torres[b].nombre + '</span></div></div>' +
        '<p><b>Bono:</b> ' + textoBono(sg) + '</p>' +
        '<p><b>Ataque especial</b> (carga en ' + sg.combo.cargaSeg + ' s): ' + textoAtaque(sg) + '</p></div>';
    }
    return h;
  }

  function manualTrios() {
    let h = '<h3>Torres combo (fusión)</h3><ul><li>Tres torres <b>pegadas entre sí, en triángulo</b>, cuyos tipos sean la receta de una torre combo forman un trío. Cada una muestra un <b>triangulito magenta</b> en su esquina, que se llena a medida que mejoras las tres; cuando late en blanco, ya se pueden fusionar.</li>' +
      '<li>Cuando las tres tienen <b>todas sus mejoras</b>, toca cualquiera de ellas: aparece el botón <b>Fusionar</b>.</li>' +
      '<li>La fusión <b>consume las tres torres</b> (no se devuelve nada) y además cuesta ' + dec(D.fusion.factorPrecio) + ' veces lo que valen las tres al máximo. La torre combo queda en el centro del triángulo.</li>' +
      '<li>La primera fusión de cada una la <b>desbloquea para siempre</b>: en las partidas siguientes se construye directo desde el botón <b>★ Combo</b> de la barra de torres, al mismo precio.</li>' +
      '<li>Las torres combo no tienen mejoras ni forman combos.</li></ul><h3>Las ' + (D.fusiones || []).length + ' torres combo</h3>';
    for (const f of D.fusiones || []) {
      const def = D.torres[f.torre], abierta = desbloqueada(f.torre);
      h += '<div class="mcard combo"><div class="mcab">' + (abierta ? ICONO[f.torre] : ICONO.candado) + '<div><b>' + def.nombre + '</b><span>' + (abierta ? 'Desbloqueada' : 'Bloqueada') + ' · ' + cr(def.costo) + ' créditos</span></div></div>' +
        '<p class="mdato">Receta: ' + f.entre.map(x => ICONO[x]).join(' ') + ' ' + f.entre.map(x => D.torres[x].nombre).join(' + ') + ', las tres con todas sus mejoras.</p>' +
        (abierta ? '<p>' + def.desc + '</p><p class="mdato">' + textoStats(f.torre, statsDe(f.torre, null)) + '</p>' : '<p class="mdato">Lo que hace se revela al desbloquearla.</p>') + '</div>';
    }
    return h;
  }

  function manualEnemigos() {
    const esc = MAPA.escalaVida != null ? MAPA.escalaVida : D.oleada.escalaVida;
    const rf = D.oleada.refuerzo;
    let h = '<p class="mnota">La vida indicada es la de la oleada 1. En ' + MAPA.nombre + ' sube ' + pct(esc) + ' por cada oleada.' + (rf ? ' Desde la oleada ' + rf.desde + ' todos tienen además un refuerzo de vida que parte en ' + pct(rf.extra) + ' y crece cada vez más rápido, hasta ' + pct(rf.extraEn) + ' en la oleada ' + rf.hasta + '.' : '') + ' En modo infinito, pasada la oleada ' + D.infinito.desde + ', suben otro ' + pct(D.infinito.extraPorOleada) + ' acumulado por oleada.</p>';
    for (const id in D.enemigos) {
      const e = D.enemigos[id], notas = [];
      if (e.aereo) notas.push('Vuela sobre el mismo camino que las tropas de tierra. Solo le disparan las torres que atacan aire y el frío no le afecta.');
      for (const k in e.resist) {
        if (e.resist[k] < 1) notas.push('Resiste el daño ' + NOMBRE_DANO[k] + ': recibe ' + pct(e.resist[k]) + '.');
        if (e.resist[k] > 1) notas.push('Débil al daño ' + NOMBRE_DANO[k] + ': recibe ' + pct(e.resist[k]) + '.');
      }
      if (e.resFrio != null && e.resFrio < 1) notas.push('El frío lo frena solo ' + pct(e.resFrio) + ' de lo normal.');
      if (e.noCongela) notas.push('No se puede congelar ni aturdir.');
      h += '<div class="mcard"><div class="mcab"><div><b>' + e.nombre + '</b><span>Vida ' + cr(e.vida) + ' · velocidad ' + e.vel + ' · premio ' + e.premio + 'cr · quita ' + (e.vidas || 1) + (e.vidas > 1 ? ' vidas' : ' vida') + '</span></div></div>' +
        (notas.length ? '<ul><li>' + notas.join('</li><li>') + '</li></ul>' : '<p>Sin resistencias ni debilidades.</p>') + '</div>';
    }
    return h;
  }

  function pintarManual() {
    const cuerpo = { jugar: manualJugar, torres: manualTorres, combos: manualCombos, trios: manualTrios, enemigos: manualEnemigos }[manualTab]();
    $('manualCuerpo').innerHTML = cuerpo;
    $('manualCuerpo').scrollTop = 0;
    for (const b of $('manualTabs').children) b.classList.toggle('sel', b.dataset.tab === manualTab);
  }
  function abrirManual(tab) {
    if (G.fase === 'jugando') G.pausa = true;   // el juego queda en pausa mientras lees
    if (tab) manualTab = tab;
    pintarManual();
    $('manual').hidden = false;
    refrescarTodo();
  }

  let reinicioArmado = false, tReinicio = 0;
  // Volver a la pantalla de inicio desde la pausa (con confirmación de dos toques, como Reiniciar)
  let inicioArmado = false, tInicio = null;
  function desarmarInicio() {
    if (!inicioArmado) return;
    inicioArmado = false;
    clearTimeout(tInicio);
    $('btnInicio').textContent = '⌂ Inicio';
    $('btnInicio').classList.remove('confirmar');
  }
  function volverAlInicio() {
    // Si el campo está limpio se guarda tal cual; si no, "Continuar" retoma desde la última oleada limpiada
    if (G.oleada > 0 && enJuego() === 0) guardarPartida();
    G.fase = 'menu'; G.pausa = false;
    G.tipoSel = null; G.puntoSel = null; G.torreSel = null; G.moviendo = null;
    limpiarFlotantes();
    mostrarMenu();
    refrescarTodo();
  }

  function desarmarReinicio() {
    desarmarInicio();
    if (!reinicioArmado) return;
    reinicioArmado = false;
    clearTimeout(tReinicio);
    $('btnReiniciar').textContent = '↻ Reiniciar';
    $('btnReiniciar').classList.remove('confirmar');
  }

  function conectarBotones() {
    $('veloBoton').addEventListener('click', () => {
      $('velo').hidden = true;
      modo = modoElegido === 'infinito' ? 'infinito' : 'campana';
      if (mapaElegido && mapaElegido !== mapaId && mapaAbierto(mapaElegido)) cargarMapa(mapaElegido);
      fijarTotal();
      G.guardado.mapa = mapaId; G.guardado.modo = modo;
      nuevaPartida();
      vigilarLienzo();
    });
    $('btnOleada').addEventListener('click', () => { iniciarOleada(true); refrescarTodo(); });
    $('veloContinuar').addEventListener('click', () => {
      const p = leerPartida();
      if (!p) { mostrar($('veloContinuar'), false); return; }
      $('velo').hidden = true;
      continuarPartida(p);
      vigilarLienzo();
    });
    $('zoomMas').addEventListener('click', () => fijarZoom(zoomMapa * 1.4));
    $('zoomMenos').addEventListener('click', () => { if (zoomMapa / 1.4 < 1.05) zoomInicial(); else fijarZoom(zoomMapa / 1.4); });
    // Velocidad: ×1 → ×2 → ×3 → ×1
    $('btnVel').addEventListener('click', () => { G.vel = G.vel >= 3 ? 1 : G.vel + 1; refrescarTodo(); });
    $('btnManual').addEventListener('click', () => abrirManual());
    $('veloManual').addEventListener('click', () => abrirManual());
    $('veloHistoria').addEventListener('click', () => abrirHistoria());
    // Sonido: el audio arranca con el primer toque (regla de los navegadores)
    const arrancarAudio = () => { SON.iniciar(); };
    document.addEventListener('pointerdown', arrancarAudio, true);
    document.addEventListener('keydown', arrancarAudio, true);
    $('btnSonido').addEventListener('click', () => {
      const algo = SON.cfg.musica || SON.cfg.efectos;
      SON.cfg.musica = SON.cfg.efectos = !algo;
      guardarSonido();
    });
    $('veloMusica').addEventListener('click', () => { SON.cfg.musica = !SON.cfg.musica; guardarSonido(); });
    $('veloEfectos').addEventListener('click', () => { SON.cfg.efectos = !SON.cfg.efectos; guardarSonido(); });
    $('historiaSaltar').addEventListener('click', cerrarHistoria);
    $('historiaSig').addEventListener('click', () => {
      const el = $('historiaTexto'), txt = D.historia[histI];
      if (el.textContent.length < txt.length) { clearInterval(histTimer); el.textContent = txt; return; }   // primero completa la frase
      if (histI < D.historia.length - 1) { histI++; pintarHistoria(); } else cerrarHistoria();
    });
    $('manualCerrar').addEventListener('click', () => { $('manual').hidden = true; });
    for (const b of $('manualTabs').children) b.addEventListener('click', () => { manualTab = b.dataset.tab; pintarManual(); });
    $('btnContinuar').addEventListener('click', () => { G.pausa = false; refrescarTodo(); });
    // Reiniciar pide un segundo toque para no perder la partida por error
    $('btnInicio').addEventListener('click', () => {
      if (G.fase !== 'jugando') return;
      if (!inicioArmado) {
        inicioArmado = true;
        $('btnInicio').textContent = '¿Salir? Toca otra vez';
        $('btnInicio').classList.add('confirmar');
        clearTimeout(tInicio);
        tInicio = setTimeout(desarmarInicio, 3500);
      } else {
        desarmarInicio();
        volverAlInicio();
      }
    });
    $('btnReiniciar').addEventListener('click', () => {
      if (G.fase !== 'jugando') return;
      if (!reinicioArmado) {
        reinicioArmado = true;
        $('btnReiniciar').textContent = '¿Seguro? Toca otra vez';
        $('btnReiniciar').classList.add('confirmar');
        clearTimeout(tReinicio);
        tReinicio = setTimeout(desarmarReinicio, 3500);
      } else {
        desarmarReinicio();
        nuevaPartida();
        aviso('Partida reiniciada');
      }
    });
    $('btnPausa').addEventListener('click', () => { if (G.fase === 'jugando') { G.pausa = !G.pausa; refrescarTodo(); } });
    $('btnConstruir').addEventListener('click', () => {
      if (G.moviendo) {
        const t = G.moviendo;
        if (G.puntoSel && moverTorre(t, G.puntoSel.x, G.puntoSel.y)) { G.moviendo = null; G.tipoSel = null; G.puntoSel = null; G.torreSel = t; }
        refrescarTodo();
        return;
      }
      if (!G.puntoSel || !G.tipoSel) return;
      if (construir(G.tipoSel, G.puntoSel.x, G.puntoSel.y)) G.puntoSel = null;
      refrescarTodo();
    });
    $('btnCancelar').addEventListener('click', () => {
      if (G.moviendo) G.torreSel = G.moviendo;
      G.moviendo = null; G.puntoSel = null; G.tipoSel = null; refrescarTodo();
    });
    $('btnMover').addEventListener('click', () => {
      const t = G.torreSel;
      if (!t || G.creditos < precioMover(t)) return;
      G.moviendo = t; G.tipoSel = t.tipo; G.puntoSel = null; G.torreSel = null;
      refrescarTodo();
    });
    for (const b of $('atributos').children) {
      b.addEventListener('click', () => { if (G.torreSel && b.dataset.id) mejorar(G.torreSel, b.dataset.id); refrescarTodo(); });
    }
    $('btnPrioridad').addEventListener('click', () => { if (G.torreSel) cambiarPrioridad(G.torreSel); refrescarTodo(); });
    $('btnVender').addEventListener('click', () => { if (G.torreSel) vender(G.torreSel); refrescarTodo(); });
    // Botón de fusión (usa el botón btnMejorar, que no tenía otro uso)
    $('btnMejorar').addEventListener('click', () => {
      const t = G.torreSel;
      if (!t) return;
      const trios = G.enlaces.filter(en => en.trio && en.torres.includes(t));
      const en = trios.find(listoFusion);
      if (en) fusionar(en);
      refrescarTodo();
    });
    // Si la app pasa a segundo plano, se pausa sola
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && G.fase === 'jugando') { G.pausa = true; refrescarTodo(); }
      SON.suspender(document.hidden);
      if (!document.hidden) vigilarLienzo();
    });
  }

  // Arranque
  G.enlaces = [];
  document.title = D.nombre;
  $('veloCredito').textContent = 'Creado por ' + D.autor + ' · Versión ' + D.version;
  modo = G.guardado.modo === 'infinito' ? 'infinito' : 'campana';
  cargarMapa(mapaAbierto(G.guardado.mapa) ? G.guardado.mapa : Object.keys(D.mapas)[0]);
  if (G.guardado.sonido) { SON.cfg.musica = G.guardado.sonido.musica !== false; SON.cfg.efectos = G.guardado.sonido.efectos !== false; }
  armarBotonesTorre();
  conectarBotones();
  pintarSonido();
  mostrarMenu();
  abrirHistoria();   // cada vez que se abre el juego, la historia antes del menú (se puede saltar)
  // Renderizado: WebGL si se puede; "modo compatible" (canvas 2D) si el teléfono pierde el contexto WebGL
  // o si se abre con ?canvas en la dirección. La elección queda guardada en el teléfono.
  let modoCanvas = /[?&]canvas/.test(location.search);
  try { modoCanvas = modoCanvas || localStorage.getItem('td_render') === 'canvas'; } catch (e) { /* nada */ }
  if (/[?&]webgl/.test(location.search)) { modoCanvas = false; try { localStorage.removeItem('td_render'); } catch (e) { /* nada */ } }
  const juego = new Phaser.Game({
    type: modoCanvas ? Phaser.CANVAS : Phaser.AUTO,
    parent: 'mapa',
    width: W * ESC, height: H * ESC,
    backgroundColor: '#d8b878',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { noAudio: true },
    banner: false,
    scene: escenaJuego
  });

  juego.events.once('ready', () => {
    const lienzo = juego.canvas;
    if (!lienzo || juego.renderer.type !== Phaser.WEBGL) return;
    lienzo.addEventListener('webglcontextlost', ev => {
      ev.preventDefault();
      try { localStorage.setItem('td_render', 'canvas'); } catch (e) { /* nada */ }
      if (window.mostrarErrorJuego) window.mostrarErrorJuego('El teléfono perdió el contexto gráfico (WebGL). Recargando en modo compatible…');
      setTimeout(() => location.reload(), 1500);
    });
  });

  // Vigilante del mapa: algunos teléfonos (S25 Ultra + Chrome) a veces dejan el mapa negro.
  // Tras "Jugar" o al volver a la app: reajusta el tamaño y revisa que el mapa se esté dibujando.
  // Si el contexto gráfico se perdió o el centro del mapa sale negro/vacío dos veces seguidas,
  // pasa a modo compatible (canvas) y recarga (queda la partida guardada al final de la última oleada).
  let tVigia = null;
  function cambiarACompatible(motivo) {
    try { localStorage.setItem('td_render', 'canvas'); localStorage.setItem('td_render_motivo', motivo); } catch (e) { /* nada */ }
    if (window.mostrarErrorJuego) window.mostrarErrorJuego('Mapa sin dibujar (' + motivo + '). Recargando en modo compatible…');
    setTimeout(() => location.reload(), 1500);
  }
  function vigilarLienzo() {
    clearTimeout(tVigia);
    tVigia = setTimeout(() => {
      try { juego.scale.refresh(); } catch (e) { /* nada */ }
      const r = juego.renderer;
      if (!r || r.type !== Phaser.WEBGL || document.hidden) return;
      if (r.gl && r.gl.isContextLost()) { cambiarACompatible('contexto perdido'); return; }
      let negros = 0;
      const probar = n => r.snapshotPixel(Math.round(W * ESC / 2), Math.round(H * ESC / 2), c => {
        const vacio = !c || c.a === 0 || (c.r + c.g + c.b) < 24;
        if (!vacio) return;
        if (++negros >= 2) cambiarACompatible('pantalla negra');
        else if (n < 2) setTimeout(() => probar(n + 1), 700);
      });
      probar(1);
    }, 600);
  }

  // Acceso para pruebas automáticas y para la consola del navegador
  window.TD = { G, D, W, H, renderer: () => juego.renderer.type === Phaser.CANVAS ? 'canvas' : 'webgl', fijarZoom, cargarMapa, ponerModo: m => { modo = m; fijarTotal(); }, gruposDe, vigilarLienzo, multVida, construir, mejorar, mejoraSiguiente, vender, iniciarOleada, avanzar, nuevaPartida, torreEn, puedeConstruir, ajustar };
})();
