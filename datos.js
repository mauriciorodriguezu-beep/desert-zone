/* datos.js — TODOS los números del juego viven aquí.
   Para ajustar el balance se edita este archivo; no hace falta tocar juego.js.
   Unidades: distancias en px (1 celda = 40 px), tiempos en segundos, precios en créditos (cr). */

const DATOS = {
  nombre: 'Tower Defense Desert Zone',
  autor: 'Mauricio Rodríguez',
  version: '0.10',

  // true = todos los escenarios abiertos (para pruebas).
  // false = cada escenario se abre al completar el que indica su campo "requiere".
  desbloquearTodo: true,

  // Campo de 440 x 540 px (11 columnas x 13,5 filas de 40 px). La cuadrícula solo se usa para
  // trazar el camino; las torres se ubican libremente.
  celda: 40,
  cols: 11,
  filas: 13.5,

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
    bonoAdelantoPorSeg: 3,  // cr por cada segundo adelantado (con enemigos vivos cuenta como esperaSeg completos)
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

  /* COMBOS DE 3 TORRES (tríos): tres torres pegadas entre sí, en triángulo (las tres a distCombo px o menos
     unas de otras). Se SUMAN a los combos de 2 que ya forman. No dan bono permanente: solo un ataque especial.
     - Su medidor aparece al centro del triángulo y carga mientras alguna de las tres tiene enemigos a tiro.
       No reparte carga: cada trío carga en "cargaSeg" segundos aunque la torre esté en varios.
     - "entre" son los tres tipos (el orden no importa; se pueden repetir).
     - combo: igual que en los combos de 2 ('area', 'linea', 'onda', 'cadena', 'minas'). En 'linea' disparan
       las tres torres; en 'onda' la onda sale del centro del triángulo. "danoPorMejora" cuenta las mejoras
       de las tres torres. */
  trios: [
    { id: 'aceroT', nombre: 'Tormenta de acero', entre: ['ametralladora', 'ametralladora', 'ametralladora'],
      combo: { tipo: 'linea', efecto: 'fuego', cargaSeg: 16, dano: 60, danoPorMejora: 4, largo: 230, ancho: 14, texto: 'tres ráfagas que atraviesan' } },
    { id: 'ventiscaT', nombre: 'Ventisca eterna', entre: ['crio', 'crio', 'crio'],
      combo: { tipo: 'onda', efecto: 'hielo', cargaSeg: 16, dano: 60, danoPorMejora: 4, radio: 140, congela: 3, texto: 'onda enorme que congela 3 s' } },
    { id: 'impactoT', nombre: 'Triple impacto', entre: ['ametralladora', 'crio', 'plasma'],
      combo: { tipo: 'area', desde: 'plasma', efecto: 'plasma', cargaSeg: 14, dano: 250, danoPorMejora: 9, radio: 50, congela: 1.5, texto: 'golpe de plasma que congela' } },
    { id: 'bombardeoT', nombre: 'Bombardeo total', entre: ['misiles', 'misiles', 'misiles'],
      combo: { tipo: 'area', desde: 'misiles', efecto: 'fuego', cargaSeg: 15, dano: 200, danoPorMejora: 9, radio: 100, aturde: 1, texto: 'explosión gigante que aturde' } },
    { id: 'redT', nombre: 'Red eléctrica', entre: ['rayo', 'rayo', 'rayo'],
      combo: { tipo: 'cadena', desde: 'rayo', efecto: 'rayo', cargaSeg: 15, dano: 140, danoPorMejora: 8, saltos: 15, radioSalto: 90, aturde: 0.6, texto: 'descarga de 15 saltos' } },
    { id: 'prismaT', nombre: 'Prisma triple', entre: ['laser', 'laser', 'laser'],
      combo: { tipo: 'linea', efecto: 'laser', cargaSeg: 15, dano: 200, danoPorMejora: 9, largo: 300, ancho: 20, texto: 'tres haces muy largos' } },
    { id: 'exterminioT', nombre: 'Campo de exterminio', entre: ['minas', 'minas', 'minas'],
      combo: { tipo: 'minas', desde: 'minas', efecto: 'fuego', cargaSeg: 14, dano: 150, danoPorMejora: 7, minas: 10, texto: 'siembra 10 minas potentes' } },
    { id: 'escudoT', nombre: 'Escudo antiaéreo', entre: ['ametralladora', 'misiles', 'rayo'],
      combo: { tipo: 'area', desde: 'misiles', efecto: 'rayo', cargaSeg: 14, dano: 180, danoPorMejora: 8, radio: 80, aturde: 1, texto: 'explosión eléctrica, también contra drones' } },
    { id: 'fusionT', nombre: 'Fusión', entre: ['plasma', 'laser', 'rayo'],
      combo: { tipo: 'linea', efecto: 'plasma', cargaSeg: 15, dano: 260, danoPorMejora: 10, largo: 260, ancho: 18, texto: 'tres rayos de plasma' } },
    { id: 'trampaT', nombre: 'Trampa helada', entre: ['minas', 'crio', 'misiles'],
      combo: { tipo: 'area', desde: 'misiles', efecto: 'hielo', cargaSeg: 14, dano: 150, danoPorMejora: 8, radio: 90, congela: 2.5, texto: 'explosión helada grande' } }
  ],

  /* ENEMIGOS
     vidas     vidas que quita si llega a la base (1 si no se indica)
     resFrio   cuánto le afecta el frío: 1 = normal, 0.5 = la mitad
     noCongela true = no se puede congelar (ni con torres ni con combos)
     jefe      true = se dibuja como tanque pesado y muestra su barra de vida arriba del campo */
  enemigos: {
    soldado:  { nombre: 'Soldado',  vida: 45,  vel: 45, premio: 7, aereo: false,
                resist: { fisico: 1,   energia: 1,   explosivo: 1 } },
    blindado: { nombre: 'Blindado', vida: 200, vel: 28, premio: 18, aereo: false,
                resist: { fisico: 0.5, energia: 1.5, explosivo: 1 } },
    corredor: { nombre: 'Corredor', vida: 35,  vel: 90, premio: 8, aereo: false,
                resist: { fisico: 1,   energia: 1,   explosivo: 0.5 } },
    // Aéreo: vuela sobre el mismo camino que las tropas de tierra.
    // (con rutaRecta: true volaría en línea recta de la entrada a la base)
    // Solo le disparan las torres antiaéreas y el frío no le afecta.
    dron:     { nombre: 'Dron',     vida: 70,  vel: 60, premio: 12, aereo: true,
                resist: { fisico: 1,   energia: 1,   explosivo: 1.5 } },
    jefe:      { nombre: 'Jefe',       vida: 1000, vel: 24, premio: 100, aereo: false, jefe: true,
                 vidas: 5, resFrio: 0.5, noCongela: true,
                 resist: { fisico: 0.75, energia: 0.75, explosivo: 0.75 } },
    jefeFinal: { nombre: 'Jefe final', vida: 2200, vel: 24, premio: 200, aereo: false, jefe: true,
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
     tema: aspecto del terreno (desierto o nieve). requiere: escenario que hay que completar antes. */
  mapas: {
    desierto: {
      nombre: 'Zona desértica', dificultad: 'Fácil', tema: 'desierto',
      totalOleadas: 50,                           // la campaña termina en esta oleada, con el jefe final
      enemigosGenerados: ['soldado', 'blindado'],  // tipos que usan las oleadas generadas
      camino: [[-1, 1], [9, 1], [9, 6], [1, 6], [1, 11], [11, 11]],
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

    artico: {
      nombre: 'Base ártica', dificultad: 'Medio', tema: 'nieve', requiere: 'desierto',
      totalOleadas: 50,
      escalaVida: 0.35,                           // aquí la vida sube 35% por oleada (en el desierto, 27%)
      enemigosGenerados: ['soldado', 'blindado', 'corredor', 'dron'],
      camino: [[-1, 1], [4, 1], [4, 4], [8, 4], [8, 8], [2, 8], [2, 11], [11, 11]],
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
      nombre: 'Selva', dificultad: 'Difícil', tema: 'selva', requiere: 'artico',
      totalOleadas: 50,
      escalaVida: 0.30,                           // 30% por oleada: lo difícil aquí son las dos entradas y los 20% más de enemigos
      enemigosGenerados: ['soldado', 'blindado', 'corredor', 'dron'],
      // DOS ENTRADAS: una por la izquierda y otra por arriba. Se juntan en la columna 6 y siguen juntas a la base.
      // Los enemigos se reparten por turno entre las dos. Oleadas: las del ártico con 20% más de enemigos.
      caminos: [
        [[-1, 2], [3, 2], [3, 6], [6, 6], [6, 9], [2, 9], [2, 11], [11, 11]],
        [[8, -1], [8, 4], [6, 4], [6, 9], [2, 9], [2, 11], [11, 11]]
      ],
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
    }
  }
};
