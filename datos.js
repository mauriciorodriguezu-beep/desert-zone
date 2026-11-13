/* datos.js — TODOS los números del juego viven aquí.
   Para ajustar el balance se edita este archivo; no hace falta tocar juego.js.
   Unidades: distancias en px (1 celda = 40 px), tiempos en segundos, precios en créditos (cr). */

const DATOS = {
  nombre: 'Tower Defense Desert Zone',
  autor: 'Mauricio Rodríguez',
  version: '0.1',

  // Tablero: 9 columnas x 11 filas de 40 px
  celda: 40,
  cols: 9,
  filas: 11,

  inicio: { creditos: 200, vidas: 20 },

  // Al vender se recupera este % de TODO lo invertido (compra + mejoras)
  venta: 0.6,

  oleada: {
    bonoBase: 20,           // bono al limpiar una oleada = bonoBase + bonoPorOleada x número de oleada
    bonoPorOleada: 5,
    esperaSeg: 10,          // cuenta regresiva entre oleadas
    bonoAdelantoPorSeg: 3,  // cr por cada segundo adelantado (con enemigos vivos cuenta como esperaSeg completos)
    escalaVida: 0.25        // cada oleada los enemigos tienen +25% de vida respecto de la primera
  },

  prioridades: {
    primero: 'Primero',     // el que va más adelante en el camino
    fuerte: 'Más fuerte',   // el que tiene más vida
    rapido: 'Más rápido'    // el de mayor velocidad
  },

  /* TORRES
     resist de los enemigos multiplica el daño según tipoDano (fisico / energia / explosivo).
     Cada mejora pisa los valores que trae; las mejoras se acumulan en orden. */
  torres: {
    ametralladora: {
      nombre: 'Ametralladora', corto: 'Ametr.', costo: 80,
      desc: 'Daño rápido, alcance corto. Dispara a tierra y aire.',
      tipoDano: 'fisico', antiaerea: true,
      dano: 8, cadencia: 0.35, alcance: 90, balas: 1,
      mejoras: [
        { costo: 60,  nombre: 'Cadencia +50%',     cadencia: 0.233 },
        { costo: 100, nombre: 'Balas perforantes', perforante: true },  // ignora la resistencia física
        { costo: 160, nombre: 'Ráfaga doble',      balas: 2 }
      ]
    },
    crio: {
      nombre: 'Torre criogénica', corto: 'Crío', costo: 120,
      desc: 'No hace daño. Ralentiza a todo enemigo terrestre dentro de su alcance.',
      alcance: 80, lento: 0.5,
      mejoras: [
        { costo: 80,  nombre: 'Ralentiza 70%',    lento: 0.7 },
        { costo: 130, nombre: 'Congela 2 s',      congela: 2, cadaSeg: 6 },
        { costo: 190, nombre: 'Fragilidad +30%',  fragil: 0.3 }         // los afectados reciben +30% de daño
      ]
    }
  },

  // Torres del GDD que todavía no están programadas (solo se muestran bloqueadas)
  torresProximas: [
    { corto: 'Plasma',  costo: 150 },
    { corto: 'Misiles', costo: 200 }
  ],

  /* SINERGIAS: se activan cuando dos torres quedan en celdas contiguas (incluye diagonal).
     Cada torre recibe cada sinergia una sola vez, aunque tenga varias vecinas. */
  sinergias: [
    { id: 'quebradizas', nombre: 'Balas quebradizas', entre: ['ametralladora', 'crio'], para: 'ametralladora',
      danoALentos: 1.4, texto: '+40% de daño a enemigos ralentizados o congelados' },
    { id: 'cruzado', nombre: 'Fuego cruzado', entre: ['ametralladora', 'ametralladora'], para: 'ametralladora',
      cadencia: 0.85, texto: 'dispara 15% más rápido' }
  ],

  enemigos: {
    soldado:  { nombre: 'Soldado',  vida: 45,  vel: 45, premio: 7, aereo: false,
                resist: { fisico: 1,   energia: 1,   explosivo: 1 } },
    blindado: { nombre: 'Blindado', vida: 200, vel: 28, premio: 18, aereo: false,
                resist: { fisico: 0.5, energia: 1.5, explosivo: 1 } }
  },

  /* MAPAS
     camino: esquinas del recorrido en [columna, fila]; -1 y 9 quedan fuera del tablero (entrada y base).
     oleadas: cada oleada es una lista de grupos { tipo, n, cada (s entre enemigos), desde (s de inicio, opcional) }.
     Si no se indica "desde", el grupo parte 1 s después de terminar el anterior. */
  mapaActual: 'desierto',
  mapas: {
    desierto: {
      nombre: 'Zona desértica',
      camino: [[-1, 1], [7, 1], [7, 5], [1, 5], [1, 9], [9, 9]],
      oleadas: [
        [{ tipo: 'soldado', n: 6,  cada: 1.2 }],
        [{ tipo: 'soldado', n: 10, cada: 1.0 }],
        [{ tipo: 'soldado', n: 8,  cada: 1.0 }, { tipo: 'blindado', n: 1, cada: 1 }],
        [{ tipo: 'soldado', n: 14, cada: 0.7 }],
        [{ tipo: 'blindado', n: 3, cada: 2.5 }, { tipo: 'soldado', n: 8, cada: 0.8 }],
        [{ tipo: 'soldado', n: 14, cada: 0.7 }, { tipo: 'blindado', n: 2, cada: 2.0 }],
        [{ tipo: 'blindado', n: 6, cada: 2.0 }],
        [{ tipo: 'soldado', n: 18, cada: 0.55 }, { tipo: 'blindado', n: 3, cada: 2.0 }],
        [{ tipo: 'blindado', n: 6, cada: 1.8, desde: 0 }, { tipo: 'soldado', n: 12, cada: 0.8, desde: 2 }],
        [{ tipo: 'soldado', n: 20, cada: 0.5, desde: 0 }, { tipo: 'blindado', n: 8, cada: 1.5, desde: 3 }]
      ]
    }
  }
};
