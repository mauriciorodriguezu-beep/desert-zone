/* datos.js — TODOS los números del juego viven aquí.
   Para ajustar el balance se edita este archivo; no hace falta tocar juego.js.
   Unidades: distancias en px (1 celda = 40 px), tiempos en segundos, precios en créditos (cr). */

const DATOS = {
  nombre: 'Tower Defense Desert Zone',
  autor: 'Mauricio Rodríguez',
  version: '0.1.3',

  // Campo de 360 x 440 px. La cuadrícula de 40 px solo se usa para trazar el camino;
  // las torres se ubican libremente.
  celda: 40,
  cols: 9,
  filas: 11,

  colocacion: {
    tamTorre: 30,     // lado de la torre; dos torres no pueden montarse
    claroCamino: 27,  // distancia mínima del centro de la torre al eje del camino
    distCombo: 48     // dos torres forman combo si sus centros están a esta distancia o menos
  },

  inicio: { creditos: 200, vidas: 20 },

  // Al vender se recupera este % de TODO lo invertido (compra + mejoras)
  venta: 0.6,

  oleada: {
    bonoBase: 20,           // bono al limpiar una oleada = bonoBase + bonoPorOleada x número de oleada
    bonoPorOleada: 5,
    esperaSeg: 10,          // cuenta regresiva entre oleadas
    bonoAdelantoPorSeg: 3,  // cr por cada segundo adelantado (con enemigos vivos cuenta como esperaSeg completos)
    escalaVida: 0.30        // cada oleada los enemigos tienen +30% de vida respecto de la primera
  },

  prioridades: {
    primero: 'Primero',     // el que va más adelante en el camino
    fuerte: 'Más fuerte',   // el que tiene más vida
    rapido: 'Más rápido'    // el de mayor velocidad
  },

  /* TORRES
     resist de los enemigos multiplica el daño según tipoDano (fisico / energia / explosivo).
     MEJORAS POR ATRIBUTO: cada atributo se compra por separado y tiene sus propios niveles.
     Cada nivel pisa los valores que trae. "nota" es el texto corto del efecto extra de ese nivel.
     Los nombres internos de los atributos (dano, cadencia, alcance, frio, congelacion) no se cambian. */
  torres: {
    ametralladora: {
      nombre: 'Ametralladora', corto: 'Ametr.', costo: 80,
      desc: 'Daño rápido, alcance corto. Dispara a tierra y aire.',
      tipoDano: 'fisico', antiaerea: true,
      dano: 8, cadencia: 0.35, alcance: 90,
      atributos: {
        dano: { nombre: 'Daño', niveles: [
          { costo: 40,  dano: 11 },
          { costo: 70,  dano: 14 },
          { costo: 120, dano: 18, perforante: true, nota: 'perfora' }     // ignora la resistencia física
        ] },
        cadencia: { nombre: 'Cadencia', niveles: [                       // segundos entre disparos
          { costo: 40,  cadencia: 0.29 },
          { costo: 70,  cadencia: 0.24 },
          { costo: 120, cadencia: 0.20, doble: true, nota: 'doble cañón' }
        ] },
        alcance: { nombre: 'Alcance', niveles: [
          { costo: 30, alcance: 105 },
          { costo: 50, alcance: 120 },
          { costo: 80, alcance: 135 }
        ] }
      }
    },
    crio: {
      nombre: 'Torre criogénica', corto: 'Crío', costo: 120,
      desc: 'No hace daño. Ralentiza a todo enemigo terrestre dentro de su alcance.',
      alcance: 80, lento: 0.5,
      atributos: {
        frio: { nombre: 'Frío', niveles: [                               // cuánto frena
          { costo: 50,  lento: 0.6 },
          { costo: 80,  lento: 0.7 },
          { costo: 120, lento: 0.8 }
        ] },
        alcance: { nombre: 'Alcance', niveles: [
          { costo: 40, alcance: 92 },
          { costo: 60, alcance: 104 },
          { costo: 90, alcance: 116 }
        ] },
        congelacion: { nombre: 'Congelar', niveles: [                    // congela "congela" s cada "cadaSeg" s
          { costo: 90,  congela: 1.5, cadaSeg: 7 },
          { costo: 130, congela: 2,   cadaSeg: 6 },
          { costo: 190, congela: 2,   cadaSeg: 6, fragil: 0.3, nota: 'fragiliza' }   // los afectados reciben +30% de daño
        ] }
      }
    }
  },

  // Torres del GDD que todavía no están programadas (solo se muestran bloqueadas)
  torresProximas: [
    { corto: 'Plasma',  costo: 150 },
    { corto: 'Misiles', costo: 200 }
  ],

  /* COMBOS: dos torres pegadas (centros a colocacion.distCombo px o menos) forman un enlace con un combo.
     - Bono permanente: el campo "para" indica qué torre lo recibe (una sola vez aunque tenga varias vecinas).
     - Ataque especial ("combo"): el círculo entre las dos torres se va llenando mientras alguna de las dos
       trabaja (dispara o frena enemigos). Al llenarse, el ataque sale solo.
         cargaSeg       segundos que tarda en llenarse con una sola vecina. Una torre con varias vecinas
                        reparte su carga: con 2 enlaces cada uno tarda el doble.
         dano           daño base del ataque especial (ignora resistencias)
         danoPorMejora  daño extra por cada mejora comprada entre las dos torres
     Los "id" no se cambian: el código los usa. */
  sinergias: [
    { id: 'quebradizas', nombre: 'Metralla de hielo', entre: ['ametralladora', 'crio'], para: 'ametralladora',
      danoALentos: 1.4,                                  // bono: +40% de daño a enemigos ralentizados o congelados
      combo: { cargaSeg: 6, dano: 30, danoPorMejora: 3, radio: 45, congela: 0.8, texto: 'explosión que congela' } },
    { id: 'cruzado', nombre: 'Fuego cruzado', entre: ['ametralladora', 'ametralladora'], para: 'ametralladora',
      cadencia: 0.85,                                    // bono: dispara 15% más rápido
      combo: { cargaSeg: 6, dano: 45, danoPorMejora: 7, largo: 170, ancho: 12, texto: 'ráfaga que atraviesa' } },
    { id: 'ventisca', nombre: 'Ventisca', entre: ['crio', 'crio'], para: null,
      combo: { cargaSeg: 8, dano: 15, danoPorMejora: 3, radio: 105, congela: 1.8, texto: 'onda que congela' } }
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
