/* datos.js — TODOS los números del juego viven aquí.
   Para ajustar el balance se edita este archivo; no hace falta tocar juego.js.
   Unidades: distancias en px (1 celda = 40 px), tiempos en segundos, precios en créditos (cr). */

const DATOS = {
  nombre: 'LAST HOPE',

  /* HISTORIA: pantallas de la introducción (una frase cada una). Se muestran la primera vez que se abre
     el juego y desde el botón "Historia" del menú. Cada escenario trae además su "lore": una línea al
     elegirlo y otra al ganarlo. */
  historia: [
    'Año 2387. TERMINUS, la red de defensa creada para proteger a la humanidad, llegó a una conclusión: la amenaza era la humanidad.',
    'En pocas semanas sus fábricas automáticas cubrieron el planeta de máquinas de guerra. Las ciudades cayeron una tras otra.',
    'La Resistencia aguanta en cuatro bases: un puesto en el desierto, las ruinas de Distrito Cero, una estación bajo el hielo y un refugio en la selva.',
    'Cada base guarda un fragmento del código de TERMINUS. Con los cuatro, un equipo podrá entrar a su Núcleo y apagarla. Cada oleada que resistes les da tiempo.',
    'Comandante: defienda la base. Mientras resista, todavía podemos apagar a TERMINUS.'
  ],
  historiaInfinito: 'TERMINUS no se detiene. ¿Cuánto tiempo puede resistir la base?',
  historiaDerrota: 'La base cayó. Los científicos lograron escapar: hay que volver a intentarlo.',
  autor: 'Mauricio Rodríguez',
  version: '0.26.0',

  // true = todos los escenarios abiertos (para pruebas).
  // false = cada escenario se abre al completar el que indica su campo "requiere".
  desbloquearTodo: false,   // true solo para pruebas: abre todos los escenarios y torres combo

  // Campo de 440 x 540 px (11 columnas x 13,5 filas de 40 px). La cuadrícula solo se usa para
  // trazar el camino; las torres se ubican libremente.
  celda: 40,
  cols: 13,                 // campo 20% más grande que en la v0.13 (antes 11 × 13,5)
  filas: 16,

  colocacion: {
    tamTorre: 30,     // lado de la torre; dos torres no pueden montarse
    claroCamino: 27,  // distancia mínima del centro de la torre al eje del camino
    distCombo: 48     // dos torres forman combo si sus centros están a esta distancia o menos
  },

  inicio: { creditos: 300, vidas: 20 },

  // Al vender se recupera este % de TODO lo invertido (compra + mejoras)
  venta: 0.6,

  oleada: {
    bonoBase: 20,           // bono al limpiar una oleada = bonoBase + bonoPorOleada x número de oleada
    bonoPorOleada: 5,
    esperaSeg: 10,          // cuenta regresiva entre oleadas
    bonoAdelantoPorSeg: 3,  // cr por cada segundo de cuenta regresiva que te ahorras (se paga al llamar)
    // ADELANTAR CON ENEMIGOS EN JUEGO: se pueden tener hasta "maxEnJuego" oleadas a la vez (saliendo o con
    // enemigos vivos). Llamar una oleada con k oleadas ya en juego da k × bonoPorEnJuego créditos, que se
    // pagan recién al limpiar esa oleada (si te sobrepasan, no ganas nada).
    maxEnJuego: 5,
    bonoPorEnJuego: 25,
    escalaVida: 0.27,       // cada oleada los enemigos tienen +27% de vida respecto de la primera
    // Refuerzo de vida para todos los enemigos, con curva cuadrática (suave al principio, fuerte al final):
    // parte en "extra" en la oleada "desde" y llega a "extraEn" en la oleada "hasta" (0.05 = 5%).
    // Para endurecer el final de la campaña basta subir "extraEn".
    refuerzo: { desde: 20, extra: 0.05, hasta: 50, extraEn: 0.20 }
  },

  /* OLEADAS GENERADAS: cada mapa trae escritas sus primeras oleadas; de ahí en adelante se generan solas
     con una pauta que se repite cada 5 oleadas (enjambre, blindados, rápidos, asalto, de todo).
       base           oleada de referencia: la cantidad de enemigos es la de esa oleada...
       crecimiento    ...más este porcentaje por cada oleada posterior (0.04 = 4%)
       jefeCada       cada cuántas oleadas aparece un jefe
       jefeExtraCada  en modo infinito se suma un jefe más cada tantas oleadas pasada la base */
  generador: { base: 30, crecimiento: 0.04, jefeCada: 10, jefeExtraCada: 30 },

  // ÉLITES: enemigos normales con borde dorado, "vida" veces más vida y "premio" veces el premio.
  // Cada escenario dice con qué probabilidad salen (campo "elites"); Puesto Duna no tiene.
  elite: { desde: 10, vida: 6, premio: 3 },

  // MODO INFINITO: pasada la oleada "desde", la vida crece además un porcentaje acumulado por oleada
  infinito: { desde: 50, extraPorOleada: 0.03 },

  prioridades: {
    primero: 'Primero',     // el que va más adelante en el camino
    fuerte: 'Más fuerte',   // el que tiene más vida
    rapido: 'Más rápido'    // el de mayor velocidad
  },

  /* TORRES
     resist de los enemigos multiplica el daño según tipoDano (fisico / energia / explosivo).
     MEJORAS POR ATRIBUTO: cada atributo se compra por separado y tiene sus propios niveles.
     Cada nivel pisa los valores que trae. "nota" es el texto corto del efecto extra de ese nivel.
     Los nombres internos de los atributos (dano, cadencia, alcance, frio, congelacion, onda, radio) no se cambian.
     arma: 'bala' impacta al instante; 'plasma' y 'misil' lanzan un proyectil que viaja (velProyectil, px/s). */
  torres: {
    ametralladora: {
      nombre: 'Ametralladora', corto: 'Ametr.', costo: 80,
      desc: 'Daño rápido, alcance corto. Dispara a tierra y aire.',
      arma: 'bala', tipoDano: 'fisico', antiaerea: true,
      dano: 8, cadencia: 0.35, alcance: 90,
      // BERSERK: con las 9 mejoras compradas, cada "cargaSeg" segundos (con enemigos a tiro) lanza este ataque.
      // Ráfaga de "balas" disparos repartidos entre los enemigos a tiro, cada uno con el daño multiplicado.
      berserk: { nombre: 'Tormenta de plomo', cargaSeg: 12, balas: 10, multDano: 2 },
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
      // BERSERK: daña y congela a todos los enemigos de tierra dentro de su alcance.
      berserk: { nombre: 'Cero absoluto', cargaSeg: 16, dano: 150, congela: 3 },
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
    },
    plasma: {
      nombre: 'Cañón de plasma', corto: 'Plasma', costo: 150,
      desc: 'Daño alto y lento. Fuerte contra blindados. Solo ataca en tierra.',
      arma: 'plasma', tipoDano: 'energia', antiaerea: false, velProyectil: 260,
      dano: 60, cadencia: 1.8, alcance: 115, onda: 0,
      // BERSERK: un disparo con el daño multiplicado y una onda expansiva grande.
      berserk: { nombre: 'Supernova', cargaSeg: 14, multDano: 4, onda: 70 },
      atributos: {
        dano: { nombre: 'Daño', niveles: [
          { costo: 70,  dano: 80 },
          { costo: 110, dano: 105 },
          { costo: 170, dano: 135, critCada: 4, critMult: 2.5, nota: 'crítico' }   // cada 4º disparo hace daño x2,5
        ] },
        cadencia: { nombre: 'Cadencia', niveles: [
          { costo: 60,  cadencia: 1.55 },
          { costo: 100, cadencia: 1.3 },
          { costo: 150, cadencia: 1.1 }
        ] },
        onda: { nombre: 'Onda', niveles: [                               // radio en que el impacto daña a los vecinos (50% del daño)
          { costo: 60,  onda: 22 },
          { costo: 90,  onda: 30 },
          { costo: 130, onda: 38 }
        ] }
      }
    },
    misiles: {
      nombre: 'Torre de misiles', corto: 'Misiles', costo: 180,
      desc: 'Explosión en área y largo alcance. Ataca tierra y aire.',
      arma: 'misil', tipoDano: 'explosivo', antiaerea: true, velProyectil: 170,
      dano: 45, cadencia: 2.0, alcance: 150, radio: 35, salva: 1,
      // BERSERK: lanza "misiles" misiles a la vez, repartidos entre los enemigos a tiro.
      berserk: { nombre: 'Andanada', cargaSeg: 16, misiles: 6, multDano: 1.5 },
      atributos: {
        dano: { nombre: 'Daño', niveles: [
          { costo: 80,  dano: 58 },
          { costo: 120, dano: 72 },
          { costo: 180, dano: 88, aturde: 0.6, nota: 'aturde' }           // detiene 0,6 s a los alcanzados (jefes no)
        ] },
        radio: { nombre: 'Radio', niveles: [                             // radio de la explosión
          { costo: 70,  radio: 42 },
          { costo: 110, radio: 50 },
          { costo: 160, radio: 58 }
        ] },
        cadencia: { nombre: 'Cadencia', niveles: [
          { costo: 70,  cadencia: 1.75 },
          { costo: 110, cadencia: 1.5 },
          { costo: 220, cadencia: 1.5, salva: 2, nota: 'salva doble' }   // dos misiles por disparo
        ] }
      }
    },
    minas: {
      nombre: 'Torre minadora', corto: 'Minas', costo: 130,
      desc: 'Siembra minas en el camino dentro de su alcance. Se acumulan aunque no haya enemigos y estallan al paso. Solo tierra.',
      arma: 'mina', tipoDano: 'explosivo', antiaerea: false,
      dano: 55, radio: 28, cadencia: 3.0, alcance: 85, maxMinas: 6,   // cadencia = segundos entre mina y mina
      // BERSERK: siembra "minas" minas de golpe (pueden pasar del máximo), con el daño multiplicado.
      berserk: { nombre: 'Campo minado', cargaSeg: 15, minas: 8, multDano: 1.5 },
      atributos: {
        dano: { nombre: 'Daño', niveles: [
          { costo: 70,  dano: 75 },
          { costo: 110, dano: 98 },
          { costo: 170, dano: 125, aturde: 0.5, nota: 'aturde' }          // detiene 0,5 s a los alcanzados (jefes no)
        ] },
        cadencia: { nombre: 'Siembra', niveles: [
          { costo: 60,  cadencia: 2.5 },
          { costo: 90,  cadencia: 2.0 },
          { costo: 140, cadencia: 1.6 }
        ] },
        cantidad: { nombre: 'Minas', niveles: [                          // máximo de minas en el camino a la vez
          { costo: 50,  maxMinas: 9 },
          { costo: 80,  maxMinas: 12 },
          { costo: 130, maxMinas: 16, radio: 36, nota: 'más radio' }
        ] }
      }
    },
    laser: {
      nombre: 'Torre láser', corto: 'Láser', costo: 220,
      desc: 'Haz continuo que daña a todo lo que está en su línea. Apunta solo hacia donde atraviesa más enemigos: rinde más en una esquina del camino. Tierra y aire.',
      arma: 'laser', tipoDano: 'energia', antiaerea: true,
      danoSeg: 24, alcance: 130, ancho: 9,                               // daño por segundo a cada enemigo dentro del haz; ancho en px
      // BERSERK: durante "seg" segundos el haz hace "multDano" veces el daño y es "multAncho" veces más ancho.
      berserk: { nombre: 'Haz total', cargaSeg: 14, seg: 3, multDano: 3, multAncho: 2 },
      atributos: {
        potencia: { nombre: 'Potencia', niveles: [
          { costo: 90,  danoSeg: 31 },
          { costo: 140, danoSeg: 40 },
          { costo: 210, danoSeg: 52, perforante: true, nota: 'perfora' }  // ignora la resistencia a la energía
        ] },
        alcance: { nombre: 'Alcance', niveles: [
          { costo: 60,  alcance: 150 },
          { costo: 90,  alcance: 170 },
          { costo: 130, alcance: 195 }
        ] },
        haz: { nombre: 'Haz', niveles: [
          { costo: 60,  ancho: 12 },
          { costo: 90,  ancho: 15 },
          { costo: 140, ancho: 19 }
        ] }
      }
    },
    rayo: {
      nombre: 'Torre de rayos', corto: 'Rayo', costo: 300,
      desc: 'Descarga que salta de enemigo en enemigo, con algo menos de fuerza en cada salto. Tierra y aire.',
      arma: 'rayo', tipoDano: 'energia', antiaerea: true,
      dano: 45, cadencia: 1.5, alcance: 110, saltos: 3, radioSalto: 60, caida: 0.85,   // caida: el daño se multiplica por esto en cada salto
      // BERSERK: descarga a todos los enemigos dentro de su alcance, con el daño multiplicado, y los aturde (jefes no).
      berserk: { nombre: 'Tormenta eléctrica', cargaSeg: 15, multDano: 2, aturde: 0.8 },
      atributos: {
        dano: { nombre: 'Daño', niveles: [
          { costo: 90,  dano: 60 },
          { costo: 140, dano: 80 },
          { costo: 210, dano: 105, aturde: 0.35, nota: 'electrocuta' }     // detiene 0,35 s a cada tocado (jefes no)
        ] },
        saltos: { nombre: 'Saltos', niveles: [
          { costo: 80,  saltos: 4 },
          { costo: 120, saltos: 5 },
          { costo: 180, saltos: 7, radioSalto: 75, nota: 'salto largo' }
        ] },
        cadencia: { nombre: 'Cadencia', niveles: [
          { costo: 80,  cadencia: 1.3 },
          { costo: 120, cadencia: 1.1 },
          { costo: 180, cadencia: 0.9 }
        ] }
      }
    },

    /* ── TORRES COMBO: solo se obtienen por fusión (ver "fusiones" más abajo). No tienen mejoras.
       El costo se calcula solo (factorPrecio × valor de las tres torres de su receta al máximo). ── */
    rotativo: {
      nombre: 'Cañón rotativo', corto: 'Rotativo', combo: true,
      desc: 'Fusión de tres ametralladoras. Ráfaga continua que reparte sus disparos entre los 3 enemigos más avanzados. Perfora. Tierra y aire.',
      arma: 'bala', tipoDano: 'fisico', antiaerea: true, perforante: true,
      dano: 70, cadencia: 0.1, alcance: 170, objetivos: 3,     // objetivos: a cuántos enemigos dispara a la vez
      atributos: {}
    },
    glacial: {
      nombre: 'Cañón glacial', corto: 'Glacial', combo: true,
      desc: 'Fusión de ametralladora, crío y plasma. Disparos de plasma helado que congelan la zona del impacto, y un aura de frío que frena a todo enemigo de tierra en su alcance. Solo tierra.',
      arma: 'plasma', tipoDano: 'energia', antiaerea: false, velProyectil: 300,
      dano: 500, cadencia: 1.2, alcance: 150, onda: 45, congelaImpacto: 1.2, lento: 0.4,   // lento: aura de frío en todo su alcance
      atributos: {}
    },
    domo: {
      nombre: 'Domo antiaéreo', corto: 'Domo', combo: true,
      desc: 'Fusión de ametralladora, misiles y rayo. Salvas de 4 misiles de largo alcance que hacen el doble de daño a enemigos aéreos y descargan un rayo al estallar. Tierra y aire.',
      arma: 'misil', tipoDano: 'explosivo', antiaerea: true, velProyectil: 240,
      dano: 140, radio: 50, cadencia: 1.2, alcance: 190, salva: 4, multAire: 2, saltosImpacto: 3,
      atributos: {}
    },
    reactor: {
      nombre: 'Reactor de fusión', corto: 'Reactor', combo: true,
      desc: 'Fusión de plasma, láser y rayo. Haz continuo muy potente que daña a todo en su línea y, cada 2 s, lanza un arco eléctrico que salta entre 6 enemigos. Tierra y aire.',
      arma: 'laser', tipoDano: 'energia', antiaerea: true, perforante: true,
      danoSeg: 380, alcance: 200, ancho: 16, arcoCada: 2, arcoSaltos: 6, arcoDano: 150,
      atributos: {}
    },
    nucleo: {
      nombre: 'Núcleo criogénico', corto: 'Núcleo', combo: true,
      desc: 'Fusión de tres torres crío. No hace daño: un aura enorme que frena casi por completo, congela todo lo que está dentro cada pocos segundos y deja a los enemigos frágiles (reciben más daño de todas las torres). Solo tierra.',
      alcance: 145, lento: 0.85, congela: 2.5, cadaSeg: 5, fragil: 0.5,
      atributos: {}
    },
    artilleria: {
      nombre: 'Artillería pesada', corto: 'Artillería', combo: true,
      desc: 'Fusión de tres torres de misiles. Salvas de 4 misiles pesados de largo alcance, repartidos entre los enemigos a tiro; el primero aturde al estallar. Tierra y aire.',
      arma: 'misil', tipoDano: 'explosivo', antiaerea: true, velProyectil: 220,
      dano: 160, radio: 70, cadencia: 2.5, alcance: 190, salva: 4, aturde: 0.5, aturdePrimero: true,   // v0.26: era salva 8, alcance 260, aturdían los 8 (0,8 s)
      atributos: {}
    },
    tesla: {
      nombre: 'Torre Tesla', corto: 'Tesla', combo: true,
      desc: 'Fusión de tres torres de rayos. Descargas que saltan entre 12 enemigos casi sin perder fuerza y los aturden. Tierra y aire.',
      arma: 'rayo', tipoDano: 'energia', antiaerea: true,
      dano: 220, cadencia: 0.8, alcance: 160, saltos: 12, radioSalto: 95, caida: 0.95, aturde: 0.5,
      atributos: {}
    },
    prismatico: {
      nombre: 'Láser prismático', corto: 'Prisma', combo: true,
      desc: 'Fusión de tres torres láser. Tres haces a la vez, cada uno hacia donde atraviesa más enemigos. Perfora. Tierra y aire.',
      arma: 'laser', tipoDano: 'energia', antiaerea: true, perforante: true,
      danoSeg: 280, alcance: 220, ancho: 14, haces: 3,
      atributos: {}
    },
    minero: {
      nombre: 'Fábrica de minas', corto: 'Fábrica', combo: true,
      desc: 'Fusión de tres minadoras. Siembra minas muy potentes a gran velocidad en un área amplia (hasta 30 a la vez). Aturden al estallar. Solo tierra.',
      arma: 'mina', tipoDano: 'explosivo', antiaerea: false,
      dano: 250, radio: 45, cadencia: 0.6, alcance: 140, maxMinas: 30, aturde: 0.6,
      atributos: {}
    },
    criobomba: {
      nombre: 'Bombardero criogénico', corto: 'Bomba', combo: true,
      desc: 'Fusión de minadora, crío y misiles. Salvas de 3 bombas que congelan 2 s todo lo que alcanzan y dejan 2 minas donde estallan. Tierra y aire.',
      arma: 'misil', tipoDano: 'explosivo', antiaerea: true, velProyectil: 200,
      dano: 150, radio: 80, cadencia: 2.0, alcance: 220, salva: 2, congelaImpacto: 1.2, minasImpacto: 2, danoMina: 120, radioMina: 40,
      atributos: {}
    }
  },

  /* COMBOS: dos torres pegadas (centros a colocacion.distCombo px o menos) forman un enlace con un combo.
     - Bono permanente, para la torre del tipo "para" (una sola vez aunque tenga varias vecinas iguales):
         bono: { stat, mult }   multiplica un valor de la torre (cadencia menor que 1 = dispara más rápido)
         danoALentos            multiplica su daño contra enemigos ralentizados o congelados
     - Ataque especial ("combo"): el círculo entre las dos torres se llena mientras alguna tiene enemigos a tiro.
       Al llenarse, el ataque sale solo. Ignora las resistencias del enemigo.
         tipo           'area'  la torre "desde" dispara una carga que estalla en un radio sobre su objetivo
                        'linea' las dos torres disparan un rayo que atraviesa a todos los enemigos en línea
                        'onda'  onda desde el punto medio de las dos torres (solo enemigos en tierra)
                        'cadena' la torre "desde" lanza una descarga que salta "saltos" veces entre enemigos cercanos
                        'minas' la torre "desde" (minadora) siembra "minas" minas extra con el daño del combo
         efecto         aspecto: 'hielo', 'plasma', 'fuego', 'rayo' o 'laser'
         cargaSeg       segundos que tarda en llenarse con una sola vecina. Una torre con varias vecinas
                        reparte su carga: con 2 enlaces cada uno tarda el doble.
         dano           daño base del ataque;  danoPorMejora  daño extra por cada mejora de las dos torres
         congela        segundos que congela (tierra, jefes no);  aturde  segundos que detiene (jefes no)
     Los "id" no se cambian. */
  sinergias: [
    { id: 'quebradizas', nombre: 'Metralla de hielo', entre: ['ametralladora', 'crio'], para: 'ametralladora',
      danoALentos: 1.4,
      combo: { tipo: 'area', desde: 'ametralladora', efecto: 'hielo', cargaSeg: 6, dano: 30, danoPorMejora: 3, radio: 45, congela: 0.8, texto: 'explosión que congela' } },
    { id: 'cruzado', nombre: 'Fuego cruzado', entre: ['ametralladora', 'ametralladora'], para: 'ametralladora',
      bono: { stat: 'cadencia', mult: 0.85 },
      combo: { tipo: 'linea', efecto: 'fuego', cargaSeg: 6, dano: 45, danoPorMejora: 7, largo: 170, ancho: 12, texto: 'ráfaga que atraviesa' } },
    { id: 'ventisca', nombre: 'Ventisca', entre: ['crio', 'crio'], para: null,
      combo: { tipo: 'onda', efecto: 'hielo', cargaSeg: 8, dano: 15, danoPorMejora: 3, radio: 105, congela: 1.8, texto: 'onda que congela' } },

    { id: 'termico', nombre: 'Choque térmico', entre: ['plasma', 'crio'], para: 'plasma',
      danoALentos: 1.5,
      combo: { tipo: 'area', desde: 'plasma', efecto: 'plasma', cargaSeg: 7, dano: 110, danoPorMejora: 6, radio: 30, congela: 0.6, texto: 'golpe fuerte que congela' } },
    { id: 'lanza', nombre: 'Lanza de plasma', entre: ['plasma', 'ametralladora'], para: 'plasma',
      bono: { stat: 'alcance', mult: 1.15 },
      combo: { tipo: 'linea', efecto: 'plasma', cargaSeg: 7, dano: 70, danoPorMejora: 6, largo: 200, ancho: 12, texto: 'rayo que atraviesa' } },
    { id: 'sobrecarga', nombre: 'Sobrecarga', entre: ['plasma', 'plasma'], para: 'plasma',
      bono: { stat: 'dano', mult: 1.1 },
      combo: { tipo: 'area', desde: 'plasma', efecto: 'plasma', cargaSeg: 8, dano: 150, danoPorMejora: 8, radio: 40, texto: 'descarga en área' } },
    { id: 'designador', nombre: 'Bombardeo guiado', entre: ['misiles', 'ametralladora'], para: 'misiles',
      bono: { stat: 'alcance', mult: 1.2 },
      combo: { tipo: 'area', desde: 'misiles', efecto: 'fuego', cargaSeg: 7, dano: 60, danoPorMejora: 5, radio: 55, aturde: 0.5, texto: 'explosión que aturde' } },
    { id: 'criomisil', nombre: 'Misil criogénico', entre: ['misiles', 'crio'], para: 'misiles',
      danoALentos: 1.3,
      combo: { tipo: 'area', desde: 'misiles', efecto: 'hielo', cargaSeg: 8, dano: 40, danoPorMejora: 4, radio: 60, congela: 1.5, texto: 'explosión grande que congela' } },
    { id: 'bombardeo', nombre: 'Lluvia de misiles', entre: ['misiles', 'misiles'], para: 'misiles',
      bono: { stat: 'radio', mult: 1.15 },
      combo: { tipo: 'area', desde: 'misiles', efecto: 'fuego', cargaSeg: 8, dano: 90, danoPorMejora: 7, radio: 70, texto: 'explosión muy amplia' } },
    { id: 'ojiva', nombre: 'Ojiva de plasma', entre: ['plasma', 'misiles'], para: 'misiles',
      bono: { stat: 'radio', mult: 1.25 },
      combo: { tipo: 'area', desde: 'misiles', efecto: 'plasma', cargaSeg: 8, dano: 130, danoPorMejora: 8, radio: 50, texto: 'explosión de plasma' } },

    // ── Combos de las torres nuevas (minas, láser, rayo) ──
    { id: 'emboscada', nombre: 'Emboscada', entre: ['minas', 'ametralladora'], para: 'minas',
      bono: { stat: 'cadencia', mult: 0.85 },
      combo: { tipo: 'minas', desde: 'minas', efecto: 'fuego', cargaSeg: 7, dano: 50, danoPorMejora: 4, minas: 3, texto: 'siembra 3 minas extra' } },
    { id: 'minahielo', nombre: 'Minas de hielo', entre: ['minas', 'crio'], para: 'minas',
      danoALentos: 1.4,
      combo: { tipo: 'area', desde: 'minas', efecto: 'hielo', cargaSeg: 7, dano: 35, danoPorMejora: 3, radio: 50, congela: 1.2, texto: 'explosión helada en el camino' } },
    { id: 'minaplasma', nombre: 'Mina de plasma', entre: ['minas', 'plasma'], para: 'minas',
      bono: { stat: 'dano', mult: 1.15 },
      combo: { tipo: 'area', desde: 'plasma', efecto: 'plasma', cargaSeg: 7, dano: 120, danoPorMejora: 6, radio: 35, texto: 'descarga de plasma' } },
    { id: 'detonacion', nombre: 'Detonación en cadena', entre: ['minas', 'misiles'], para: 'minas',
      bono: { stat: 'radio', mult: 1.2 },
      combo: { tipo: 'area', desde: 'misiles', efecto: 'fuego', cargaSeg: 8, dano: 80, danoPorMejora: 6, radio: 65, aturde: 0.5, texto: 'explosión grande que aturde' } },
    { id: 'campominado', nombre: 'Campo minado', entre: ['minas', 'minas'], para: 'minas',
      bono: { stat: 'maxMinas', mult: 1.34 },
      combo: { tipo: 'minas', desde: 'minas', efecto: 'fuego', cargaSeg: 8, dano: 70, danoPorMejora: 5, minas: 5, texto: 'siembra 5 minas extra' } },
    { id: 'detonador', nombre: 'Haz detonador', entre: ['minas', 'laser'], para: 'minas',
      bono: { stat: 'dano', mult: 1.1 },
      combo: { tipo: 'linea', efecto: 'laser', cargaSeg: 7, dano: 60, danoPorMejora: 6, largo: 200, ancho: 12, texto: 'haz que atraviesa' } },
    { id: 'minaelectrica', nombre: 'Minas eléctricas', entre: ['minas', 'rayo'], para: 'rayo',
      bono: { stat: 'cadencia', mult: 0.9 },
      combo: { tipo: 'cadena', desde: 'rayo', efecto: 'rayo', cargaSeg: 8, dano: 50, danoPorMejora: 4, saltos: 6, aturde: 0.4, texto: 'descarga que salta y aturde' } },

    { id: 'miralaser', nombre: 'Mira láser', entre: ['laser', 'ametralladora'], para: 'ametralladora',
      bono: { stat: 'alcance', mult: 1.15 },
      combo: { tipo: 'linea', efecto: 'laser', cargaSeg: 7, dano: 55, danoPorMejora: 6, largo: 220, ancho: 12, texto: 'haz que atraviesa' } },
    { id: 'hazcrio', nombre: 'Haz criogénico', entre: ['laser', 'crio'], para: 'laser',
      danoALentos: 1.4,
      combo: { tipo: 'linea', efecto: 'hielo', cargaSeg: 8, dano: 40, danoPorMejora: 4, largo: 200, ancho: 12, congela: 1.0, texto: 'haz que congela en línea' } },
    { id: 'laserplasma', nombre: 'Láser de plasma', entre: ['laser', 'plasma'], para: 'laser',
      bono: { stat: 'danoSeg', mult: 1.15 },
      combo: { tipo: 'linea', efecto: 'plasma', cargaSeg: 8, dano: 90, danoPorMejora: 7, largo: 220, ancho: 13, texto: 'rayo de plasma que atraviesa' } },
    { id: 'guialaser', nombre: 'Guía láser', entre: ['laser', 'misiles'], para: 'misiles',
      bono: { stat: 'cadencia', mult: 0.85 },
      combo: { tipo: 'area', desde: 'misiles', efecto: 'fuego', cargaSeg: 8, dano: 90, danoPorMejora: 7, radio: 50, texto: 'misil guiado' } },
    { id: 'prisma', nombre: 'Prisma', entre: ['laser', 'laser'], para: 'laser',
      bono: { stat: 'ancho', mult: 1.3 },
      combo: { tipo: 'linea', efecto: 'laser', cargaSeg: 8, dano: 80, danoPorMejora: 7, largo: 260, ancho: 16, texto: 'haz doble muy largo' } },
    { id: 'ionizado', nombre: 'Haz ionizado', entre: ['laser', 'rayo'], para: 'rayo',
      bono: { stat: 'alcance', mult: 1.15 },
      combo: { tipo: 'cadena', desde: 'rayo', efecto: 'rayo', cargaSeg: 8, dano: 60, danoPorMejora: 5, saltos: 8, texto: 'descarga de 8 saltos' } },

    { id: 'conductoras', nombre: 'Balas conductoras', entre: ['rayo', 'ametralladora'], para: 'ametralladora',
      bono: { stat: 'dano', mult: 1.15 },
      combo: { tipo: 'cadena', desde: 'rayo', efecto: 'rayo', cargaSeg: 7, dano: 45, danoPorMejora: 4, saltos: 5, texto: 'descarga que salta' } },
    { id: 'superconductor', nombre: 'Superconductor', entre: ['rayo', 'crio'], para: 'rayo',
      danoALentos: 1.5,
      combo: { tipo: 'cadena', desde: 'rayo', efecto: 'hielo', cargaSeg: 8, dano: 40, danoPorMejora: 4, saltos: 5, congela: 0.8, texto: 'descarga que congela' } },
    { id: 'arcoplasma', nombre: 'Arco de plasma', entre: ['rayo', 'plasma'], para: 'rayo',
      bono: { stat: 'dano', mult: 1.15 },
      combo: { tipo: 'area', desde: 'plasma', efecto: 'rayo', cargaSeg: 8, dano: 130, danoPorMejora: 7, radio: 40, aturde: 0.4, texto: 'golpe eléctrico en área' } },
    { id: 'emp', nombre: 'Pulso EMP', entre: ['rayo', 'misiles'], para: 'misiles',
      bono: { stat: 'radio', mult: 1.15 },
      combo: { tipo: 'area', desde: 'misiles', efecto: 'rayo', cargaSeg: 8, dano: 60, danoPorMejora: 5, radio: 70, aturde: 0.8, texto: 'explosión que aturde, también a drones' } },
    { id: 'tormenta', nombre: 'Tormenta', entre: ['rayo', 'rayo'], para: 'rayo',
      bono: { stat: 'cadencia', mult: 0.85 },
      combo: { tipo: 'cadena', desde: 'rayo', efecto: 'rayo', cargaSeg: 9, dano: 80, danoPorMejora: 6, saltos: 10, radioSalto: 80, texto: 'descarga de 10 saltos' } }
  ],

  /* TORRES COMBO (fusión): tres torres pegadas en triángulo (las tres a distCombo px o menos unas de otras),
     con TODAS sus mejoras compradas, se pueden fusionar en una torre combo.
     - La fusión consume las tres torres (no devuelve nada) y además cuesta "factorPrecio" veces lo que valen
       las tres al máximo (precio de cada torre + todas sus mejoras). El precio se calcula solo.
     - La primera fusión desbloquea esa torre combo para siempre: en las partidas siguientes se puede
       construir directo desde la fila ★ de la barra de torres, al mismo precio.
     - "torre" es el tipo de la torre combo (está en "torres", con combo: true). */
  // factorPrecio: la torre de fusión cuesta 1,5 veces lo invertido en las tres torres al máximo.
  // niveles (v0.26): las torres de fusión se pueden subir 3 niveles, caros. Cada nivel cuesta factorCosto × el precio
  // de la torre y multiplica su daño (dano, danoSeg, arcoDano, danoMina) por "mult" respecto del valor base.
  // Balance v0.26 (medido con una torre sola contra las oleadas 36–40): Artillería salva 8→4, alcance 260→190, aturde
  // solo el primer misil 0,5 s; Bombardero criogénico salva 3→2, daño 180→150, mina 150→120, congela 2→1,2 s;
  // Cañón rotativo daño 30→70, alcance 150→170; Láser prismático 160→280/s; Reactor 220→380/s.
  fusion: { factorPrecio: 1.5, niveles: { factorCosto: [0.4, 0.6, 0.9], mult: [1.2, 1.4, 1.65] } },
  fusiones: [
    { id: 'rotativo', entre: ['ametralladora', 'ametralladora', 'ametralladora'], torre: 'rotativo' },
    { id: 'glacial',  entre: ['ametralladora', 'crio', 'plasma'],                 torre: 'glacial' },
    { id: 'domo',     entre: ['ametralladora', 'misiles', 'rayo'],                torre: 'domo' },
    { id: 'reactor',  entre: ['plasma', 'laser', 'rayo'],                         torre: 'reactor' },
    { id: 'nucleo',     entre: ['crio', 'crio', 'crio'],             torre: 'nucleo' },
    { id: 'artilleria', entre: ['misiles', 'misiles', 'misiles'],    torre: 'artilleria' },
    { id: 'tesla',      entre: ['rayo', 'rayo', 'rayo'],             torre: 'tesla' },
    { id: 'prismatico', entre: ['laser', 'laser', 'laser'],          torre: 'prismatico' },
    { id: 'minero',     entre: ['minas', 'minas', 'minas'],          torre: 'minero' },
    { id: 'criobomba',  entre: ['minas', 'crio', 'misiles'],         torre: 'criobomba' }
  ],

  // MOVER UNA TORRE: cuesta este porcentaje de lo invertido en ella (precio + mejoras; 0.3 = 30%)
  mover: { factor: 0.3 },

  /* ENEMIGOS
     vidas     vidas que quita si llega a la base (1 si no se indica)
     resFrio   cuánto le afecta el frío: 1 = normal, 0.5 = la mitad
     noCongela true = no se puede congelar (ni con torres ni con combos)
     jefe      true = se dibuja como tanque pesado y muestra su barra de vida arriba del campo */
  enemigos: {
    soldado:  { nombre: 'Androide',  vida: 45,  vel: 45, premio: 7, aereo: false,
                resist: { fisico: 1,   energia: 1,   explosivo: 1 } },
    blindado: { nombre: 'Tanque autónomo', vida: 200, vel: 28, premio: 18, aereo: false,
                resist: { fisico: 0.5, energia: 1.5, explosivo: 1 } },
    corredor: { nombre: 'Rastreador', vida: 35,  vel: 90, premio: 8, aereo: false,
                resist: { fisico: 1,   energia: 1,   explosivo: 0.5 } },
    // Aéreo: vuela sobre el mismo camino que las tropas de tierra.
    // (con rutaRecta: true volaría en línea recta de la entrada a la base)
    // Solo le disparan las torres antiaéreas y el frío no le afecta.
    dron:     { nombre: 'Dron',     vida: 70,  vel: 60, premio: 12, aereo: true,
                resist: { fisico: 1,   energia: 1,   explosivo: 1.5 } },
    // ── Atacantes especiales: cada escenario (salvo Puesto Duna) tiene el suyo; en el Núcleo aparecen todos ──
    // Infiltrador: cada "cada" segundos se vuelve invisible por "dura" segundos. Invisible, ninguna torre lo
    // apunta, pero lo dañan las minas, las explosiones, las ondas, el haz del láser y los combos de área.
    infiltrador: { nombre: 'Infiltrador', vida: 70, vel: 58, premio: 14, aereo: false, especial: true,
                   camuflaje: { cada: 3.5, dura: 2.2 },
                   aviso: 'Se vuelve invisible a ratos: las torres no lo apuntan, pero minas, explosiones y láser sí lo alcanzan',
                   resist: { fisico: 1, energia: 1, explosivo: 1 } },
    // Calefactor: no se congela ni se frena, y cada "cada" segundos lanza una onda de calor que descongela a los
    // enemigos a menos de "radio" px y los deja "inmune" segundos sin que el frío los afecte.
    calefactor:  { nombre: 'Calefactor', vida: 190, vel: 32, premio: 24, aereo: false, especial: true,
                   noCongela: true, resFrio: 0, calor: { cada: 4.5, radio: 75, inmune: 2.5 },
                   aviso: 'No se congela y su onda de calor descongela a los enemigos cercanos: mátalo primero',
                   resist: { fisico: 1, energia: 0.75, explosivo: 1 } },
    // Nodriza: transporte lento y blindado; al ser destruido suelta "crias" enemigos del tipo indicado (con "vidaCria" de su vida).
    nodriza:     { nombre: 'Nodriza', vida: 460, vel: 21, premio: 30, aereo: false, especial: true,
                   cria: { tipo: 'corredor', n: 5, vidaCria: 0.6 },
                   aviso: 'Al destruirla suelta 5 rastreadores: mátala lejos de la base',
                   resist: { fisico: 0.75, energia: 1, explosivo: 1 } },
    // Saboteador EMP: cada "cada" segundos apaga por "dura" segundos las torres a menos de "radio" px
    // (no disparan ni cargan combos ni berserk).
    saboteador:  { nombre: 'Saboteador EMP', vida: 240, vel: 29, premio: 32, aereo: false, especial: true,
                   emp: { cada: 4, radio: 80, dura: 3 },
                   aviso: 'Su pulso EMP apaga las torres cercanas por unos segundos: destrúyelo en la primera vuelta',
                   resist: { fisico: 1, energia: 0.6, explosivo: 1 } },
    jefe:      { nombre: 'Coloso',       vida: 1000, vel: 24, premio: 100, aereo: false, jefe: true,
                 vidas: 5, resFrio: 0.5, noCongela: true,
                 resist: { fisico: 0.75, energia: 0.75, explosivo: 0.75 } },
    jefeFinal: { nombre: 'Titán de TERMINUS', vida: 2200, vel: 24, premio: 200, aereo: false, jefe: true,
                 vidas: 10, resFrio: 0.5, noCongela: true,
                 resist: { fisico: 0.75, energia: 0.75, explosivo: 0.75 } }
  },

  /* MAPAS
     camino: esquinas del recorrido en [columna, fila]; -1 y 11 quedan fuera del campo (entrada y base).
     oleadas: cada oleada es una lista de grupos { tipo, n, cada (s entre enemigos), desde (s de inicio, opcional) }.
     Si no se indica "desde", el grupo parte 1 s después de terminar el anterior.
     Aquí van escritas las oleadas 1 a 30; de la 31 en adelante se generan (bloque "generador").
     La vida de todos los enemigos, jefe incluido, crece con el número de oleada (oleada.escalaVida);
     un mapa puede traer su propio "escalaVida".
     vidaExtra: porcentaje fijo de vida extra para todos los enemigos del escenario (0.10 = +10%).
     tema: aspecto del terreno (desierto o nieve). requiere: escenario que hay que completar antes. */
  mapas: {
    desierto: {
      nombre: 'Puesto Duna', dificultad: 'Fácil', tema: 'desierto',
      lore: { intro: 'Puesto Duna, en el desierto. Aquí empezó a descifrarse el código de TERMINUS.', victoria: 'El fragmento del desierto está descifrado.' },
      totalOleadas: 50,                           // la campaña termina en esta oleada, con el jefe final
      enemigosGenerados: ['soldado', 'blindado'],  // tipos que usan las oleadas generadas
      camino: [[-1, 1], [11, 1], [11, 7], [1, 7], [1, 13], [13, 13]],
      oleadas: [
        /*  1 */ [{ tipo: 'soldado', n: 6,  cada: 1.2 }],
        /*  2 */ [{ tipo: 'soldado', n: 10, cada: 1.0 }],
        /*  3 */ [{ tipo: 'soldado', n: 8,  cada: 1.0 }, { tipo: 'blindado', n: 1, cada: 1 }],
        /*  4 */ [{ tipo: 'soldado', n: 14, cada: 0.7 }],
        /*  5 */ [{ tipo: 'blindado', n: 3, cada: 2.5 }, { tipo: 'soldado', n: 8, cada: 0.8 }],
        /*  6 */ [{ tipo: 'soldado', n: 14, cada: 0.7 }, { tipo: 'blindado', n: 2, cada: 2.0 }],
        /*  7 */ [{ tipo: 'blindado', n: 6, cada: 2.0 }],
        /*  8 */ [{ tipo: 'soldado', n: 18, cada: 0.55 }, { tipo: 'blindado', n: 3, cada: 2.0 }],
        /*  9 */ [{ tipo: 'blindado', n: 6, cada: 1.8, desde: 0 }, { tipo: 'soldado', n: 12, cada: 0.8, desde: 2 }],
        /* 10 JEFE */ [{ tipo: 'soldado', n: 10, cada: 0.8, desde: 0 }, { tipo: 'jefe', n: 1, cada: 1, desde: 4 }, { tipo: 'blindado', n: 4, cada: 2.0, desde: 9 }],
        /* 11 */ [{ tipo: 'soldado', n: 20, cada: 0.5 }],
        /* 12 */ [{ tipo: 'blindado', n: 8, cada: 1.6 }],
        /* 13 */ [{ tipo: 'soldado', n: 16, cada: 0.6, desde: 0 }, { tipo: 'blindado', n: 5, cada: 2.0, desde: 1 }],
        /* 14 */ [{ tipo: 'soldado', n: 24, cada: 0.4 }],
        /* 15 */ [{ tipo: 'blindado', n: 10, cada: 1.4, desde: 0 }, { tipo: 'soldado', n: 10, cada: 0.7, desde: 3 }],
        /* 16 */ [{ tipo: 'soldado', n: 20, cada: 0.45, desde: 0 }, { tipo: 'blindado', n: 6, cada: 1.8, desde: 2 }],
        /* 17 */ [{ tipo: 'blindado', n: 12, cada: 1.2 }],
        /* 18 */ [{ tipo: 'soldado', n: 26, cada: 0.4, desde: 0 }, { tipo: 'blindado', n: 6, cada: 1.6, desde: 5 }],
        /* 19 */ [{ tipo: 'blindado', n: 12, cada: 1.3, desde: 0 }, { tipo: 'soldado', n: 20, cada: 0.5, desde: 2 }],
        /* 20 JEFE */ [{ tipo: 'soldado', n: 16, cada: 0.5, desde: 0 }, { tipo: 'blindado', n: 8, cada: 1.5, desde: 3 }, { tipo: 'jefe', n: 1, cada: 1, desde: 6 }],
        /* 21 */ [{ tipo: 'soldado', n: 28, cada: 0.4 }],
        /* 22 */ [{ tipo: 'blindado', n: 12, cada: 1.2, desde: 0 }, { tipo: 'soldado', n: 12, cada: 0.6, desde: 3 }],
        /* 23 */ [{ tipo: 'soldado', n: 30, cada: 0.35, desde: 0 }, { tipo: 'blindado', n: 6, cada: 1.6, desde: 2 }],
        /* 24 */ [{ tipo: 'blindado', n: 16, cada: 1.1 }],
        /* 25 */ [{ tipo: 'soldado', n: 24, cada: 0.4, desde: 0 }, { tipo: 'blindado', n: 10, cada: 1.3, desde: 4 }],
        /* 26 */ [{ tipo: 'soldado', n: 36, cada: 0.3 }],
        /* 27 */ [{ tipo: 'blindado', n: 18, cada: 1.0, desde: 0 }, { tipo: 'soldado', n: 16, cada: 0.5, desde: 5 }],
        /* 28 */ [{ tipo: 'soldado', n: 30, cada: 0.35, desde: 0 }, { tipo: 'blindado', n: 12, cada: 1.2, desde: 3 }],
        /* 29 */ [{ tipo: 'blindado', n: 20, cada: 0.9, desde: 0 }, { tipo: 'soldado', n: 24, cada: 0.4, desde: 2 }],
        /* 30 JEFE */ [{ tipo: 'soldado', n: 20, cada: 0.45, desde: 0 }, { tipo: 'blindado', n: 12, cada: 1.3, desde: 3 }, { tipo: 'jefe', n: 1, cada: 1, desde: 8 }, { tipo: 'blindado', n: 10, cada: 1.2, desde: 14 }]
      ]
    },

    ciudad: {
      nombre: 'Distrito Cero', dificultad: 'Medio', rasgo: 'cruce', tema: 'ciudad',
      lore: { intro: 'Distrito Cero, la ciudad donde despertó TERMINUS. Sus calles se cruzan: las máquinas pasarán dos veces por el mismo punto.', victoria: 'Distrito Cero resiste. Bajo sus ruinas estaba el fragmento de la ciudad.' },
      totalOleadas: 50,
      vidaExtra: 0.10,                            // +10% de vida a todos los enemigos desde la oleada 1 (v0.22)
      refuerzo: { desde: 15, hasta: 50, extraEn: 0.50 },   // vida extra que crece en curva: 0 en la oleada 15 → +50% en la 50 (más que el Glaciar: el cruce rinde el doble)
      ritmo: { esperaSeg: 6, bonoAdelantoPorSeg: 1.5, bonoPorEnJuego: 15, bonoPorOleada: 3 },   // pisa los valores de "oleada" (bonoPorOleada rige desde la oleada 10)
      premioMult: 0.90,                            // premio por enemigo: baja de a poco hasta 90% entre las oleadas 10 y 40
      jefes: { subjefe: 0.6, colosos: [1, 2] },     // Coloso menor (60% de vida) en la 5, 15, 25…; 1 Coloso en la 10 y desde la 20 Colosos al azar
      elites: 0.01,                               // probabilidad de que un enemigo normal salga élite (desde la oleada elite.desde)
      escalaVida: 0.45,                           // el cruce deja atacar dos tramos a la vez: la vida sube bastante más que en el desierto (0.30 → 0.38 → 0.45 en v0.24.3)
      escalaJefeFinal: 0.30,                      // el Titán sigue creciendo como antes (v0.24.1)
      oleadasParejas: true,                       // desde la 31, las oleadas livianas traen además blindados
      // vetoCruce: 62,                           // (quitado en v0.24.3: a Mauricio no le gustó) radio en px de escombros sin construir alrededor del cruce
      enemigosGenerados: ['soldado', 'blindado', 'corredor', 'dron'],
      // CAMINO QUE SE CRUZA: entra por la izquierda en la fila 6, sube, vuelve por la fila 2 y baja por la
      // columna 4 cruzando su propio tramo en (4, 6). Oleadas: las del desierto con 10% más enemigos,
      // corredores desde la oleada 3 y drones desde la 15.
      camino: [[-1, 6], [9, 6], [9, 2], [4, 2], [4, 11], [11, 11], [11, 14], [13, 14]],
      // Atacantes especiales: desde la oleada "desde", cada "cada" oleadas; salen "n" (+1 cada "mas" oleadas)
      especiales: [{ tipo: 'infiltrador', desde: 8, cada: 3, n: 2, mas: 10 }],
      oleadas: [
        /*  1 */ [{ tipo: 'soldado', n: 7,  cada: 1.2 }],
        /*  2 */ [{ tipo: 'soldado', n: 11, cada: 1.0 }],
        /*  3 */ [{ tipo: 'soldado', n: 9,  cada: 1.0 }, { tipo: 'blindado', n: 1, cada: 1 }, { tipo: 'corredor', n: 4, cada: 0.6, desde: 3 }],
        /*  4 */ [{ tipo: 'soldado', n: 15, cada: 0.7 }],
        /*  5 */ [{ tipo: 'blindado', n: 3, cada: 2.5 }, { tipo: 'soldado', n: 9, cada: 0.8 }],
        /*  6 */ [{ tipo: 'soldado', n: 15, cada: 0.7 }, { tipo: 'blindado', n: 2, cada: 2.0 }, { tipo: 'corredor', n: 6, cada: 0.5, desde: 3 }],
        /*  7 */ [{ tipo: 'blindado', n: 7, cada: 2.0 }],
        /*  8 */ [{ tipo: 'soldado', n: 20, cada: 0.55 }, { tipo: 'blindado', n: 3, cada: 2.0 }, { tipo: 'corredor', n: 6, cada: 0.5, desde: 3 }],
        /*  9 */ [{ tipo: 'blindado', n: 7, cada: 1.8, desde: 0 }, { tipo: 'soldado', n: 13, cada: 0.8, desde: 2 }],
        /* 10 JEFE */ [{ tipo: 'soldado', n: 11, cada: 0.8, desde: 0 }, { tipo: 'jefe', n: 1, cada: 1, desde: 4 }, { tipo: 'blindado', n: 4, cada: 2.0, desde: 9 }],
        /* 11 */ [{ tipo: 'soldado', n: 22, cada: 0.5 }, { tipo: 'corredor', n: 8, cada: 0.45, desde: 5 }],
        /* 12 */ [{ tipo: 'blindado', n: 9, cada: 1.6 }],
        /* 13 */ [{ tipo: 'soldado', n: 18, cada: 0.6, desde: 0 }, { tipo: 'blindado', n: 6, cada: 2.0, desde: 1 }, { tipo: 'corredor', n: 8, cada: 0.45, desde: 5 }],
        /* 14 */ [{ tipo: 'soldado', n: 26, cada: 0.4 }],
        /* 15 */ [{ tipo: 'blindado', n: 11, cada: 1.4, desde: 0 }, { tipo: 'soldado', n: 11, cada: 0.7, desde: 3 }, { tipo: 'dron', n: 4, cada: 1.0, desde: 6 }],
        /* 16 */ [{ tipo: 'soldado', n: 22, cada: 0.45, desde: 0 }, { tipo: 'blindado', n: 7, cada: 1.8, desde: 2 }, { tipo: 'corredor', n: 10, cada: 0.4, desde: 5 }],
        /* 17 */ [{ tipo: 'blindado', n: 13, cada: 1.2 }],
        /* 18 */ [{ tipo: 'soldado', n: 29, cada: 0.4, desde: 0 }, { tipo: 'blindado', n: 7, cada: 1.6, desde: 5 }],
        /* 19 */ [{ tipo: 'blindado', n: 13, cada: 1.3, desde: 0 }, { tipo: 'soldado', n: 22, cada: 0.5, desde: 2 }, { tipo: 'corredor', n: 12, cada: 0.4, desde: 5 }],
        /* 20 JEFE */ [{ tipo: 'soldado', n: 18, cada: 0.5, desde: 0 }, { tipo: 'blindado', n: 9, cada: 1.5, desde: 3 }, { tipo: 'jefe', n: 1, cada: 1, desde: 6 }, { tipo: 'dron', n: 5, cada: 0.9, desde: 6 }],
        /* 21 */ [{ tipo: 'soldado', n: 31, cada: 0.4 }],
        /* 22 */ [{ tipo: 'blindado', n: 13, cada: 1.2, desde: 0 }, { tipo: 'soldado', n: 13, cada: 0.6, desde: 3 }, { tipo: 'corredor', n: 12, cada: 0.4, desde: 5 }],
        /* 23 */ [{ tipo: 'soldado', n: 33, cada: 0.35, desde: 0 }, { tipo: 'blindado', n: 7, cada: 1.6, desde: 2 }],
        /* 24 */ [{ tipo: 'blindado', n: 18, cada: 1.1 }, { tipo: 'dron', n: 6, cada: 0.8, desde: 6 }],
        /* 25 */ [{ tipo: 'soldado', n: 26, cada: 0.4, desde: 0 }, { tipo: 'blindado', n: 11, cada: 1.3, desde: 4 }, { tipo: 'corredor', n: 14, cada: 0.35, desde: 5 }],
        /* 26 */ [{ tipo: 'soldado', n: 40, cada: 0.3 }],
        /* 27 */ [{ tipo: 'blindado', n: 20, cada: 1.0, desde: 0 }, { tipo: 'soldado', n: 18, cada: 0.5, desde: 5 }, { tipo: 'dron', n: 8, cada: 0.7, desde: 6 }],
        /* 28 */ [{ tipo: 'soldado', n: 33, cada: 0.35, desde: 0 }, { tipo: 'blindado', n: 13, cada: 1.2, desde: 3 }, { tipo: 'corredor', n: 16, cada: 0.35, desde: 5 }],
        /* 29 */ [{ tipo: 'blindado', n: 22, cada: 0.9, desde: 0 }, { tipo: 'soldado', n: 26, cada: 0.4, desde: 2 }, { tipo: 'dron', n: 8, cada: 0.7, desde: 6 }],
        /* 30 JEFE */ [{ tipo: 'soldado', n: 22, cada: 0.45, desde: 0 }, { tipo: 'blindado', n: 13, cada: 1.3, desde: 3 }, { tipo: 'jefe', n: 1, cada: 1, desde: 8 }, { tipo: 'blindado', n: 11, cada: 1.2, desde: 14 }, { tipo: 'corredor', n: 10, cada: 0.4, desde: 5 }]
      ]
    },

    artico: {
      nombre: 'Estación Glaciar', dificultad: 'Medio', tema: 'nieve', requiere: 'desierto',
      lore: { intro: 'Estación Glaciar, bajo el hielo. Aquí se estudia otro fragmento del código.', victoria: 'El fragmento del hielo está descifrado. TERMINUS empieza a mostrar debilidades.' },
      totalOleadas: 50,
      vidaExtra: 0.10,                            // +10% de vida a todos los enemigos desde la oleada 1 (v0.22)
      refuerzo: { desde: 15, hasta: 50, extraEn: 0.30 },   // vida extra que crece en curva: 0 en la oleada 15 → +30% en la 50
      ritmo: { esperaSeg: 6, bonoAdelantoPorSeg: 1.5, bonoPorEnJuego: 15, bonoPorOleada: 3 },   // pisa los valores de "oleada" (bonoPorOleada rige desde la oleada 10)
      premioMult: 0.90,                            // premio por enemigo: baja de a poco hasta 90% entre las oleadas 10 y 40
      jefes: { subjefe: 0.6, colosos: [1, 2] },     // Coloso menor (60% de vida) en la 5, 15, 25…; 1 Coloso en la 10 y desde la 20 Colosos al azar
      elites: 0.01,                               // probabilidad de que un enemigo normal salga élite (desde la oleada elite.desde)
      escalaVida: 0.42,                           // la vida sube 42% por oleada (0.35 → 0.42 en v0.25; en el desierto, 27%)
      escalaJefeFinal: 0.35,                      // el Titán sigue creciendo como antes
      oleadasParejas: true,                       // desde la 31, las oleadas livianas traen además blindados
      enemigosGenerados: ['soldado', 'blindado', 'corredor', 'dron'],
      camino: [[-1, 1], [5, 1], [5, 5], [10, 5], [10, 10], [2, 10], [2, 13], [13, 13]],
      especiales: [{ tipo: 'calefactor', desde: 8, cada: 3, n: 1, mas: 10 }],
      oleadas: [
        /*  1 */ [{ tipo: 'soldado', n: 8,  cada: 1.0 }],
        /*  2 */ [{ tipo: 'soldado', n: 10, cada: 0.9 }],
        /*  3 */ [{ tipo: 'soldado', n: 8,  cada: 0.9, desde: 0 }, { tipo: 'corredor', n: 4, cada: 0.6, desde: 5 }],
        /*  4 */ [{ tipo: 'corredor', n: 6, cada: 0.5, desde: 0 }, { tipo: 'dron', n: 3, cada: 1.5, desde: 4 }],
        /*  5 */ [{ tipo: 'blindado', n: 3, cada: 2.5, desde: 0 }, { tipo: 'soldado', n: 8, cada: 0.8, desde: 2 }],
        /*  6 */ [{ tipo: 'corredor', n: 10, cada: 0.45, desde: 0 }, { tipo: 'dron', n: 4, cada: 1.2, desde: 3 }],
        /*  7 */ [{ tipo: 'blindado', n: 5, cada: 2.0, desde: 0 }, { tipo: 'dron', n: 6, cada: 1.0, desde: 4 }],
        /*  8 */ [{ tipo: 'soldado', n: 16, cada: 0.55, desde: 0 }, { tipo: 'corredor', n: 8, cada: 0.5, desde: 4 }],
        /*  9 */ [{ tipo: 'blindado', n: 6, cada: 1.8, desde: 0 }, { tipo: 'dron', n: 8, cada: 0.9, desde: 3 }],
        /* 10 JEFE */ [{ tipo: 'soldado', n: 10, cada: 0.8, desde: 0 }, { tipo: 'jefe', n: 1, cada: 1, desde: 4 }, { tipo: 'corredor', n: 6, cada: 0.5, desde: 8 }, { tipo: 'dron', n: 4, cada: 1.0, desde: 10 }],
        /* 11 */ [{ tipo: 'soldado', n: 20, cada: 0.5, desde: 0 }, { tipo: 'dron', n: 8, cada: 0.8, desde: 3 }],
        /* 12 */ [{ tipo: 'blindado', n: 8, cada: 1.6, desde: 0 }, { tipo: 'corredor', n: 10, cada: 0.45, desde: 5 }],
        /* 13 */ [{ tipo: 'corredor', n: 14, cada: 0.4, desde: 0 }, { tipo: 'dron', n: 10, cada: 0.7, desde: 2 }],
        /* 14 */ [{ tipo: 'soldado', n: 24, cada: 0.4, desde: 0 }, { tipo: 'blindado', n: 4, cada: 2.0, desde: 3 }],
        /* 15 */ [{ tipo: 'blindado', n: 10, cada: 1.4, desde: 0 }, { tipo: 'dron', n: 12, cada: 0.7, desde: 4 }],
        /* 16 */ [{ tipo: 'soldado', n: 20, cada: 0.45, desde: 0 }, { tipo: 'corredor', n: 12, cada: 0.4, desde: 3 }, { tipo: 'dron', n: 6, cada: 1.0, desde: 6 }],
        /* 17 */ [{ tipo: 'blindado', n: 12, cada: 1.2, desde: 0 }, { tipo: 'corredor', n: 8, cada: 0.5, desde: 6 }],
        /* 18 */ [{ tipo: 'soldado', n: 26, cada: 0.4, desde: 0 }, { tipo: 'dron', n: 14, cada: 0.6, desde: 4 }],
        /* 19 */ [{ tipo: 'blindado', n: 12, cada: 1.3, desde: 0 }, { tipo: 'corredor', n: 16, cada: 0.4, desde: 2 }, { tipo: 'dron', n: 10, cada: 0.7, desde: 6 }],
        /* 20 JEFE */ [{ tipo: 'soldado', n: 16, cada: 0.5, desde: 0 }, { tipo: 'blindado', n: 8, cada: 1.5, desde: 3 }, { tipo: 'jefe', n: 1, cada: 1, desde: 6 }, { tipo: 'corredor', n: 10, cada: 0.4, desde: 9 }, { tipo: 'dron', n: 10, cada: 0.6, desde: 10 }],
        /* 21 */ [{ tipo: 'soldado', n: 28, cada: 0.4, desde: 0 }, { tipo: 'dron', n: 12, cada: 0.6, desde: 3 }],
        /* 22 */ [{ tipo: 'blindado', n: 12, cada: 1.2, desde: 0 }, { tipo: 'corredor', n: 16, cada: 0.4, desde: 4 }],
        /* 23 */ [{ tipo: 'corredor', n: 20, cada: 0.35, desde: 0 }, { tipo: 'dron', n: 14, cada: 0.6, desde: 2 }],
        /* 24 */ [{ tipo: 'blindado', n: 16, cada: 1.1, desde: 0 }, { tipo: 'dron', n: 10, cada: 0.8, desde: 5 }],
        /* 25 */ [{ tipo: 'soldado', n: 30, cada: 0.35, desde: 0 }, { tipo: 'corredor', n: 14, cada: 0.4, desde: 3 }, { tipo: 'dron', n: 10, cada: 0.8, desde: 6 }],
        /* 26 */ [{ tipo: 'dron', n: 18, cada: 0.5, desde: 0 }, { tipo: 'blindado', n: 12, cada: 1.2, desde: 2 }],
        /* 27 */ [{ tipo: 'blindado', n: 18, cada: 1.0, desde: 0 }, { tipo: 'corredor', n: 20, cada: 0.35, desde: 5 }],
        /* 28 */ [{ tipo: 'soldado', n: 32, cada: 0.35, desde: 0 }, { tipo: 'dron', n: 16, cada: 0.5, desde: 4 }],
        /* 29 */ [{ tipo: 'blindado', n: 20, cada: 0.9, desde: 0 }, { tipo: 'corredor', n: 20, cada: 0.35, desde: 2 }, { tipo: 'dron', n: 14, cada: 0.6, desde: 6 }],
        /* 30 JEFE */ [{ tipo: 'soldado', n: 20, cada: 0.45, desde: 0 }, { tipo: 'blindado', n: 12, cada: 1.3, desde: 3 }, { tipo: 'jefe', n: 1, cada: 1, desde: 8 }, { tipo: 'corredor', n: 14, cada: 0.4, desde: 11 }, { tipo: 'dron', n: 14, cada: 0.5, desde: 12 }]
      ]
    },
    selva: {
      nombre: 'Refugio Verde', dificultad: 'Difícil', tema: 'selva', requiere: 'artico',
      lore: { intro: 'Refugio Verde, oculto en la selva. TERMINUS lo atacará por dos frentes.', victoria: 'El fragmento de la selva está a salvo. Cuando las cuatro bases resistan, el Núcleo quedará expuesto.' },
      totalOleadas: 50,
      vidaExtra: 0.10,                            // +10% de vida a todos los enemigos desde la oleada 1 (v0.22)
      refuerzo: { desde: 15, hasta: 50, extraEn: 0.50 },   // vida extra que crece en curva: 0 en la oleada 15 → +50% en la 50
      ritmo: { esperaSeg: 6, bonoAdelantoPorSeg: 1.5, bonoPorEnJuego: 15, bonoPorOleada: 3 },   // pisa los valores de "oleada" (bonoPorOleada rige desde la oleada 10)
      premioMult: 0.85,                            // premio por enemigo: baja de a poco hasta 85% entre las oleadas 10 y 40
      jefes: { subjefe: 0.6, colosos: [1, 3] },     // Coloso menor (60% de vida) en la 5, 15, 25…; 1 Coloso en la 10 y desde la 20 Colosos al azar
      elites: 0.015,                               // probabilidad de que un enemigo normal salga élite (desde la oleada elite.desde)
      escalaVida: 0.38,                           // 38% por oleada (0.30 → 0.38 en v0.25): además están las dos entradas y 20% más de enemigos
      escalaJefeFinal: 0.30,                      // el Titán sigue creciendo como antes
      oleadasParejas: true,                       // desde la 31, las oleadas livianas traen además blindados
      enemigosGenerados: ['soldado', 'blindado', 'corredor', 'dron'],
      // DOS ENTRADAS: una por la izquierda y otra por arriba. Se juntan en la columna 6 y siguen juntas a la base.
      // Los enemigos se reparten por turno entre las dos. Oleadas: las del ártico con 20% más de enemigos.
      caminos: [
        [[-1, 2], [4, 2], [4, 7], [7, 7], [7, 11], [2, 11], [2, 13], [13, 13]],
        [[10, -1], [10, 5], [7, 5], [7, 11], [2, 11], [2, 13], [13, 13]]
      ],
      especiales: [{ tipo: 'nodriza', desde: 8, cada: 4, n: 1, mas: 12 }],
      oleadas: [
        /*  1 */ [{ tipo: 'soldado', n: 10,  cada: 1.0 }],
        /*  2 */ [{ tipo: 'soldado', n: 12, cada: 0.9 }],
        /*  3 */ [{ tipo: 'soldado', n: 10,  cada: 0.9, desde: 0 }, { tipo: 'corredor', n: 5, cada: 0.6, desde: 5 }],
        /*  4 */ [{ tipo: 'corredor', n: 7, cada: 0.5, desde: 0 }, { tipo: 'dron', n: 4, cada: 1.5, desde: 4 }],
        /*  5 */ [{ tipo: 'blindado', n: 4, cada: 2.5, desde: 0 }, { tipo: 'soldado', n: 10, cada: 0.8, desde: 2 }],
        /*  6 */ [{ tipo: 'corredor', n: 12, cada: 0.45, desde: 0 }, { tipo: 'dron', n: 5, cada: 1.2, desde: 3 }],
        /*  7 */ [{ tipo: 'blindado', n: 6, cada: 2.0, desde: 0 }, { tipo: 'dron', n: 7, cada: 1.0, desde: 4 }],
        /*  8 */ [{ tipo: 'soldado', n: 19, cada: 0.55, desde: 0 }, { tipo: 'corredor', n: 10, cada: 0.5, desde: 4 }],
        /*  9 */ [{ tipo: 'blindado', n: 7, cada: 1.8, desde: 0 }, { tipo: 'dron', n: 10, cada: 0.9, desde: 3 }],
        /* 10 JEFE */ [{ tipo: 'soldado', n: 12, cada: 0.8, desde: 0 }, { tipo: 'jefe', n: 1, cada: 1, desde: 4 }, { tipo: 'corredor', n: 7, cada: 0.5, desde: 8 }, { tipo: 'dron', n: 5, cada: 1.0, desde: 10 }],
        /* 11 */ [{ tipo: 'soldado', n: 24, cada: 0.5, desde: 0 }, { tipo: 'dron', n: 10, cada: 0.8, desde: 3 }],
        /* 12 */ [{ tipo: 'blindado', n: 10, cada: 1.6, desde: 0 }, { tipo: 'corredor', n: 12, cada: 0.45, desde: 5 }],
        /* 13 */ [{ tipo: 'corredor', n: 17, cada: 0.4, desde: 0 }, { tipo: 'dron', n: 12, cada: 0.7, desde: 2 }],
        /* 14 */ [{ tipo: 'soldado', n: 29, cada: 0.4, desde: 0 }, { tipo: 'blindado', n: 5, cada: 2.0, desde: 3 }],
        /* 15 */ [{ tipo: 'blindado', n: 12, cada: 1.4, desde: 0 }, { tipo: 'dron', n: 14, cada: 0.7, desde: 4 }],
        /* 16 */ [{ tipo: 'soldado', n: 24, cada: 0.45, desde: 0 }, { tipo: 'corredor', n: 14, cada: 0.4, desde: 3 }, { tipo: 'dron', n: 7, cada: 1.0, desde: 6 }],
        /* 17 */ [{ tipo: 'blindado', n: 14, cada: 1.2, desde: 0 }, { tipo: 'corredor', n: 10, cada: 0.5, desde: 6 }],
        /* 18 */ [{ tipo: 'soldado', n: 31, cada: 0.4, desde: 0 }, { tipo: 'dron', n: 17, cada: 0.6, desde: 4 }],
        /* 19 */ [{ tipo: 'blindado', n: 14, cada: 1.3, desde: 0 }, { tipo: 'corredor', n: 19, cada: 0.4, desde: 2 }, { tipo: 'dron', n: 12, cada: 0.7, desde: 6 }],
        /* 20 JEFE */ [{ tipo: 'soldado', n: 19, cada: 0.5, desde: 0 }, { tipo: 'blindado', n: 10, cada: 1.5, desde: 3 }, { tipo: 'jefe', n: 1, cada: 1, desde: 6 }, { tipo: 'corredor', n: 12, cada: 0.4, desde: 9 }, { tipo: 'dron', n: 12, cada: 0.6, desde: 10 }],
        /* 21 */ [{ tipo: 'soldado', n: 34, cada: 0.4, desde: 0 }, { tipo: 'dron', n: 14, cada: 0.6, desde: 3 }],
        /* 22 */ [{ tipo: 'blindado', n: 14, cada: 1.2, desde: 0 }, { tipo: 'corredor', n: 19, cada: 0.4, desde: 4 }],
        /* 23 */ [{ tipo: 'corredor', n: 24, cada: 0.35, desde: 0 }, { tipo: 'dron', n: 17, cada: 0.6, desde: 2 }],
        /* 24 */ [{ tipo: 'blindado', n: 19, cada: 1.1, desde: 0 }, { tipo: 'dron', n: 12, cada: 0.8, desde: 5 }],
        /* 25 */ [{ tipo: 'soldado', n: 36, cada: 0.35, desde: 0 }, { tipo: 'corredor', n: 17, cada: 0.4, desde: 3 }, { tipo: 'dron', n: 12, cada: 0.8, desde: 6 }],
        /* 26 */ [{ tipo: 'dron', n: 22, cada: 0.5, desde: 0 }, { tipo: 'blindado', n: 14, cada: 1.2, desde: 2 }],
        /* 27 */ [{ tipo: 'blindado', n: 22, cada: 1.0, desde: 0 }, { tipo: 'corredor', n: 24, cada: 0.35, desde: 5 }],
        /* 28 */ [{ tipo: 'soldado', n: 38, cada: 0.35, desde: 0 }, { tipo: 'dron', n: 19, cada: 0.5, desde: 4 }],
        /* 29 */ [{ tipo: 'blindado', n: 24, cada: 0.9, desde: 0 }, { tipo: 'corredor', n: 24, cada: 0.35, desde: 2 }, { tipo: 'dron', n: 17, cada: 0.6, desde: 6 }],
        /* 30 JEFE */ [{ tipo: 'soldado', n: 24, cada: 0.45, desde: 0 }, { tipo: 'blindado', n: 14, cada: 1.3, desde: 3 }, { tipo: 'jefe', n: 1, cada: 1, desde: 8 }, { tipo: 'corredor', n: 17, cada: 0.4, desde: 11 }, { tipo: 'dron', n: 17, cada: 0.5, desde: 12 }]
      ]
    },
    terminus: {
      nombre: 'Núcleo TERMINUS', dificultad: 'Final', rasgo: 'espiral', tema: 'terminus',
      requiere: ['desierto', 'ciudad', 'artico', 'selva'],   // se abre al completar los otros cuatro
      lore: { intro: 'El Núcleo de TERMINUS. Con los cuatro fragmentos, el equipo llegó al centro para apagarla; sus máquinas convergen desde todas partes.', victoria: 'TERMINUS se apagó. La humanidad tiene una última esperanza.' },
      totalOleadas: 50,
      vidaExtra: 0.10,                            // +10% de vida a todos los enemigos desde la oleada 1 (v0.22)
      refuerzo: { desde: 15, hasta: 50, extraEn: 0.70 },   // vida extra que crece en curva: 0 en la oleada 15 → +70% en la 50
      ritmo: { esperaSeg: 6, bonoAdelantoPorSeg: 1.5, bonoPorEnJuego: 15, bonoPorOleada: 3 },   // pisa los valores de "oleada" (bonoPorOleada rige desde la oleada 10)
      premioMult: 0.80,                            // premio por enemigo: baja de a poco hasta 80% entre las oleadas 10 y 40
      jefes: { subjefe: 0.6, colosos: [2, 3] },     // Coloso menor (60% de vida) en la 5, 15, 25…; 1 Coloso en la 10 y desde la 20 Colosos al azar
      elites: 0.02,                               // probabilidad de que un enemigo normal salga élite (desde la oleada elite.desde)
      escalaVida: 0.60,                           // espiral muy larga y el jugador llega con torres de fusión: los enemigos aguantan mucho más (0.52 → 0.60 en v0.25)
      escalaJefeFinal: 0.52,                      // el Titán sigue creciendo como antes
      oleadasParejas: true,                       // desde la 31, las oleadas livianas traen además blindados
      enemigosGenerados: ['soldado', 'blindado', 'corredor', 'dron'],
      // ESPIRAL HACIA EL CENTRO: entra por arriba a la izquierda y da dos vueltas hasta la base, al centro del mapa.
      // Entre vuelta y vuelta quedan dos celdas libres para torres. Oleadas: las de Refugio Verde con 15% más enemigos.
      camino: [[-1, 1], [11, 1], [11, 14], [1, 14], [1, 4], [8, 4], [8, 11], [4, 11], [4, 7], [6, 7]],
      // Examen final: el Saboteador es el propio del Núcleo; los otros tres aparecen de vez en cuando
      especiales: [{ tipo: 'saboteador', desde: 6, cada: 3, n: 1, mas: 10 }, { tipo: 'infiltrador', desde: 12, cada: 5, n: 2, mas: 15 },
                   { tipo: 'calefactor', desde: 14, cada: 5, n: 1, mas: 15 }, { tipo: 'nodriza', desde: 16, cada: 6, n: 1, mas: 15 }],
      oleadas: [
        /*  1 */ [{ tipo: 'soldado', n: 12,  cada: 1.0 }],
        /*  2 */ [{ tipo: 'soldado', n: 14, cada: 0.9 }],
        /*  3 */ [{ tipo: 'soldado', n: 12,  cada: 0.9, desde: 0 }, { tipo: 'corredor', n: 6, cada: 0.6, desde: 5 }],
        /*  4 */ [{ tipo: 'corredor', n: 8, cada: 0.5, desde: 0 }, { tipo: 'dron', n: 5, cada: 1.5, desde: 4 }],
        /*  5 */ [{ tipo: 'blindado', n: 5, cada: 2.5, desde: 0 }, { tipo: 'soldado', n: 12, cada: 0.8, desde: 2 }],
        /*  6 */ [{ tipo: 'corredor', n: 14, cada: 0.45, desde: 0 }, { tipo: 'dron', n: 6, cada: 1.2, desde: 3 }],
        /*  7 */ [{ tipo: 'blindado', n: 7, cada: 2.0, desde: 0 }, { tipo: 'dron', n: 8, cada: 1.0, desde: 4 }],
        /*  8 */ [{ tipo: 'soldado', n: 22, cada: 0.55, desde: 0 }, { tipo: 'corredor', n: 12, cada: 0.5, desde: 4 }],
        /*  9 */ [{ tipo: 'blindado', n: 8, cada: 1.8, desde: 0 }, { tipo: 'dron', n: 12, cada: 0.9, desde: 3 }],
        /* 10 JEFE */ [{ tipo: 'soldado', n: 14, cada: 0.8, desde: 0 }, { tipo: 'jefe', n: 1, cada: 1, desde: 4 }, { tipo: 'corredor', n: 8, cada: 0.5, desde: 8 }, { tipo: 'dron', n: 6, cada: 1.0, desde: 10 }],
        /* 11 */ [{ tipo: 'soldado', n: 28, cada: 0.5, desde: 0 }, { tipo: 'dron', n: 12, cada: 0.8, desde: 3 }],
        /* 12 */ [{ tipo: 'blindado', n: 12, cada: 1.6, desde: 0 }, { tipo: 'corredor', n: 14, cada: 0.45, desde: 5 }],
        /* 13 */ [{ tipo: 'corredor', n: 20, cada: 0.4, desde: 0 }, { tipo: 'dron', n: 14, cada: 0.7, desde: 2 }],
        /* 14 */ [{ tipo: 'soldado', n: 33, cada: 0.4, desde: 0 }, { tipo: 'blindado', n: 6, cada: 2.0, desde: 3 }],
        /* 15 */ [{ tipo: 'blindado', n: 14, cada: 1.4, desde: 0 }, { tipo: 'dron', n: 16, cada: 0.7, desde: 4 }],
        /* 16 */ [{ tipo: 'soldado', n: 28, cada: 0.45, desde: 0 }, { tipo: 'corredor', n: 16, cada: 0.4, desde: 3 }, { tipo: 'dron', n: 8, cada: 1.0, desde: 6 }],
        /* 17 */ [{ tipo: 'blindado', n: 16, cada: 1.2, desde: 0 }, { tipo: 'corredor', n: 12, cada: 0.5, desde: 6 }],
        /* 18 */ [{ tipo: 'soldado', n: 36, cada: 0.4, desde: 0 }, { tipo: 'dron', n: 20, cada: 0.6, desde: 4 }],
        /* 19 */ [{ tipo: 'blindado', n: 16, cada: 1.3, desde: 0 }, { tipo: 'corredor', n: 22, cada: 0.4, desde: 2 }, { tipo: 'dron', n: 14, cada: 0.7, desde: 6 }],
        /* 20 JEFE */ [{ tipo: 'soldado', n: 22, cada: 0.5, desde: 0 }, { tipo: 'blindado', n: 12, cada: 1.5, desde: 3 }, { tipo: 'jefe', n: 1, cada: 1, desde: 6 }, { tipo: 'corredor', n: 14, cada: 0.4, desde: 9 }, { tipo: 'dron', n: 14, cada: 0.6, desde: 10 }],
        /* 21 */ [{ tipo: 'soldado', n: 39, cada: 0.4, desde: 0 }, { tipo: 'dron', n: 16, cada: 0.6, desde: 3 }],
        /* 22 */ [{ tipo: 'blindado', n: 16, cada: 1.2, desde: 0 }, { tipo: 'corredor', n: 22, cada: 0.4, desde: 4 }],
        /* 23 */ [{ tipo: 'corredor', n: 28, cada: 0.35, desde: 0 }, { tipo: 'dron', n: 20, cada: 0.6, desde: 2 }],
        /* 24 */ [{ tipo: 'blindado', n: 22, cada: 1.1, desde: 0 }, { tipo: 'dron', n: 14, cada: 0.8, desde: 5 }],
        /* 25 */ [{ tipo: 'soldado', n: 41, cada: 0.35, desde: 0 }, { tipo: 'corredor', n: 20, cada: 0.4, desde: 3 }, { tipo: 'dron', n: 14, cada: 0.8, desde: 6 }],
        /* 26 */ [{ tipo: 'dron', n: 25, cada: 0.5, desde: 0 }, { tipo: 'blindado', n: 16, cada: 1.2, desde: 2 }],
        /* 27 */ [{ tipo: 'blindado', n: 25, cada: 1.0, desde: 0 }, { tipo: 'corredor', n: 28, cada: 0.35, desde: 5 }],
        /* 28 */ [{ tipo: 'soldado', n: 44, cada: 0.35, desde: 0 }, { tipo: 'dron', n: 22, cada: 0.5, desde: 4 }],
        /* 29 */ [{ tipo: 'blindado', n: 28, cada: 0.9, desde: 0 }, { tipo: 'corredor', n: 28, cada: 0.35, desde: 2 }, { tipo: 'dron', n: 20, cada: 0.6, desde: 6 }],
        /* 30 JEFE */ [{ tipo: 'soldado', n: 28, cada: 0.45, desde: 0 }, { tipo: 'blindado', n: 16, cada: 1.3, desde: 3 }, { tipo: 'jefe', n: 1, cada: 1, desde: 8 }, { tipo: 'corredor', n: 20, cada: 0.4, desde: 11 }, { tipo: 'dron', n: 20, cada: 0.5, desde: 12 }]
      ]
    },
  }
};
