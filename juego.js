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

  // ───────────────────────── 1. PREPARACIÓN ─────────────────────────
  const D = DATOS;
  const C = D.celda, W = D.cols * C, H = D.filas * C;
  // Factor de nitidez: el lienzo se dibuja a 2x o 3x en pantallas de alta densidad
  const ESC = Math.min(3, Math.max(1, Math.ceil(window.devicePixelRatio || 1)));
  const MAPA = D.mapas[D.mapaActual];
  const TOTAL_OLEADAS = MAPA.oleadas.length;
  const $ = id => document.getElementById(id);
  const cr = n => Math.floor(n).toLocaleString('es-CL');
  const dec = n => String(Math.round(n * 100) / 100).replace('.', ',');

  // Camino: puntos en px, tramos con su largo acumulado y celdas ocupadas
  const PUNTOS = MAPA.camino.map(([c, r]) => ({ x: c * C + C / 2, y: r * C + C / 2 }));
  const TRAMOS = [];
  let LARGO = 0;
  for (let i = 0; i < PUNTOS.length - 1; i++) {
    const a = PUNTOS[i], b = PUNTOS[i + 1];
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    TRAMOS.push({ a, b, l, ini: LARGO });
    LARGO += l;
  }
  const CAMINO = new Set();
  for (let i = 0; i < MAPA.camino.length - 1; i++) {
    let [c, r] = MAPA.camino[i];
    const [c2, r2] = MAPA.camino[i + 1];
    const dc = Math.sign(c2 - c), dr = Math.sign(r2 - r);
    for (;;) {
      CAMINO.add(c + ',' + r);
      if (c === c2 && r === r2) break;
      c += dc; r += dr;
    }
  }
  function posEn(d) {
    for (const t of TRAMOS) {
      if (d <= t.ini + t.l) {
        const k = Math.max(0, (d - t.ini) / t.l);
        return { x: t.a.x + (t.b.x - t.a.x) * k, y: t.a.y + (t.b.y - t.a.y) * k };
      }
    }
    const u = PUNTOS[PUNTOS.length - 1];
    return { x: u.x, y: u.y };
  }

  // Guardado entre partidas (queda en el teléfono / navegador)
  const CLAVE = 'td_guardado_v1';
  function cargarGuardado() {
    const base = { bajasTotales: 0, victorias: 0, mejorVidas: 0, partidas: 0 };
    try { return Object.assign(base, JSON.parse(localStorage.getItem(CLAVE) || '{}')); }
    catch (e) { return base; }
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
    torres: [], enemigos: [], efectos: [],
    vel: 1, pausa: false,
    tipoSel: null, puntoSel: null, torreSel: null,
    bajas: 0, t: 0,
    guardado: cargarGuardado()
  };

  function nuevaPartida() {
    G.fase = 'jugando';
    G.creditos = D.inicio.creditos;
    G.vidas = D.inicio.vidas;
    G.oleada = 0; G.generando = false; G.cola = []; G.tOleada = 0;
    G.cuenta = 0; G.enCuenta = false; G.pendientes = {};
    G.torres = []; G.enemigos = []; G.efectos = []; G.enlaces = [];
    G.pausa = false; G.tipoSel = null; G.puntoSel = null; G.torreSel = null;
    G.bajas = 0; G.t = 0;
    G.guardado.partidas++;
    guardar();
    limpiarFlotantes();
    refrescarTodo();
  }

  // ───────────────────────── 3. REGLAS ─────────────────────────
  const NO_STAT = { mejoras: 1, nombre: 1, corto: 1, costo: 1, desc: 1 };

  // Valores vigentes de una torre: base + mejoras compradas
  function calcular(t) {
    const def = D.torres[t.tipo], s = {};
    for (const k in def) if (!NO_STAT[k]) s[k] = def[k];
    for (let i = 0; i < t.nivel; i++) {
      const m = def.mejoras[i];
      for (const k in m) if (!NO_STAT[k]) s[k] = m[k];
    }
    t.s = s;
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
    for (const t of TRAMOS) if (distSegmento(x, y, t.a.x, t.a.y, t.b.x, t.b.y) < COLOC.claroCamino) return false;
    const fin = PUNTOS[PUNTOS.length - 1];
    if (x > W - 24 - MEDIA && Math.abs(y - fin.y) < 24 + MEDIA) return false;
    for (const t of G.torres) if (Math.abs(x - t.x) < COLOC.tamTorre && Math.abs(y - t.y) < COLOC.tamTorre) return false;
    return true;
  }
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
          G.enlaces.push({ a, b, sg, clave, carga: previas[clave] || 0, tDisparo: -9 });
          a.nEnl++; b.nEnl++;
        }
      }
    }
  }

  // Qué combos se activarían si se construye "tipo" en el punto (x, y)
  function sinergiasPrevistas(tipo, x, y) {
    const nombres = new Set();
    for (const t of G.torres) {
      if (!contiguas({ x, y }, t)) continue;
      for (const sg of sinergiaDe(tipo, t.tipo)) nombres.add(sg.nombre + ' (' + sg.combo.texto + ')');
    }
    return [...nombres];
  }

  function construir(tipo, x, y) {
    const def = D.torres[tipo];
    x = Math.round(x); y = Math.round(y);
    if (!def || !puedeConstruir(x, y) || G.creditos < def.costo) return null;
    G.creditos -= def.costo;
    const t = {
      tipo, x, y,
      nivel: 0, invertido: def.costo, prioridad: 'primero',
      enfria: 0, ang: -Math.PI / 2, tCong: 0, sin: []
    };
    calcular(t);
    G.torres.push(t);
    recalcularSinergias();
    const nuevos = G.enlaces.filter(en => en.a === t || en.b === t);
    if (nuevos.length) aviso('Combo activo: ' + [...new Set(nuevos.map(en => en.sg.nombre))].join(' + '));
    return t;
  }

  function mejoraSiguiente(t) { return D.torres[t.tipo].mejoras[t.nivel] || null; }
  function mejorar(t) {
    const m = mejoraSiguiente(t);
    if (!m || G.creditos < m.costo) return false;
    G.creditos -= m.costo;
    t.invertido += m.costo;
    t.nivel++;
    calcular(t);
    return true;
  }

  const valorVenta = t => Math.floor(t.invertido * D.venta);
  function vender(t) {
    const i = G.torres.indexOf(t);
    if (i < 0) return false;
    G.creditos += valorVenta(t);
    G.torres.splice(i, 1);
    if (G.torreSel === t) G.torreSel = null;
    recalcularSinergias();
    return true;
  }

  function cambiarPrioridad(t) {
    const ks = Object.keys(D.prioridades);
    t.prioridad = ks[(ks.indexOf(t.prioridad) + 1) % ks.length];
  }

  // Oleadas
  function bonoAdelanto() {
    if (G.oleada === 0) return 0;
    const seg = G.enemigos.length ? D.oleada.esperaSeg : Math.ceil(G.cuenta);
    return seg * D.oleada.bonoAdelantoPorSeg;
  }
  function puedeIniciar() {
    return G.fase === 'jugando' && !G.generando && G.oleada < TOTAL_OLEADAS;
  }
  function iniciarOleada(conBono) {
    if (!puedeIniciar()) return false;
    if (conBono) G.creditos += bonoAdelanto();
    G.oleada++;
    const grupos = MAPA.oleadas[G.oleada - 1];
    const cola = [];
    let fin = 0;
    for (const g of grupos) {
      const t0 = g.desde != null ? g.desde : (fin > 0 ? fin + 1 : 0);
      for (let i = 0; i < g.n; i++) cola.push({ t: t0 + i * g.cada, tipo: g.tipo });
      fin = Math.max(fin, t0 + (g.n - 1) * g.cada);
    }
    cola.sort((a, b) => a.t - b.t);
    G.cola = cola;
    G.pendientes[G.oleada] = cola.length;
    G.tOleada = 0;
    G.generando = true;
    G.enCuenta = false; G.cuenta = 0;
    return true;
  }

  function crearEnemigo(tipo, oleada) {
    const def = D.enemigos[tipo];
    const vida = def.vida * (1 + D.oleada.escalaVida * (oleada - 1));
    const p = posEn(0);
    G.enemigos.push({ tipo, def, oleada, vida, vidaMax: vida, dist: 0, x: p.x, y: p.y, lento: 0, fragil: 0, congelado: 0, vivo: true });
  }

  function resolverEnemigo(e) {
    e.vivo = false;
    if (--G.pendientes[e.oleada] === 0) {
      const bono = D.oleada.bonoBase + D.oleada.bonoPorOleada * e.oleada;
      G.creditos += bono;
      aviso('Oleada ' + e.oleada + ' superada · +' + bono + 'cr');
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
      G.efectos.push(e.tipo === 'blindado' ? { k: 'explosion', x: e.x, y: e.y, t: 0, dur: 0.4 } : { k: 'polvo', x: e.x, y: e.y, t: 0, dur: 0.3 });
      flotar(e.x, e.y - 10, '+' + e.def.premio);
      resolverEnemigo(e);
    }
  }

  // Daño de un disparo normal: aplica resistencias, fragilidad y el bono contra enemigos frenados
  function danar(e, dano, t) {
    const s = t.s;
    let m = e.def.resist[s.tipoDano];
    if (m == null) m = 1;
    if (s.perforante && m < 1) m = 1;
    let d = dano * m * (1 + e.fragil);
    if ((e.lento > 0 || e.congelado > 0) && t.sin.includes('quebradizas')) {
      d *= D.sinergias.find(x => x.id === 'quebradizas').danoALentos;
    }
    aplicarDano(e, d);
  }

  // ── Combos ──
  const trabajando = t => t.tipo === 'crio' ? !!t.activa : (t.tFuego != null && G.t - t.tFuego < 0.6);
  function distSegmento(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const k = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - x1 - dx * k, py - y1 - dy * k);
  }

  // Ataque especial de un enlace con la carga llena. Devuelve false si no había a quién atacar
  // (en ese caso la carga se conserva). Los combos ignoran las resistencias del enemigo.
  function lanzarCombo(en) {
    const { a, b, sg } = en, c = sg.combo;
    const fuerza = c.dano + c.danoPorMejora * (a.nivel + b.nivel);
    if (sg.id === 'quebradizas') {
      // Metralla de hielo: la ametralladora dispara una carga que estalla, daña y congela en área
      const tA = a.tipo === 'ametralladora' ? a : b;
      const obj = elegirObjetivo(tA);
      if (!obj) return false;
      const ox = obj.x, oy = obj.y;
      for (const e of G.enemigos) {
        if (!e.vivo || Math.hypot(e.x - ox, e.y - oy) > c.radio) continue;
        if (!e.def.aereo) e.congelado = Math.max(e.congelado, c.congela);
        aplicarDano(e, fuerza * (1 + e.fragil));
      }
      tA.ang = Math.atan2(oy - tA.y, ox - tA.x); tA.tFuego = G.t;
      G.efectos.push({ k: 'rayo', x1: tA.x, y1: tA.y, x2: ox, y2: oy, t: 0, dur: 0.25, color: 0x9fe8ff });
      G.efectos.push({ k: 'hielo', x: ox, y: oy, r: c.radio, t: 0, dur: 0.5 });
      cartel(ox, oy - c.radio * 0.6, sg.nombre, '#e8fbff', '#0d3b55');
    } else if (sg.id === 'cruzado') {
      // Fuego cruzado: las dos ametralladoras disparan una ráfaga que atraviesa a todos los enemigos en su línea
      const obj = elegirObjetivo(a) || elegirObjetivo(b);
      if (!obj) return false;
      const ox = obj.x, oy = obj.y, tocados = new Set();
      for (const t of [a, b]) {
        const ang = Math.atan2(oy - t.y, ox - t.x);
        const x2 = t.x + Math.cos(ang) * c.largo, y2 = t.y + Math.sin(ang) * c.largo;
        t.ang = ang; t.tFuego = G.t;
        for (const e of G.enemigos) if (e.vivo && distSegmento(e.x, e.y, t.x, t.y, x2, y2) <= c.ancho) tocados.add(e);
        G.efectos.push({ k: 'rayo', x1: t.x, y1: t.y, x2, y2, t: 0, dur: 0.28, color: 0xffd23f });
      }
      for (const e of tocados) aplicarDano(e, fuerza * (1 + e.fragil));
      cartel(ox, oy - 22, sg.nombre, '#fff3a0', '#5a3200');
    } else if (sg.id === 'ventisca') {
      // Ventisca: onda desde el punto medio de las dos crío que congela y daña alrededor
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const dentro = G.enemigos.filter(e => e.vivo && !e.def.aereo && Math.hypot(e.x - mx, e.y - my) <= c.radio);
      if (!dentro.length) return false;
      for (const e of dentro) { e.congelado = Math.max(e.congelado, c.congela); aplicarDano(e, fuerza * (1 + e.fragil)); }
      G.efectos.push({ k: 'hielo', x: mx, y: my, r: c.radio, t: 0, dur: 0.6 });
      cartel(mx, my - 26, sg.nombre, '#e8fbff', '#0d3b55');
    }
    return true;
  }

  function elegirObjetivo(t) {
    const s = t.s, r2 = s.alcance * s.alcance;
    let mejor = null, mv = -Infinity;
    for (const e of G.enemigos) {
      if (!e.vivo || (e.def.aereo && !s.antiaerea)) continue;
      const dx = e.x - t.x, dy = e.y - t.y;
      if (dx * dx + dy * dy > r2) continue;
      let v = e.dist;
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
      G.tOleada += dt;
      while (G.cola.length && G.cola[0].t <= G.tOleada) crearEnemigo(G.cola.shift().tipo, G.oleada);
      if (!G.cola.length) G.generando = false;
    }

    // Efectos de las torres criogénicas (se recalculan en cada paso)
    for (const e of G.enemigos) { e.lento = 0; e.fragil = 0; if (e.congelado > 0) e.congelado -= dt; }
    for (const t of G.torres) {
      if (t.tipo !== 'crio') continue;
      const s = t.s, r2 = s.alcance * s.alcance;
      let enRango = 0;
      for (const e of G.enemigos) {
        if (e.def.aereo) continue;
        const dx = e.x - t.x, dy = e.y - t.y;
        if (dx * dx + dy * dy > r2) continue;
        enRango++;
        if (s.lento > e.lento) e.lento = s.lento;
        if (s.fragil && s.fragil > e.fragil) e.fragil = s.fragil;
      }
      t.activa = enRango > 0;
      if (s.congela) {
        t.tCong += dt;
        if (t.tCong >= s.cadaSeg && enRango > 0) {
          t.tCong = 0;
          for (const e of G.enemigos) {
            if (e.def.aereo) continue;
            const dx = e.x - t.x, dy = e.y - t.y;
            if (dx * dx + dy * dy <= r2) e.congelado = s.congela;
          }
          G.efectos.push({ k: 'anillo', x: t.x, y: t.y, r: s.alcance, t: 0, dur: 0.45 });
        }
      }
    }

    // Movimiento
    for (const e of G.enemigos) {
      if (e.congelado > 0) continue;
      e.dist += e.def.vel * (1 - e.lento) * dt;
      if (e.dist >= LARGO) {
        G.vidas--;
        aviso('Un enemigo llegó a la base');
        resolverEnemigo(e);
        continue;
      }
      const p = posEn(e.dist);
      e.x = p.x; e.y = p.y;
    }

    // Disparo
    for (const t of G.torres) {
      if (t.tipo !== 'ametralladora') continue;
      t.enfria -= dt;
      if (t.enfria > 0) continue;
      const e = elegirObjetivo(t);
      if (!e) { t.enfria = 0; continue; }
      t.ang = Math.atan2(e.y - t.y, e.x - t.x);
      t.tFuego = G.t;
      G.efectos.push({ k: 'traza', x1: t.x, y1: t.y, x2: e.x, y2: e.y, t: 0, dur: 0.07, h: (e.lento > 0 || e.congelado > 0) && t.sin.includes('quebradizas') });
      danar(e, t.s.dano * t.s.balas, t);
      t.enfria += t.s.cadencia * (t.sin.includes('cruzado') ? D.sinergias.find(x => x.id === 'cruzado').cadencia : 1);
      if (t.enfria < 0) t.enfria = 0;
    }

    // Combos: cada enlace carga mientras alguna de sus dos torres está trabajando.
    // Una torre con varias vecinas reparte su carga: cada enlace carga más lento.
    for (const en of G.enlaces) {
      if (!(trabajando(en.a) || trabajando(en.b))) continue;
      en.carga += dt / (en.sg.combo.cargaSeg * Math.max(en.a.nEnl, en.b.nEnl));
      if (en.carga >= 1) {
        if (lanzarCombo(en)) { en.carga = 0; en.tDisparo = G.t; }
        else en.carga = 1;
      }
    }

    G.enemigos = G.enemigos.filter(e => e.vivo);
    for (const f of G.efectos) f.t += dt;
    G.efectos = G.efectos.filter(f => f.t < f.dur);

    // Fin de partida y cuenta regresiva
    if (G.vidas <= 0) { G.vidas = 0; terminar('derrota'); return; }
    if (!G.generando && !G.enemigos.length && G.oleada > 0) {
      if (G.oleada >= TOTAL_OLEADAS) { terminar('victoria'); return; }
      if (!G.enCuenta) { G.enCuenta = true; G.cuenta = D.oleada.esperaSeg; }
      else {
        G.cuenta -= dt;
        if (G.cuenta <= 0) iniciarOleada(false);
      }
    }
  }

  function terminar(resultado) {
    G.fase = resultado;
    if (resultado === 'victoria') {
      G.guardado.victorias++;
      G.guardado.mejorVidas = Math.max(G.guardado.mejorVidas, G.vidas);
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
    alcance: { ametralladora: 0xffffff, crio: 0xdff6ff }
  };
  const ANCHO_CAMINO = 24;
  let escena = null, gDin = null;
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
  function anguloEn(d) {
    for (const t of TRAMOS) if (d <= t.ini + t.l) return Math.atan2(t.b.y - t.a.y, t.b.x - t.a.x);
    const u = TRAMOS[TRAMOS.length - 1];
    return Math.atan2(u.b.y - u.a.y, u.b.x - u.a.x);
  }

  function flotar(x, y, txt) {
    if (!escena || flotantes.length > 40) return;
    const o = escena.add.text(x, y, txt, {
      fontFamily: 'system-ui, sans-serif', fontSize: '11px', fontStyle: 'bold',
      color: '#fff0a0', stroke: '#4a3200', strokeThickness: 3
    }).setOrigin(0.5).setResolution(ESC).setDepth(5);
    flotantes.push({ o, t: 0, y0: y });
  }
  // Cartel grande con el nombre del combo
  function cartel(x, y, txt, color, borde) {
    if (!escena) return;
    x = Math.max(70, Math.min(W - 70, x)); y = Math.max(16, y);
    const o = escena.add.text(x, y, '¡' + txt + '!', {
      fontFamily: 'system-ui, sans-serif', fontSize: '15px', fontStyle: 'bold',
      color, stroke: borde, strokeThickness: 4
    }).setOrigin(0.5).setResolution(ESC).setDepth(6);
    flotantes.push({ o, t: 0, y0: y, dur: 1.2, sube: 14 });
  }
  function limpiarFlotantes() { for (const f of flotantes) f.o.destroy(); flotantes = []; }

  function bandaCamino(g, ancho, color, alfa) {
    g.fillStyle(color, alfa);
    for (const t of TRAMOS) {
      const x1 = Math.min(t.a.x, t.b.x) - ancho / 2, y1 = Math.min(t.a.y, t.b.y) - ancho / 2;
      g.fillRect(x1, y1, Math.abs(t.b.x - t.a.x) + ancho, Math.abs(t.b.y - t.a.y) + ancho);
    }
  }

  function dibujarFondo(g) {
    const r = azar(20261111);
    // Arena con manchas claras y oscuras
    g.fillStyle(COL.arena, 1).fillRect(0, 0, W, H);
    for (let i = 0; i < 46; i++) {
      g.fillStyle(r() < 0.5 ? COL.arenaClara : COL.arenaOscura, 0.10 + r() * 0.12)
        .fillEllipse(r() * W, r() * H, 50 + r() * 110, 22 + r() * 46);
    }
    // Ondas de duna
    for (let i = 0; i < 34; i++) {
      const x = r() * W, y = r() * H, largo = 24 + r() * 46;
      g.lineStyle(1.2, COL.arenaOscura, 0.35);
      g.beginPath(); g.moveTo(x, y);
      for (let k = 1; k <= 6; k++) g.lineTo(x + largo * k / 6, y + Math.sin(k * 1.1) * 2.2);
      g.strokePath();
      g.lineStyle(1, COL.arenaClara, 0.4);
      g.beginPath(); g.moveTo(x, y + 2);
      for (let k = 1; k <= 6; k++) g.lineTo(x + largo * k / 6, y + 2 + Math.sin(k * 1.1) * 2.2);
      g.strokePath();
    }
    // Grano
    for (let i = 0; i < 700; i++) {
      g.fillStyle(r() < 0.5 ? 0x7a5a2c : 0xfff0c8, 0.16).fillRect(r() * W, r() * H, 1.2, 1.2);
    }

    // Camino de tierra con huellas de vehículos
    bandaCamino(g, ANCHO_CAMINO + 5, COL.arenaOscura, 0.55);
    bandaCamino(g, ANCHO_CAMINO, COL.rutaBorde, 1);
    bandaCamino(g, ANCHO_CAMINO - 3, COL.ruta, 1);
    bandaCamino(g, 14, COL.huella, 0.55);
    bandaCamino(g, 7, COL.ruta, 1);
    for (let d = 0; d < LARGO; d += 3) {
      const p = posEn(d);
      g.fillStyle(r() < 0.5 ? 0x7a5a2c : 0xc9a66c, 0.25)
        .fillRect(p.x + (r() - 0.5) * (ANCHO_CAMINO - 4), p.y + (r() - 0.5) * (ANCHO_CAMINO - 4), 1.5, 1.5);
    }

    // Rocas y matorrales secos en las esquinas de algunas celdas libres
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
            g.fillStyle(0x8c7b63, 1).fillEllipse(rx, ry, t * 2.2, t * 1.6);
            g.fillStyle(0xb7a686, 1).fillEllipse(rx - t * 0.3, ry - t * 0.3, t * 1.1, t * 0.7);
          }
        } else {
          for (let k = 0; k < 7; k++) {
            const a = r() * Math.PI * 2, l = 2 + r() * 4;
            g.lineStyle(1.2, r() < 0.5 ? 0x6f7a3a : 0x8a7a3e, 0.9).lineBetween(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l);
          }
        }
      }
    }

    // Entrada: barreras a ambos lados del camino
    const ini = posEn(C / 2), fin = PUNTOS[PUNTOS.length - 1];
    for (const lado of [-1, 1]) {
      const by = ini.y + lado * (ANCHO_CAMINO / 2 + 5);
      g.fillStyle(COL.sombra, 0.25).fillRect(2, by - 1, 14, 5);
      for (let k = 0; k < 4; k++) g.fillStyle(k % 2 ? 0xf2f2f2 : 0xc0392b, 1).fillRect(k * 3.5, by - 3, 3.5, 5);
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
  function medidorCombo(g, en) {
    const mx = (en.a.x + en.b.x) / 2, my = (en.a.y + en.b.y) / 2, k = Math.min(1, en.carga);
    const hace = G.t - en.tDisparo;
    g.fillStyle(0x2a1c08, 0.9).fillCircle(mx, my, 7);
    g.lineStyle(1, 0x000000, 0.5).strokeCircle(mx, my, 7);
    if (k > 0) {
      g.lineStyle(3.2, k >= 1 ? 0xffffff : COL.oro, 1);
      g.beginPath(); g.arc(mx, my, 4.6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); g.strokePath();
    }
    if (hace < 0.4) {
      const q = hace / 0.4;
      g.lineStyle(3, 0xffffff, 1 - q).strokeCircle(mx, my, 7 + 16 * q);
      g.lineStyle(6, 0xffffff, 0.8 * (1 - q)).lineBetween(en.a.x, en.a.y, en.b.x, en.b.y);
    }
  }

  function dibujarTorre(g, t, alfa) {
    const x = t.x, y = t.y, crio = t.tipo === 'crio';
    // Losa de hormigón con pernos
    g.fillStyle(COL.sombra, 0.25 * alfa).fillRoundedRect(x - 13, y - 12, 31, 31, 5);
    g.fillStyle(crio ? 0x8d959b : COL.losa, alfa).fillRoundedRect(x - 15, y - 15, 30, 30, 5);
    g.lineStyle(1.5, COL.losaBorde, alfa).strokeRoundedRect(x - 15, y - 15, 30, 30, 5);
    g.lineStyle(1, COL.losaLuz, 0.8 * alfa).lineBetween(x - 11, y - 13.5, x + 11, y - 13.5).lineBetween(x - 13.5, y - 11, x - 13.5, y + 11);
    g.fillStyle(COL.losaBorde, alfa);
    for (const [dx, dy] of [[-11, -11], [11, -11], [-11, 11], [11, 11]]) g.fillCircle(x + dx, y + dy, 1.3);

    if (!crio) {
      const a = t.ang, doble = t.s && t.s.balas > 1;
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
    // Marcas de mejora
    for (let i = 0; i < (t.nivel || 0); i++) {
      g.fillStyle(0x3a2a10, alfa).fillRect(x - 10.5 + i * 7, y + 9.5, 6, 4.5);
      g.fillStyle(COL.oro, alfa).fillRect(x - 9.5 + i * 7, y + 10.5, 4, 2.5);
    }
  }

  function dibujarEnemigo(g, e) {
    const x = e.x, y = e.y, blind = e.tipo === 'blindado';
    // Giro suave en las curvas (solo visual)
    const meta = anguloEn(e.dist);
    if (e.va == null) e.va = meta;
    let dif = meta - e.va;
    while (dif > Math.PI) dif -= Math.PI * 2;
    while (dif < -Math.PI) dif += Math.PI * 2;
    e.va += dif * 0.25;
    const a = e.va;

    if (blind) {
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
      g.fillStyle(0x6a6460, 1).fillCircle(x + cs * 0.2 - 0.8, y + sn * 0.2 - 0.8, 1.4);
    } else {
      const vaiven = Math.sin(e.dist * 0.45) * 0.9;
      const px = x - Math.sin(a) * vaiven, py = y + Math.cos(a) * vaiven;
      g.fillStyle(COL.sombra, 0.26).fillEllipse(px + 1.5, py + 2.5, 14, 11);
      poli(g, px, py, a, caja(-6.5, -3, 3.5, 6), 0x3b3228, 1);                       // mochila
      poli(g, px, py, a, [[-3.5, -6.5], [1.5, -6.5], [4, -3.5], [4, 3.5], [1.5, 6.5], [-3.5, 6.5], [-4.8, 0]], COL.rojo, 1, COL.rojoOsc, 1.1);
      poli(g, px, py, a, caja(1.5, 2.6, 10, 1.9), 0x1a1a1a, 1);                      // fusil
      poli(g, px, py, a, caja(2, 1.6, 3, 3.6), 0xd9b08c, 1);                         // manos
      const cs = Math.cos(a), sn = Math.sin(a);
      g.fillStyle(0x3a3f45, 1).fillCircle(px + cs * 0.6, py + sn * 0.6, 3.9);
      g.lineStyle(1, 0x1d2024, 1).strokeCircle(px + cs * 0.6, py + sn * 0.6, 3.9);
      g.fillStyle(0x7d858d, 1).fillCircle(px + cs * 0.6 - 1, py + sn * 0.6 - 1.2, 1.2);
    }

    const rr = blind ? 14 : 10;
    if (e.congelado > 0) {
      g.fillStyle(COL.hielo, 0.6).fillCircle(x, y, rr);
      g.lineStyle(1.8, 0xffffff, 1).strokeCircle(x, y, rr);
    } else if (e.lento > 0) {
      g.fillStyle(COL.crioLuz, 0.22).fillCircle(x, y, rr);
      g.lineStyle(1.5, COL.crioAzul, 0.9).strokeCircle(x, y, rr);
    }
    if (e.vida < e.vidaMax) {
      const k = Math.max(0, e.vida / e.vidaMax), w = blind ? 24 : 18, by = y - (blind ? 19 : 15);
      g.fillStyle(0x1b1b1b, 0.8).fillRect(x - w / 2 - 1, by - 1, w + 2, 5);
      g.fillStyle(k > 0.5 ? 0x3ddc6a : k > 0.25 ? 0xffb020 : 0xff4a3a, 1).fillRect(x - w / 2, by, w * k, 3);
    }
  }

  function dibujar() {
    const g = gDin;
    g.clear();

    // Zonas de frío activas
    for (const t of G.torres) {
      if (t.tipo === 'crio' && t.activa) {
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
    for (const en of G.enlaces || []) enlace(g, en.a.x, en.a.y, en.b.x, en.b.y, 0.85);
    for (const t of G.torres) dibujarTorre(g, t, 1);
    for (const en of G.enlaces || []) medidorCombo(g, en);
    if (G.torreSel) {
      const t = G.torreSel;
      g.lineStyle(4, 0x3a2a10, 0.5).strokeRoundedRect(t.x - 18, t.y - 18, 36, 36, 7);
      g.lineStyle(2, 0xffffff, 1).strokeRoundedRect(t.x - 18, t.y - 18, 36, 36, 7);
    }

    for (const e of G.enemigos) dibujarEnemigo(g, e);

    for (const f of G.efectos) {
      const k = f.t / f.dur;
      if (f.k === 'traza') {
        g.lineStyle(f.h ? 3 : 2, f.h ? 0x9fe8ff : 0xfff3a0, 0.9 * (1 - k)).lineBetween(f.x1, f.y1, f.x2, f.y2);
        g.fillStyle(0xffffff, 1 - k).fillCircle(f.x2, f.y2, f.h ? 3.4 : 2.2);
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
      } else if (f.k === 'polvo') {
        g.fillStyle(0xe9d3a4, 0.75 * (1 - k)).fillCircle(f.x, f.y, 4 + 9 * k);
        g.fillStyle(0xb8935a, 0.5 * (1 - k)).fillCircle(f.x + 3, f.y - 2, 3 + 6 * k);
      } else if (f.k === 'explosion') {
        g.fillStyle(0x2a2625, 0.5 * (1 - k)).fillCircle(f.x, f.y, 8 + 14 * k);
        g.fillStyle(0xff8a1f, 0.95 * (1 - k)).fillCircle(f.x, f.y, 5 + 11 * k);
        g.fillStyle(0xfff3a0, 1 - k).fillCircle(f.x, f.y, 3 + 5 * k);
      }
    }
  }

  const escenaJuego = {
    create() {
      escena = this;
      const cam = this.cameras.main;
      cam.setZoom(ESC);
      cam.centerOn(W / 2, H / 2);
      dibujarFondo(this.add.graphics());
      const estilo = { fontFamily: 'system-ui, sans-serif', fontSize: '8px', fontStyle: 'bold', color: '#5a3d1a' };
      const ini = posEn(C / 2), fin = PUNTOS[PUNTOS.length - 1];
      this.add.text(4, ini.y - 30, 'ENTRADA', estilo).setResolution(ESC);
      this.add.text(W - 3, fin.y - 36, 'BASE', estilo).setOrigin(1, 0).setResolution(ESC);
      gDin = this.add.graphics().setDepth(2);
      this.input.mouse && this.input.mouse.disableContextMenu();
      // Tocar ubica la torre; arrastrar el dedo la mueve antes de confirmar
      let arrastre = false;
      this.input.on('pointerdown', p => {
        const pt = cam.getWorldPoint(p.x, p.y);
        arrastre = tocarMapa(pt.x, pt.y);
      });
      this.input.on('pointermove', p => {
        if (!arrastre || !p.isDown || !G.tipoSel || G.fase !== 'jugando') return;
        const pt = cam.getWorldPoint(p.x, p.y);
        G.puntoSel = ajustar(pt.x, pt.y);
      });
      this.input.on('pointerup', () => { arrastre = false; });
      listo = true;
      refrescarTodo();
    },
    update(_t, delta) {
      if (G.fase === 'jugando' && !G.pausa) {
        let resto = Math.min(delta, 100) / 1000 * G.vel;
        while (resto > 1e-6 && G.fase === 'jugando') {
          const paso = Math.min(resto, 1 / 30);
          avanzar(paso);
          resto -= paso;
        }
      }
      const dtReal = Math.min(delta, 100) / 1000;
      for (const f of flotantes) {
        const dur = f.dur || 0.8;
        f.t += dtReal; f.o.y = f.y0 - (f.sube || 22) * f.t;
        f.o.setAlpha(Math.max(0, Math.min(1, (1 - f.t / dur) * 2.5)));
      }
      flotantes = flotantes.filter(f => { if (f.t >= (f.dur || 0.8)) { f.o.destroy(); return false; } return true; });
      dibujar();
      tUI += delta;
      if (tUI >= 100) { tUI = 0; refrescarTodo(); }
    }
  };
  let listo = false, tUI = 0;

  // ───────────────────────── 6. INTERFAZ HTML ─────────────────────────
  // Devuelve true si quedó una torre por ubicar (para permitir arrastrarla)
  function tocarMapa(x, y) {
    if (G.fase !== 'jugando') return false;
    let colocando = false;
    const t = torreEn(x, y);
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
    candado: '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="#4a6080" stroke-width="1.6"><rect x="5" y="9" width="10" height="8" rx="1.5"/><path d="M7 9V6.5a3 3 0 016 0V9"/></svg>'
  };

  function armarBotonesTorre() {
    const cont = $('torres');
    cont.innerHTML = '';
    for (const tipo in D.torres) {
      const def = D.torres[tipo];
      const b = document.createElement('button');
      b.className = 'torre'; b.dataset.tipo = tipo;
      b.innerHTML = ICONO[tipo] + '<span class="tn">' + def.corto + '</span><span class="tc">' + def.costo + 'cr</span>';
      b.addEventListener('click', () => {
        if (G.fase !== 'jugando') return;
        G.tipoSel = G.tipoSel === tipo && !G.puntoSel ? null : tipo;
        G.torreSel = null;
        refrescarTodo();
      });
      cont.appendChild(b);
    }
    for (const p of D.torresProximas) {
      const b = document.createElement('button');
      b.className = 'torre'; b.disabled = true;
      b.innerHTML = ICONO.candado + '<span class="tn">' + p.corto + '</span><span class="tc tenue">Pronto</span>';
      cont.appendChild(b);
    }
  }

  function textoStats(tipo, s) {
    if (tipo === 'ametralladora') {
      return 'Daño ' + s.dano + (s.balas > 1 ? ' ×' + s.balas : '') + ' · cada ' + dec(s.cadencia) + ' s · alcance ' + s.alcance +
        (s.perforante ? ' · perforante' : '');
    }
    return 'Ralentiza ' + Math.round(s.lento * 100) + '% · alcance ' + s.alcance +
      (s.congela ? ' · congela ' + s.congela + ' s cada ' + s.cadaSeg + ' s' : '') +
      (s.fragil ? ' · fragilidad +' + Math.round(s.fragil * 100) + '%' : '');
  }

  function refrescarPanel() {
    const tit = $('infoTitulo'), det = $('infoDet'), sin = $('infoSin');
    const bC = $('btnConstruir'), bX = $('btnCancelar'), bM = $('btnMejorar'), bP = $('btnPrioridad'), bV = $('btnVender');
    let vC = false, vX = false, vM = false, vP = false, vV = false, tSin = '';

    if (G.torreSel) {
      const t = G.torreSel, def = D.torres[t.tipo], m = mejoraSiguiente(t);
      poner(tit, 'textContent', def.nombre + ' · mejoras ' + t.nivel + '/' + def.mejoras.length);
      poner(det, 'textContent', textoStats(t.tipo, t.s));
      const mios = {};
      for (const en of G.enlaces) {
        if (en.a !== t && en.b !== t) continue;
        const m0 = mios[en.sg.nombre] || (mios[en.sg.nombre] = { n: 0, carga: 0 });
        m0.n++; m0.carga = Math.max(m0.carga, Math.min(1, en.carga));
      }
      const nombres = Object.keys(mios);
      if (nombres.length) {
        tSin = 'Combo: ' + nombres.map(n => n + (mios[n].n > 1 ? ' ×' + mios[n].n : '') + ' ' + Math.floor(mios[n].carga * 100) + '%').join(' · ');
      } else {
        tSin = t.tipo === 'crio' ? 'Sin combo: ponle una Ametralladora u otra Crío al lado' : 'Sin combo: ponle una Crío u otra Ametralladora al lado';
      }
      vM = true; vV = true; vP = t.tipo === 'ametralladora';
      if (m) { poner(bM, 'textContent', 'Mejorar ' + m.costo + 'cr · ' + m.nombre); poner(bM, 'disabled', G.creditos < m.costo); }
      else { poner(bM, 'textContent', 'Mejoras completas'); poner(bM, 'disabled', true); }
      poner(bP, 'textContent', 'Objetivo: ' + D.prioridades[t.prioridad]);
      poner(bV, 'textContent', 'Vender +' + valorVenta(t) + 'cr');
    } else if (G.tipoSel) {
      const def = D.torres[G.tipoSel];
      const s = {}; for (const k in def) if (!NO_STAT[k]) s[k] = def[k];
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
      poner(det, 'textContent', 'Elige una torre de arriba y toca el lugar donde la quieres. Toca una torre ya construida para mejorarla o venderla.');
    }
    poner(sin, 'textContent', tSin);
    mostrar(bC, vC); mostrar(bX, vX); mostrar(bM, vM); mostrar(bP, vP); mostrar(bV, vV);

    for (const b of document.querySelectorAll('#torres .torre[data-tipo]')) {
      const tipo = b.dataset.tipo;
      b.classList.toggle('sel', G.tipoSel === tipo);
      b.classList.toggle('caro', G.creditos < D.torres[tipo].costo);
    }
  }

  function refrescarHud() {
    poner($('hudCreditos'), 'textContent', cr(G.creditos));
    poner($('hudOleada'), 'textContent', 'Oleada ' + G.oleada + ' / ' + TOTAL_OLEADAS);
    poner($('hudVidas'), 'textContent', String(G.vidas));
    const b = $('btnOleada');
    let txt, on = true;
    if (G.fase !== 'jugando') { txt = '—'; on = false; }
    else if (G.oleada === 0) txt = '▶ Iniciar oleada 1';
    else if (G.generando) { txt = 'Oleada ' + G.oleada + ' en curso'; on = false; }
    else if (G.oleada >= TOTAL_OLEADAS) { txt = 'Última oleada'; on = false; }
    else if (G.enemigos.length) txt = '▶ Adelantar oleada ' + (G.oleada + 1) + ' · +' + bonoAdelanto() + 'cr';
    else txt = '▶ Oleada ' + (G.oleada + 1) + ' en ' + Math.ceil(G.cuenta) + ' s · +' + bonoAdelanto() + 'cr';
    poner(b, 'textContent', txt);
    poner(b, 'disabled', !on);
    poner($('btnVel'), 'textContent', '×' + G.vel);
    poner($('btnPausa'), 'textContent', G.pausa ? '▶' : 'II');
    $('btnPausa').classList.toggle('activo', G.pausa);
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

  function mostrarMenu() {
    const g = G.guardado;
    $('veloTitulo').textContent = D.nombre;
    $('veloSub').textContent = MAPA.nombre + ' · ' + TOTAL_OLEADAS + ' oleadas';
    $('veloDatos').innerHTML = g.partidas
      ? '<div><b>' + cr(g.bajasTotales) + '</b><span>enemigos eliminados</span></div><div><b>' + g.victorias + '</b><span>victorias</span></div><div><b>' + (g.victorias ? g.mejorVidas : '—') + '</b><span>mejor resultado (vidas)</span></div>'
      : '<p>Defiende la base. Ubica torres en cualquier lugar del campo y ponlas pegadas entre sí: cargan un combo, un ataque especial que se dispara solo.</p>';
    $('veloBoton').textContent = 'Jugar';
    $('velo').hidden = false;
  }
  function mostrarFinal() {
    const gano = G.fase === 'victoria';
    $('veloTitulo').textContent = gano ? 'Base defendida' : 'Base destruida';
    $('veloSub').textContent = gano ? 'Superaste las ' + TOTAL_OLEADAS + ' oleadas' : 'Caíste en la oleada ' + G.oleada + ' de ' + TOTAL_OLEADAS;
    $('veloDatos').innerHTML = '<div><b>' + G.vidas + '</b><span>vidas restantes</span></div><div><b>' + G.bajas + '</b><span>enemigos eliminados</span></div><div><b>' + cr(G.guardado.bajasTotales) + '</b><span>eliminados en total</span></div>';
    $('veloBoton').textContent = 'Jugar de nuevo';
    $('velo').hidden = false;
    refrescarTodo();
  }

  function conectarBotones() {
    $('veloBoton').addEventListener('click', () => { $('velo').hidden = true; nuevaPartida(); });
    $('btnOleada').addEventListener('click', () => { iniciarOleada(true); refrescarTodo(); });
    $('btnVel').addEventListener('click', () => { G.vel = G.vel === 1 ? 2 : 1; refrescarTodo(); });
    $('btnPausa').addEventListener('click', () => { if (G.fase === 'jugando') { G.pausa = !G.pausa; refrescarTodo(); } });
    $('btnConstruir').addEventListener('click', () => {
      if (!G.puntoSel || !G.tipoSel) return;
      if (construir(G.tipoSel, G.puntoSel.x, G.puntoSel.y)) G.puntoSel = null;
      refrescarTodo();
    });
    $('btnCancelar').addEventListener('click', () => { G.puntoSel = null; G.tipoSel = null; refrescarTodo(); });
    $('btnMejorar').addEventListener('click', () => { if (G.torreSel) mejorar(G.torreSel); refrescarTodo(); });
    $('btnPrioridad').addEventListener('click', () => { if (G.torreSel) cambiarPrioridad(G.torreSel); refrescarTodo(); });
    $('btnVender').addEventListener('click', () => { if (G.torreSel) vender(G.torreSel); refrescarTodo(); });
    // Si la app pasa a segundo plano, se pausa sola
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && G.fase === 'jugando') { G.pausa = true; refrescarTodo(); }
    });
  }

  // Arranque
  G.enlaces = [];
  document.title = D.nombre;
  $('veloCredito').textContent = 'Creado por ' + D.autor + ' · Versión ' + D.version;
  armarBotonesTorre();
  conectarBotones();
  mostrarMenu();
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'mapa',
    width: W * ESC, height: H * ESC,
    backgroundColor: '#d8b878',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { noAudio: true },
    banner: false,
    scene: escenaJuego
  });

  // Acceso para pruebas automáticas y para la consola del navegador
  window.TD = { G, D, construir, mejorar, vender, iniciarOleada, avanzar, nuevaPartida, torreEn, puedeConstruir, ajustar };
})();
