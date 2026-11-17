# Contexto del proyecto — Tower Defense Sci-Fi Militar (GDD v3)

Actualizado: 11-11-2026. Reemplaza al contexto anterior (GDD v2).

## Para Claude: cómo usar este archivo
Resume todo lo decidido y lo ya programado. Leer completo antes de responder.
No repetir decisiones tomadas. Los números de balance vigentes están en `datos.js`; si este
archivo y `datos.js` difieren, manda `datos.js`.

---

## 1. Desarrollador y forma de trabajo

- Mauricio, ingeniero civil mecánico. No programa; entiende explicaciones breves.
- Ya publicó apps con HTML/CSS/JS + Capacitor + Android Studio + GitHub Pages. Editor: VS Code.
- Claude escribe y prueba el código; Mauricio guarda los archivos en la carpeta del proyecto,
  abre `index.html` para jugar y luego empaqueta con Capacitor.

## 2. Tecnología

| Elemento | Decisión |
|---|---|
| Motor | Phaser 3.90.0 (archivo local `phaser.min.js`, sin internet) |
| Mapa | Lienzo de Phaser, todo dibujado por código (sin imágenes todavía) |
| Interfaz (HUD, botones, panel) | HTML/CSS normal sobre y bajo el lienzo |
| Guardado | `localStorage`, clave `td_guardado_v1` |
| Android / iOS | Capacitor (pendiente) |

Carpeta del proyecto: `C:\Users\mauri\OneDrive\Documentos\Claude\Proyectos\Tower Defense`

Publicado en GitHub Pages: **https://mauriciorodriguezu-beep.github.io/last-hope/** (antes /desert-zone/, ya no funciona)
Repositorio: `mauriciorodriguezu-beep/last-hope` (antes desert-zone) (público, rama `main`). Contiene lo mismo que la carpeta
`publicar/`. Claude tiene permiso para subir cambios; activar Pages lo hizo Mauricio a mano.
Al publicar una versión nueva: regenerar `publicar/`, cambiar el número de `CACHE` en `sw.js`, cambiar el
`?v=` de `datos.js` y `juego.js` en `publicar/index.html`, y subir. Desde v0.5.2 el juego consulta siempre al
servidor y se recarga solo cuando llega una versión nueva.

Archivos de la carpeta:

- `Last Hope.html` — el juego (antes `Desert Zone.html`): estructura de la pantalla y estilos. (Antes `index.html`; Capacitor y
  GitHub Pages exigen `index.html`, así que al empaquetar hay que renombrarlo o crear una copia.)
- `iconos/` — ícono del juego (torreta sobre arena): `.ico` para Windows, PNG de 32, 180, 192 y 512 px, y el `.svg` fuente.
- `manifest.webmanifest` — nombre e íconos para instalarlo en el teléfono (falta el service worker).
- `publicar/` — copia lista para subir a GitHub Pages (con `index.html` y `sw.js` para instalar y jugar sin
  internet). La genera Claude a partir de los archivos de arriba; no editar ahí, se regenera en cada versión.
- `Last Hope.url` — acceso directo de Windows con el ícono; apunta a la ruta de esta carpeta.
- `datos.js` — **todos los números**: precios, daño, vida, oleadas, camino. Se ajusta el balance aquí.
- `juego.js` — reglas, simulación y dibujo.
- `phaser.min.js` — motor, no se toca.

Para probar: doble clic en `Last Hope.html` o en el acceso directo (no necesita servidor).

## 3. Concepto

Tower defense militar sci-fi, vista cenital, pantalla vertical. Inspirado en Onslaught (Flash).
Camino fijo, prioridad en variedad de torres, mejoras y **sinergias entre torres contiguas**.
Nombre del juego: **Tower Defense Desert Zone**. Creado por Mauricio Rodríguez. Nombre, autor y versión
se muestran en la pantalla de inicio y se editan en `datos.js` (`nombre`, `autor`, `version`).

## 4. Pantalla y controles

- Campo de 360 × 440 px lógicos, sin grilla visible. El camino mide 24 px de ancho (se traza sobre una
  cuadrícula interna de 40 px, solo para definirlo en `datos.js`). Las torres miden 30 px.
- **Colocación libre (v0.1.2, pedido por Mauricio; ya no hay grilla):** tocar tipo de torre → tocar cualquier
  punto del campo (muestra torre fantasma, alcance y combos que activaría) → se puede arrastrar para
  afinar → botón **Construir**. Si el punto pisa el camino u otra torre, la torre se corre sola al lugar
  válido más cercano (hasta 30 px). No se puede construir sobre el camino, la base ni otra torre.
- Dos torres forman combo si sus centros están a 48 px o menos (las torres miden 30 px). Al ubicar una
  torre se dibuja un círculo dorado punteado alrededor de las vecinas con las que puede combinar.
- Tocar una torre construida: muestra alcance, datos, y botones **Mejorar**, **Objetivo**, **Vender**.
- Arriba: créditos, oleada, vidas; botón de oleada, velocidad ×1/×2, pausa.
- La partida se pausa sola si la app pasa a segundo plano.
- **Reinicio (v0.2.1, pedido por Mauricio):** al pausar aparece una franja al pie del mapa con
  "Continuar" y "Reiniciar". Reiniciar pide un segundo toque para confirmar. La franja no bloquea el mapa:
  en pausa se puede seguir construyendo y mejorando.

### Aspecto visual (decidido 11-11-2026)
- Ambiente: **desierto de día** (arena, dunas, rocas, camino de tierra con huellas, búnker como base).
- Torres y atacantes **realistas vistos desde arriba**, con sombras: torretas verde oliva sobre losa de
  hormigón, torre criogénica con estanque y boquillas; atacantes en gris carbón y rojo (soldados con
  fusil, blindados con orugas). Los atacantes giran en las curvas.
- Todo **dibujado por código** en `juego.js` (sección 5), sin archivos de imagen.
- La interfaz (barra superior y panel inferior) sigue oscura.

### Cambios de la v0.5 (16-11-2026, pedidos por Mauricio) — prevalecen sobre lo que diga el resto del documento
- **30 oleadas por escenario, con jefe cada 10:** Jefe en la 10 y en la 20 (el mismo tipo; el de la 20 es más
  fuerte porque la vida crece con la oleada) y Jefe final en la 30.
- **Escenarios 50% más grandes:** el campo pasó de 360 × 440 a 440 × 540 px lógicos (11 columnas × 13,5 filas).
  Las torres miden lo mismo (30 px), así que en pantalla todo se ve cerca de 18% más chico.
  - Zona desértica: (-1,1) → (9,1) → (9,6) → (1,6) → (1,11) → (11,11), 38 celdas de camino.
  - Base ártica: (-1,1) → (4,1) → (4,4) → (8,4) → (8,8) → (2,8) → (2,11) → (11,11), 34 celdas.
- **Velocidad ×3:** el botón de velocidad rota ×1 → ×2 → ×3.
- Ajustes de Claude por el campo más grande: créditos iniciales 200 → 300; la Base ártica vuelve a +27% de vida
  por oleada (antes 30%); el lienzo se limita a 1,5 millones de píxeles; el tiempo de juego se mide con el
  reloj real (tope 200 ms por cuadro) para que no se enlentezca en teléfonos lentos.
- Vida en su oleada: Jefe 3.430 (oleada 10) y 6.130 (oleada 20); Jefe final 19.426 (oleada 30).

Balance simulado v0.5 (jugador automático: plan fijo, luego la mejora más barata y después más torres):

| Escenario | Estrategia | Resultado |
|---|---|---|
| Desierto | Racimos A+A+K | Gana con 20 vidas |
| Desierto | Mezcla de las cuatro armas | Gana con 20 |
| Desierto | Solo Plasma | Gana con 2 |
| Desierto | Solo ametralladoras | Pierde en la oleada 15 |
| Desierto | 12 ametralladoras dispersas sin mejoras | Pierde en la 10 |
| Ártico | Racimos A+A+K al centro y a la entrada | Gana con 2 |
| Ártico | Solo ametralladoras | Gana con 8 |
| Ártico | Mezcla de las cuatro armas (5 torres) | Pierde en la 13 |
| Ártico | Plasma y Crío, sin antiaéreo | Pierde en la 9 |
| Ártico | Lejos de la ruta aérea | Pierde en la 3 |

Observación: los jugadores automáticos que llegan al final terminan con 1.000 a 4.500 créditos sin gastar.
Una persona construiría más torres, así que las oleadas 21 a 30 probablemente resulten fáciles. Falta
probarlo con personas. Una partida completa dura 19 a 25 minutos a ×1 sin adelantar oleadas.

Pendiente detectado: en teléfonos de pantalla baja (unos 640 px de alto) el mapa se limita por la altura y
las torres quedan de unos 19 px. Opciones: compactar la interfaz, o permitir acercar y desplazar el mapa.

### Manual dentro del juego (v0.5.1, pedido por Mauricio)
- Se abre con el botón "Manual del juego" de la pantalla de inicio y con "Manual" en la franja de pausa.
  Abrirlo durante la partida la deja en pausa.
- Cuatro pestañas: Jugar (reglas y controles), Torres (base y tabla de atributos por nivel), Combos (cómo
  funcionan y los diez combos con bono y ataque especial) y Enemigos (vida, premio, resistencias).
- El contenido se genera desde `datos.js` al abrirlo: si cambian precios, daños o combos, el manual se
  actualiza solo. Solo los textos explicativos están escritos en `juego.js` (sección MANUAL).

## 5. Reglas

### Economía
- Créditos iniciales: 200. Vidas: 20 (no se recuperan). Cada enemigo que llega a la base quita 1.
- Premio por enemigo eliminado (ver tabla de enemigos).
- Bono al limpiar una oleada: 20 + 5 × número de oleada.
- **Venta: 60% de todo lo invertido en la torre (compra + mejoras).**

### Oleadas
- La primera la inicia el jugador. Al limpiar una oleada hay 10 s de cuenta regresiva.
- Adelantar la oleada paga 3cr por segundo adelantado. Si aún quedan enemigos vivos,
  cuenta como 10 s (30cr). No se puede adelantar mientras la oleada actual sigue saliendo.
- La vida de los enemigos, jefes incluidos, sube 27% por oleada respecto de la primera.

### Tipos de daño y resistencias (multiplicador del daño recibido)

| Enemigo | Físico | Energía | Explosivo | Frío |
|---|---|---|---|---|
| Soldado | 1,0 | 1,0 | 1,0 | normal |
| Blindado | 0,5 | 1,5 | 1,0 | normal |
| Corredor | 1,0 | 1,0 | 0,5 | normal |
| Dron kamikaze (aéreo) | 1,0 | 1,0 | 1,5 | inmune |
| Boss | 0,75 | 0,75 | 0,75 | ralentiza la mitad, no se congela |

### Quién dispara al aire
Ametralladora y Misiles: tierra y aire. Plasma y Crío: solo tierra.

### Objetivo de cada torre
El jugador elige por torre: **Primero** (el más avanzado), **Más fuerte** (más vida) o **Más rápido**.

### Combos (torres pegadas, centros a 48 px o menos) — rediseñados en v0.1.1
Mauricio pidió mejorarlos porque la sinergia "no se notaba". Ahora cada par de torres contiguas forma un
enlace con dos partes:

- **Bono permanente** (igual que antes).
- **Ataque especial**: un círculo dorado entre las dos torres se llena mientras alguna trabaja (dispara o
  frena enemigos). Al llenarse el ataque sale solo, con efecto visible y cartel con su nombre.
  Daño = base + extra por cada mejora comprada entre las dos torres (hasta 18 mejoras). Ignora resistencias.
- Una torre con varias vecinas reparte su carga: con 2 enlaces, cada uno tarda el doble.

| Combo | Entre | Bono permanente | Ataque especial |
|---|---|---|---|
| Metralla de hielo | Ametralladora + Crío | Ametralladora: +40% a frenados | Explosión de 45 px, 30 de daño, congela 0,8 s |
| Fuego cruzado | Ametralladora + Ametralladora | Disparan 15% más rápido | Ráfaga que atraviesa, 45 de daño |
| Ventisca | Crío + Crío | — | Onda de 105 px, 15 de daño, congela 1,8 s |
| Choque térmico | Plasma + Crío | Plasma: +50% a frenados | Golpe de 110 en 30 px, congela 0,6 s |
| Lanza de plasma | Plasma + Ametralladora | Plasma: +15% de alcance | Rayo que atraviesa, 70 de daño |
| Sobrecarga | Plasma + Plasma | Plasma: +10% de daño | Descarga de 150 en 40 px |
| Bombardeo guiado | Misiles + Ametralladora | Misiles: +20% de alcance | Explosión de 60 en 55 px, aturde 0,5 s |
| Misil criogénico | Misiles + Crío | Misiles: +30% a frenados | Explosión de 40 en 60 px, congela 1,5 s |
| Lluvia de misiles | Misiles + Misiles | Misiles: +15% de radio | Explosión de 90 en 70 px |
| Ojiva de plasma | Plasma + Misiles | Misiles: +25% de radio | Explosión de 130 en 50 px |

Los diez están programados (v0.4). Hay tres formas de ataque en el código (`area`, `linea`, `onda`) y tres
aspectos (`hielo`, `plasma`, `fuego`); un combo nuevo se agrega solo en `datos.js`. Pendiente: combos de 3 torres.

### Referencia: mecánicas de Onslaught 2 (a Mauricio le interesan; no se copia código, arte ni nombre)
Verificado en la web (16-11-2026):
- 4 torretas de ataque (roja, verde, azul, amarilla) más torres de apoyo que potencian a las de ataque.
- Combos: torretas pegadas una a otra, con el daño mejorado al máximo, disparan un ataque combinado con
  nombre propio (mina, bomba de racimo, agujero negro, onda de choque, etc.). Hay combos de 2, 3, 4 y 5 torretas.
- El combo depende de qué torreta dispara primero; eso se controla con el alcance.
- La tecla C muestra qué torretas vecinas pueden formar combo.
Ya aplicado: mejoras por atributo (v0.1.3). Ideas pendientes de decidir: combos de 3 torres, torres de
apoyo, y que el combo exija mejoras mínimas.

La carpeta `newgrounds-com/` que Mauricio agregó al proyecto es una copia de la página web de Newgrounds
hecha por otra herramienta; no contiene el juego y no se usa ni se publica.

## 6. Torres base

Valores de Ametralladora y Crío probados en v0.1. Plasma y Misiles son valores iniciales sin probar.

**Mejoras por atributo (v0.1.3, pedido por Mauricio, inspirado en Onslaught 2):** cada atributo se compra por
separado, 3 niveles cada uno (9 mejoras por torre). Al seleccionar una torre, la fila de torres del panel se
reemplaza por 3 botones, uno por atributo, con el valor actual → siguiente y el costo.

### Ametralladora — 80cr · físico · tierra y aire
Base: daño 8, dispara cada 0,35 s, alcance 90 px.

| Atributo | Nivel 1 | Nivel 2 | Nivel 3 |
|---|---|---|---|
| Daño | 11 (40cr) | 14 (70cr) | 18 + perforante: ignora resistencia física (120cr) |
| Cadencia | 0,29 s (40cr) | 0,24 s (70cr) | 0,20 s, se dibuja con doble cañón (120cr) |
| Alcance | 105 (30cr) | 120 (50cr) | 135 (80cr) |

### Torre criogénica — 120cr · control · solo tierra
Base: sin daño, ralentiza 50% a todo lo que esté en su alcance (80 px).

| Atributo | Nivel 1 | Nivel 2 | Nivel 3 |
|---|---|---|---|
| Frío | 60% (50cr) | 70% (80cr) | 80% (120cr) |
| Alcance | 92 (40cr) | 104 (60cr) | 116 (90cr) |
| Congelar | 1,5 s cada 7 s (90cr) | 2 s cada 6 s (130cr) | + fragilidad: los afectados reciben +30% de daño (190cr) |

Plasma y Misiles (abajo) siguen descritos con el esquema antiguo de 3 mejoras en línea; al programarlos
hay que pasarlos a atributos.

### Cañón de plasma — 150cr · energía · solo tierra (programado en v0.4)
Base: daño 60, dispara cada 1,8 s, alcance 115 px. Lanza un proyectil que viaja y sigue al objetivo.

| Atributo | Nivel 1 | Nivel 2 | Nivel 3 |
|---|---|---|---|
| Daño | 80 (70cr) | 105 (110cr) | 135 + crítico: cada 4º disparo hace ×2,5 (170cr) |
| Cadencia | 1,55 s (60cr) | 1,3 s (100cr) | 1,1 s (150cr) |
| Onda | 22 px (60cr) | 30 px (90cr) | 38 px (130cr) |

Onda = radio en que el impacto daña a los vecinos, al 50%.

### Torre de misiles — 180cr · explosivo · tierra y aire (programada en v0.4)
Base: daño 45 en radio 35 px, dispara cada 2,0 s, alcance 150 px. Costaba 200cr en el diseño; se bajó
y se reforzó porque como primera torre perdía en la oleada 3.

| Atributo | Nivel 1 | Nivel 2 | Nivel 3 |
|---|---|---|---|
| Daño | 58 (80cr) | 72 (120cr) | 88 + aturde 0,6 s, jefes no (180cr) |
| Radio | 42 (70cr) | 50 (110cr) | 58 (160cr) |
| Cadencia | 1,75 s (70cr) | 1,5 s (110cr) | salva doble: dos misiles por disparo (220cr) |

## 7. Torres especiales (por programar; valores iniciales)

| Torre | Costo | Efecto | Se desbloquea al |
|---|---|---|---|
| Cañón railgun | 350cr | 120 de daño a todos los enemigos en la línea de tiro, cada 3 s | Completar mapa 1 sin perder vidas |
| Torre Tesla | 300cr | 20 de daño que salta a 4 enemigos, cada 0,8 s, alcance 85 px | Eliminar 500 enemigos en total |
| Dron de combate | 280cr | Patrulla un radio de 100 px, 15 de daño cada 0,4 s, prioriza aéreos | Completar mapa 2 con 15+ vidas |
| Campo de contención (antes "Escudo de energía") | 240cr | Detiene 3 s a todo enemigo en un tramo del camino, cada 12 s. Afecta también a Boss y drones | Completar mapa 2 sin que ningún Boss llegue a la base |

Cambio respecto de v2: el Escudo se desbloqueaba al terminar el último mapa (no quedaba dónde
usarlo), pedía una "dificultad difícil" que no existe y repetía lo que hace la Crío. Ahora se
gana en el mapa 2 y sirve contra lo que la Crío no puede frenar. **Propuesta de Claude; Mauricio
puede cambiarla.**

## 8. Enemigos

| Enemigo | Vida | Velocidad | Premio | Aparece | Estado |
|---|---|---|---|---|---|
| Soldado | 45 | 45 px/s | 7cr | Oleada 1 | Programado y probado |
| Blindado | 200 | 28 px/s | 18cr | Oleada 3 | Programado y probado |
| Corredor | 35 | 90 px/s | 8cr | Base ártica, oleada 3 | Programado (v0.3). Vehículo ligero |
| Dron | 70 | 60 px/s | 12cr | Base ártica, oleada 4 | Programado (v0.3). Vuela en línea recta de la entrada a la base; solo le disparan torres antiaéreas (hoy, la ametralladora) y el frío no le afecta |
| Jefe | 1.000 | 24 px/s | 100cr | Oleada 10 | Programado (v0.2). Quita 5 vidas si llega a la base |
| Jefe final | 2.200 | 24 px/s | 200cr | Oleada 20 | Programado (v0.2). Quita 10 vidas. Franjas doradas |

Los premios bajaron respecto de v2 (10/25/15/20cr): con esos valores sobraban créditos y se
ganaba sin perder vidas con cualquier estrategia.

## 9. Mapas (se desbloquean en orden)

1. **Zona desértica** (fácil) — camino en S, 20 oleadas, jefe en la 10 y jefe final en la 20. *Programado completo en v0.2.*
   Camino en celdas [columna, fila]: (-1,1) → (7,1) → (7,5) → (1,5) → (1,9) → (9,9).
2. **Base ártica** (medio) — *programado en v0.3 (16-11-2026).* Terreno de nieve, camino en zigzag más corto
   (26 celdas contra 30 del desierto): (-1,1) → (3,1) → (3,4) → (6,4) → (6,7) → (2,7) → (2,9) → (9,9).
   20 oleadas con jefe en la 10 y jefe final en la 20; corredores desde la oleada 3 y drones desde la 4.
   Vida de enemigos +30% por oleada (el desierto usa 27%). La ruta aérea se dibuja con una línea punteada tenue.
3. **Ciudad en ruinas** (difícil) — **un solo camino largo que se cruza sobre sí mismo**, 30 oleadas,
   enemigos mixtos desde la oleada 1. (En v2 era doble carril; se descartó por espacio en pantalla.)

### Selección de escenario y desbloqueo (v0.3)
- La pantalla de inicio y la de fin de partida muestran un selector con los escenarios, su dificultad y si
  están completados (con las vidas del mejor resultado).
- Regla definitiva: cada escenario se abre al completar el anterior (campo `requiere` en `datos.js`).
- **Hoy están todos abiertos** para poder probarlos: `desbloquearTodo: true` en `datos.js`. Hay que pasarlo a
  `false` antes de publicar la versión final.
- El botón Reiniciar mantiene el escenario en juego.

Balance de la Base ártica en partidas simuladas (jugador automático, solo compra mejoras tras su plan):

| Estrategia | Resultado |
|---|---|
| Dos racimos A+A+K al centro, cubriendo camino y ruta aérea | Gana con 20 vidas |
| Tres racimos A+A+K repartidos (centro, entrada, abajo) | Gana con 11 vidas |
| Solo ametralladoras en racimos | Llega a la 20 con 8 vidas y pierde contra el jefe final |
| Racimos lejos de la ruta aérea | Llega a la 20 con 2 vidas y pierde |
| 12 ametralladoras dispersas sin mejoras | Pierde en la oleada 10 |

## 10. Guardado entre partidas

Hoy se guarda: enemigos eliminados en total, victorias, mejor resultado en vidas, partidas jugadas.
Desde v0.3 también: escenarios completados, mejor resultado por escenario y último escenario jugado.
Falta: torres desbloqueadas (cuando existan).

## 11. Estado del desarrollo

### v0.1 — hecha y probada (11-11-2026)
- [x] Mapa 1 con 20 oleadas, Soldado, Blindado, Jefe (oleada 10) y Jefe final (oleada 20) (v0.2)
- [x] Ametralladora y Crío con mejoras por atributo, 9 por torre (v0.1.3)
- [x] Colocación libre con confirmación y arrastre (v0.1.2)
- [x] Venta al 60% de lo invertido
- [x] 3 combos por adyacencia con ataque especial y medidor de carga (v0.1.1)
- [x] Objetivo por torre (primero / más fuerte / más rápido)
- [x] Resistencias por tipo de daño
- [x] Oleadas con cuenta regresiva y bono por adelantar
- [x] Velocidad ×2, pausa, guardado de estadísticas
- [x] Pantallas de inicio, victoria y derrota

Reglas de los jefes: todos los daños les hacen 75%, el frío los frena la mitad y no se pueden congelar
(ni con torres ni con combos). Mientras hay un jefe en el campo se muestra su barra de vida arriba.

Balance probado con partidas simuladas en v0.2 (20 oleadas). El jugador automático sigue un plan fijo y
después solo compra mejoras: no construye más torres ni adelanta oleadas, así que una persona rinde más.

| Estrategia | Resultado |
|---|---|
| Dos racimos Ametralladora + Ametralladora + Crío pegados, mejorando | Gana con 20 vidas |
| Lo mismo con las torres menos juntas | Gana con 18 vidas |
| Mitad Crío, mitad ametralladoras | Gana con 15 (el jefe de la 10 se le escapa) |
| 8 ametralladoras en dos cuadros, sin Crío | Llega a la 20 con 11 vidas y pierde contra el jefe final |
| Ametralladoras juntas sin Crío, pocas torres | Pierde en la oleada 12 |
| 5 pares Ametralladora + Crío sin mejoras | Pierde en la oleada 12 |
| 12 ametralladoras dispersas, sin mejoras ni combos | Pierde en la oleada 10, contra el jefe |
| Solo 2 ametralladoras | Pierde en la oleada 6 |

No probado todavía: teléfono real, y una persona jugando (el jugador automático no reemplaza eso).

### v0.2 — siguiente
- [x] Plasma y Misiles con proyectiles, atributos y 7 combos nuevos (hecho en v0.4, 16-11-2026)
- [x] Corredor y Dron (hechos en v0.3, aparecen solo en la Base ártica)
- [x] Mapa 1 completo con 20 oleadas y jefes (hecho 16-11-2026)
- [x] Combos de Plasma y Misiles (hecho en v0.4)

### v0.3
- [x] Selección de escenario, mapa 2 y progreso guardado por escenario (hecho en v0.3)
- [ ] Torres especiales

### v0.4
- [ ] Mapa 3, sonido, gráficos definitivos (sprites)

### v1.0
- [ ] Empaquetar con Capacitor, APK en Android Studio

## 12. Decisiones abiertas

- El nombre incluye "Desert Zone", que es el mapa 1: revisar cuando existan los mapas 2 y 3.
- Jefes: decidido por Mauricio que haya uno en la oleada 10 y otro en la 20. Las vidas que quitan (5 y 10)
  y su resistencia las fijó Claude; Mauricio puede cambiarlas en `datos.js`.
- Nueva condición y efecto del Campo de contención (sección 7).

## 13. Cómo retomar

Decirle a Claude: "Retomamos el tower defense, aquí está el contexto" y adjuntar este archivo
junto con `datos.js` y `juego.js`.

## Cambios v0.6 (50 oleadas, refuerzo y modo infinito)
- **Campaña de 50 oleadas** por escenario (`totalOleadas: 50` en cada mapa). Jefe en 10, 20, 30 y 40; jefe final en la 50 (antes estaba en la 30, que ahora trae un jefe normal).
- **Oleadas generadas:** las oleadas 1 a 30 siguen escritas a mano en `datos.js`; de la 31 en adelante las arma `generarOleada(n)` en `juego.js` con una pauta que se repite cada 5 (enjambre, blindados, rápidos, asalto pesado, de todo) y +4% de enemigos por oleada (`generador: { base: 30, crecimiento: 0.04, jefeCada: 10, jefeExtraCada: 30 }`). Cada mapa declara qué tipos usa (`enemigosGenerados`).
- **Refuerzo:** `oleada.refuerzo: { desde: 20, extra: 0.05 }` → +5% de vida a todos los enemigos desde la oleada 20.
- **Modo infinito:** se elige en la pantalla de inicio (fila `#veloModos`). Sin victoria; jefes cada 10 oleadas (uno más cada 30 oleadas); pasada la oleada 50 la vida crece 3% acumulado por oleada (`infinito: { desde: 50, extraPorOleada: 0.03 }`). Guarda récord por escenario (`recordInfinito`). No desbloquea escenarios.
- Código: `modo`, `fijarTotal()`, `gruposDe(n)`, `multVida(n)`, `pintarModos()`; `TD.ponerModo()` para pruebas.
- **Simulación (bot10.py):** desierto campaña: victoria con racimos A+A+K, mixto y solo plasma si se siguen construyendo torres; ártico: solo gana 1 de 6 planes del bot (cae entre las oleadas 9 y 30 con los demás, igual que antes de este cambio en el tramo 1-19). Infinito: los mejores planes caen cerca de la oleada 100-110 con 60 torres.
- **Pendiente:** el +5% fijo casi no se nota; si se quiere más, subir `extra` o hacerlo creciente. El ártico sigue duro en el tramo 9-15. Nada de esto se ha probado en teléfono real.

## Cambios v0.6.1 (refuerzo cuadrático)
- El refuerzo de vida ya no es un 5% fijo: `oleada.refuerzo: { desde: 20, extra: 0.05, hasta: 50, extraEn: 0.20 }` → +5% en la oleada 20, +6,7% en la 30, +11,7% en la 40, +20% en la 50, y sigue creciendo en infinito (+112% en la 100), además del 3% acumulado.
- Simulado: desierto sin cambios si se sigue construyendo; con 12 torres sin construir más, el jefe final pasa y quita 10 vidas. Ártico: racimos cae en la 28 (antes 30); solo ametralladoras gana con 17 vidas (antes 20). Infinito: cae en la 100 (antes 110), siempre en oleada de jefes.
- Pendiente: si al jugar se siente poco, subir `extraEn` a 0.30-0.35. En infinito el récord queda atado a las oleadas de jefe (múltiplos de 10).

## Cambios v0.6.2 (balance del ártico)
- **Diagnóstico:** en el ártico todas las vidas perdidas por los planes razonables del bot eran por drones (ruta recta corta, inmunes al frío y a los combos, solo dos torres les disparan).
- **Drones por el camino:** los drones ahora siguen el mismo camino que las tropas de tierra (decisión de Mauricio). Siguen siendo aéreos: solo les disparan ametralladora y misiles, y el frío y los combos no les afectan. Se quitó la línea de ruta aérea del mapa. La ruta recta queda disponible en el código con `rutaRecta: true` en el enemigo.
- **Ártico más duro:** `escalaVida: 0.35` en el mapa (desierto sigue en 0.27).
- **Simulación (bot12.py):** ártico campaña: racimos A+A+K gana con 20 vidas, mixto con 14; solo ametralladoras cae en la 20 (por blindados y jefes), sin antiaéreo cae en la 9. Sin construir torres extra: mixto gana con 4, racimos cae en la 43. Infinito ártico: cae en la oleada 90. Desierto sin cambios.
- **Pendiente:** el bot no reacciona a lo que se le filtra; falta prueba de una persona y en teléfono real.

## Cambios v0.7 (modo berserk)
- Una torre con sus 9 mejoras (los tres atributos al máximo) entra en **modo berserk**: marco rojo que late, medidor de carga alrededor y un ataque propio que se dispara solo. Carga solo mientras tiene enemigos a tiro (igual que los combos).
- Datos en `datos.js`, bloque `berserk` de cada torre: Ametralladora "Tormenta de plomo" (10 disparos ×2, cada 12 s); Crío "Cero absoluto" (150 de daño + congela 3 s en su alcance, solo tierra, cada 16 s); Plasma "Supernova" (disparo ×4 con onda de 70 px, cada 14 s); Misiles "Andanada" (6 misiles ×1,5, cada 16 s).
- Código: `t.berserk`, `t.bCarga`, `lanzarBerserk(t)`, `textoBerserk(tipo)`; panel muestra "BERSERK" y % de carga; manual: sección en "Cómo jugar" y línea por torre en "Torres".
- **Simulación:** el berserk facilita el juego (aprox. +30% de daño por torre al máximo). Ártico: solo ametralladoras vuelve a ganar (8 vidas; en v0.6.2 caía en la 20); mixto sin torres extra gana con 14 (antes 4). Infinito: ártico cae en la 100 (antes 90).
- **Pendiente:** con torres pegadas, el medidor berserk se encima con los medidores de combo; revisar legibilidad en teléfono. Si queda fácil, subir `cargaSeg` o la vida del ártico.

## Cambios v0.8 (tres torres nuevas: minas, láser, rayo)
- **Torre minadora** (`minas`, 130 cr): siembra una mina cada `cadencia` s en el camino dentro de su alcance, haya o no enemigos (se acumulan, hasta `maxMinas`). Estallan cuando pasa un enemigo de tierra: daño explosivo en `radio`. Atributos: Daño (75/98/125 + aturde), Siembra (2,5/2,0/1,6 s), Minas (9/12/16 + más radio). Berserk "Campo minado": 8 minas de golpe ×1,5. Al vender la torre se retiran sus minas.
- **Torre láser** (`laser`, 220 cr): haz continuo del largo de su alcance que daña a todo lo que está en la línea (`danoSeg` por segundo). Apunta hacia donde atraviesa más enemigos. Rinde más en la prolongación de un tramo recto del camino (idea de Mauricio). Tierra y aire. Atributos: Potencia (31/40/52 + perfora), Alcance (150/170/195), Haz (ancho 12/15/19). Berserk "Haz total": 3 s con daño ×3 y ancho ×2.
- **Torre de rayos** (`rayo`, 300 cr): descarga que salta entre enemigos cercanos (`saltos`, `radioSalto`), −15% por salto. Tierra y aire. Atributos: Daño (60/80/105 + electrocuta), Saltos (4/5/7 + salto largo), Cadencia (1,3/1,1/0,9). Berserk "Tormenta eléctrica": a todos en su alcance ×2 y aturde 0,8 s.
- **18 combos nuevos** (Mauricio pidió todos los pares): Emboscada, Minas de hielo, Mina de plasma, Detonación en cadena, Campo minado, Haz detonador, Minas eléctricas, Mira láser, Haz criogénico, Láser de plasma, Guía láser, Prisma, Haz ionizado, Balas conductoras, Superconductor, Arco de plasma, Pulso EMP, Tormenta. Nuevos tipos de ataque de combo: `cadena` (descarga que salta) y `minas` (siembra minas extra). Nuevos efectos visuales: `rayo` y `laser`. Total: 28 combos.
- Interfaz: la fila de torres se desliza de lado (se ven 4 y media). Minas y láser no muestran el botón de objetivo.
- **Simulación (bot14.py):** con las torres nuevas el bot gana la campaña en ambos escenarios si sigue construyendo (desierto 8-15 vidas; ártico 12-15 con rayo o mixto). Las estrategias antiguas siguen igual o mejor. Un láser mal ubicado (en diagonal al camino) rinde poco; en la prolongación del tramo recto mata toda la oleada 1 solo.
- **Pendiente:** con muchas minas el camino se ve cargado; medidores de combo encimados en racimos; no probado en teléfono.

## Cambios v0.9 (tercer escenario: Selva, dos entradas)
- **Selva** (`selva`, Difícil, tema `selva`, requiere ártico): dos entradas, una por la izquierda y otra por arriba, que se juntan en la columna 6 y siguen juntas a la base. Rutas: A `[-1,2]→[3,2]→[3,6]→[6,6]→…`, B `[8,-1]→[8,4]→[6,4]→[6,9]→…`, tramo común `[6,9]→[2,9]→[2,11]→[11,11]`.
- Oleadas 1-30 = las del ártico con 20% más de enemigos (jefes igual); 31-50 generadas. `escalaVida: 0.30`.
- **Código de varias rutas:** en datos.js un mapa puede traer `caminos: [ruta1, ruta2, …]` en vez de `camino`. `RUTAS` (cada una con puntos, tramos y largo), `TODOS` (todos los tramos), `posEn(d, ruta)`, `anguloEn(d, ruta)`, `e.ruta`. Los enemigos se reparten por turno entre las entradas. La prioridad "Primero" ahora elige al que está más cerca de la base (sirve con rutas de distinto largo). Las minas se siembran en cualquiera de las rutas.
- Tema selva: suelo verde con charcos y hojas, camino de barro. Un rótulo ENTRADA por ruta (izquierda o arriba). Aviso al empezar: "los enemigos llegan por 2 entradas".
- Selector de escenarios: muestra la dificultad (y "2 entradas" en la selva) en vez de "50 oleadas".
- **Simulación (bot15.py):** selva campaña: racimos gana con 18 vidas, mixto con torres nuevas con 5, solo ametralladoras con 4; mixto 4 armas cae en la 13 (drones). Es el escenario más duro de los tres, como se buscaba. Infinito: racimos cae en la 100.
- **Pendiente:** combos de 3 torres (Mauricio quiere experimentarlos). No probado en teléfono.

## Cambios v0.9.1
- Arreglo: las torres nuevas quedaban escondidas a la derecha en el PC (la fila se deslizaba de lado, sin barra visible). Ahora las 7 torres van en una sola fila de columnas iguales, todas a la vista (probado a 360, 390 y 703 px de ancho).

## Cambios v0.10 (combos de 3 torres: tríos)
- Decisiones de Mauricio: los tríos **se suman** a los combos de 2; son **10 tríos con nombre**; las tres torres deben estar **en triángulo** (las tres pegadas entre sí, a `distCombo` o menos).
- Datos en `datos.js`, lista `trios` (id, nombre, entre: 3 tipos, combo igual que los de 2). Sin bono permanente: solo ataque. No reparten carga (cada trío carga en su `cargaSeg`), y no hacen más lenta la carga de los combos de 2.
- Los 10: Tormenta de acero (A+A+A), Ventisca eterna (K+K+K), Triple impacto (A+K+P), Bombardeo total (X+X+X), Red eléctrica (R+R+R), Prisma triple (L+L+L), Campo de exterminio (N+N+N), Escudo antiaéreo (A+X+R), Fusión (P+L+R), Trampa helada (N+K+X).
- Código: `trioDe()`, enlaces con `torres: [a,b,c]` y `trio: true` (los de 2 también llevan `torres`); `lanzarCombo` usa todas las torres del enlace; `medidorTrio()` dibuja un triángulo magenta al centro. Vista previa al construir: "TRÍO …". Panel: "Trío X n%". Manual: pestaña nueva **Tríos**.
- Balance: Tormenta de acero bajada a daño 60 (+4 por mejora), carga 16 s, porque con 120 hacía ganar a "solo ametralladoras" con holgura. Aun así, en simulación "solo ametralladoras" ahora gana la campaña en los tres mapas si sigue construyendo (8, 16 y 7 vidas), cuando antes caía en la 15 del desierto. Las estrategias mixtas ganan con igual o más margen que antes.
- **Pendiente:** si los tríos facilitan demasiado, subir `cargaSeg` de los tríos. Medidores encimados en racimos de 4 torres.

## Cambios v0.11 (torres combo por fusión; se quita el ataque de trío)
- Decisiones de Mauricio: las torres combo **reemplazan** al ataque de trío. Precio = **1,5 × valor de las tres torres al máximo** (precio + todas sus mejoras), que se paga **además** de consumir las tres torres (fusión). Se ofrecen cuando las tres tienen **todas** sus mejoras. El desbloqueo **dura entre partidas** (opción A): tras la primera fusión se pueden construir directo desde la fila ★, al mismo precio. Se listan en el manual.
- Primeras 4 (las otras 6 recetas de tríos se quitaron por ahora): Cañón rotativo (A+A+A, 3.150 cr: 30 de daño cada 0,1 s a 3 enemigos, perfora), Cañón glacial (A+K+P, 4.140: plasma 500 con onda que congela 1,2 s + aura de frío 40%), Domo antiaéreo (A+X+R, 5.250: salvas de 4 misiles 140, ×2 a aéreos, rayo de 3 saltos al estallar), Reactor de fusión (P+L+R, 5.730: haz 220/s ancho 16 largo 200 + arco de 150 a 6 enemigos cada 2 s).
- Datos: `fusion.factorPrecio`, lista `fusiones` (receta → torre), torres con `combo: true` y `atributos: {}`. El costo se calcula al cargar (`valorMax`).
- Código: el triángulo magenta ahora muestra el avance de mejoras de las tres (lleno y latiendo = listo). Botón **Fusionar** (reutiliza `btnMejorar`). `fusionar()` consume las tres, pone la torre combo en el centro, guarda `guardado.desbloqueadas`. Barra de torres: botón ★ Combo que cambia a la fila de torres combo (bloqueadas con candado y receta) y ← Volver. Pestaña del manual renombrada **Fusión**: recetas visibles, la mecánica se ve solo al desbloquear.
- **Ojo:** `desbloquearTodo: true` (modo pruebas) también deja las 4 torres combo construibles directo. Pasarlo a `false` antes de la versión final.
- Balance: al quitar el ataque de trío vuelve al de la v0.9 (simulado: solo ametralladoras cae en la 15 del desierto). No medido aún en qué oleada se alcanza a pagar una fusión.

## Cambios v0.12 (las 10 torres combo + mover torres)
- **6 torres combo nuevas** (precio automático = 1,5 × valor al máximo de la receta): Núcleo criogénico (K+K+K, 4.370: aura 85% de frenado en 145 px, congela 2,5 s cada 5 s, fragilidad +50%, sin daño), Artillería pesada (X+X+X, 5.850: salvas de 8 misiles de 160 en radio 70, alcance 260, aturde), Torre Tesla (R+R+R, 6.750: 220 de daño, 12 saltos casi sin pérdida, aturde), Láser prismático (L+L+L, 5.540: 3 haces de 160/s en direcciones distintas), Fábrica de minas (N+N+N, 4.640: minas de 250 cada 0,6 s, hasta 30, aturden), Bombardero criogénico (N+K+X, 4.950: salvas de 3 bombas de 180 que congelan 2 s y dejan 2 minas de 150).
- Código: el aura de frío vale para cualquier torre con `lento` (crío, glacial, núcleo); el láser admite `haces`; los misiles admiten `congelaImpacto` y `minasImpacto`. Fila ★ en dos filas de 6.
- **Mover torres** (pedido de Mauricio): botón **Mover** en el panel de la torre. Cuesta `mover.factor` (30%) de lo invertido en ella (precio + mejoras; en torres combo, su precio). Se elige el nuevo lugar igual que al construir (tocar y arrastrar), y se confirma con "Mover aquí". Conserva mejoras; los combos se recalculan (la carga de los combos de esa torre parte de cero). Sus minas ya sembradas quedan donde estaban.
- Detalle conocido: las torres combo se dibujan más grandes (36 px) que el espacio que ocupan (30 px), así que pueden tocarse visualmente con una vecina.

## Cambios v0.12.1 (solo pruebas)
- `inicio.creditos: 20000` para que Mauricio pruebe todas las torres. **Volver a 300 antes de la versión final** (junto con `desbloquearTodo: false`).

## Cambios v0.13 (adelantar hasta 5 oleadas a la vez)
- Se puede llamar la siguiente oleada aunque la actual siga saliendo o tenga enemigos vivos, hasta `oleada.maxEnJuego` (5) oleadas en juego a la vez (pedido de Mauricio).
- Bono: sin oleadas en juego sigue igual (3 cr por segundo de cuenta ahorrado, al llamar). Con k oleadas en juego, la llamada vale k × `bonoPorEnJuego` (25) créditos, que se pagan **al limpiar** esa oleada (si te sobrepasan, no ganas nada). Evita sacar créditos gratis llamando oleadas fáciles.
- Código: cada oleada sale por su cuenta (`G.salidas`), `enJuego()` cuenta oleadas con enemigos por salir o vivos, `G.bonoPend`. Botón: "▶ Adelantar N · k/5 en juego · +X cr al limpiar"; con 5 en juego, "Máximo: 5 oleadas en juego".
- Rendimiento medido: con 5 oleadas de la 40 juntas (236 enemigos) la simulación toma 0,9 ms por paso (de sobra). El dibujo baja a la mitad los cuadros por segundo en el navegador de pruebas (sin tarjeta gráfica); en un teléfono real no está medido.

## Cambios v0.14 (escenarios 20% más grandes + zoom)
- Campo de 13 × 16 celdas (520 × 640 px lógicos; antes 11 × 13,5). Caminos redibujados en proporción: desierto `[-1,1]→[11,1]→[11,7]→[1,7]→[1,13]→[13,13]`; ártico `[-1,1]→[5,1]→[5,5]→[10,5]→[10,10]→[2,10]→[2,13]→[13,13]`; selva A `[-1,2]→[4,2]→[4,7]→[7,7]→[7,11]→[2,11]→[2,13]→[13,13]`, B `[10,-1]→[10,5]→[7,5]→[7,11]→…`.
- **Zoom** (pedido de Mauricio para teléfonos): pellizcar con dos dedos, rueda del mouse o botones + / − al costado derecho del mapa (hasta 2,5×). Con zoom, un dedo arrastra el mapa; al construir o mover una torre, arrastrar acomoda la torre. El toque se resuelve al soltar (si el dedo no se movió). Al cambiar de escenario vuelve a la vista completa.
- La barra de vida del jefe pasó a la página (HTML, arriba del mapa) para que se vea aunque haya zoom.
- Botón de adelantar acortado: "▶ Adelantar N · k/5 · +X cr".
- **Balance con mapas más grandes (simulado con 300 cr):** desierto y selva quedan parecidos a antes. El **ártico quedó más difícil**: sus vueltas son más anchas y una torre ya no alcanza dos tramos del camino a la vez (con planes rehechos para el mapa nuevo: racimos gana con 8 vidas; mixto y solo ametralladoras caen en la 11-12). Opciones si al jugar se siente injusto: bajar `escalaVida` del ártico (0.35 → 0.30) o subir 10-20% el alcance de las torres.
- No probado en teléfono real (pellizco incluido: solo se probaron botones, rueda y arrastre con mouse).

## Cambios v0.14.1 (guardar la partida en curso)
- La partida se guarda sola (localStorage, clave `td_partida_v1`) cada vez que el campo queda limpio al terminar una oleada: escenario, modo, créditos, vidas, oleada, torres (tipo, posición, mejoras, invertido, objetivo) y minas sembradas.
- En la pantalla de inicio aparece **"▶ Continuar: Escenario · oleada N"**. Al continuar, el juego queda en pausa con la cuenta regresiva de la siguiente oleada. Lo que pasó en una oleada a medias (enemigos, créditos ganados en ella) no se guarda: se retoma desde la última oleada limpiada.
- La partida guardada se borra al ganar, al perder o al pulsar **Jugar** (empezar una nueva). No hay confirmación al pulsar Jugar.

## Cambios v0.14.2 (elementos encimados)
- Medidores de combo: los que caen a menos de 14 px entre sí (racimos, p. ej. las diagonales de un cuadrado de 4 torres) se dibujan como uno solo, un poco más grande, con la carga del más avanzado y "×n" adentro. Cada combo sigue cargando y disparando por su cuenta; el panel sigue mostrando el % de cada uno.
- Marca de trío (receta de fusión): ya no va al centro del triángulo (tapaba los medidores). Ahora es un triangulito magenta en la esquina superior izquierda de cada una de las tres torres, que se llena según el avance de mejoras y late en blanco cuando están listas para fusionar.
- Torres combo: se dibujan al mismo tamaño que las demás (30 px, escaladas) con un aura magenta que late, en vez de 36 px que se montaban sobre las vecinas.

## Cambios v0.15 (nombre LAST HOPE, historia y enemigos robot)
- **Nombre del juego: LAST HOPE** (decisión de Mauricio). Cambiado en datos.js, título de la página, manifest (name "LAST HOPE", short_name "Last Hope"). Los nombres de archivo (`Desert Zone.html`), el repositorio (`desert-zone`) y la dirección de GitHub Pages **no** se cambiaron, para no romper accesos ni enlaces ya compartidos.
- **Historia** (borrador aprobado tal cual): año 2387, la IA NEXO decidió que la humanidad era la amenaza; quedan tres bases de la Resistencia; en cada una, científicos descifran el código de NEXO. Datos: `historia` (5 frases), `historiaInfinito`, `historiaDerrota`, y `lore: { intro, victoria }` en cada mapa.
- **Pantalla de introducción** ("TRANSMISIÓN DE LA RESISTENCIA"): una frase por pantalla que se escribe sola, puntos de avance, botones Saltar / Siguiente (el primer toque completa la frase). Se muestra la primera vez (`guardado.historiaVista`); después, botón **Historia** en el menú.
- **Escenarios renombrados como bases:** Puesto Duna (desierto), Estación Glaciar (ártico), Refugio Verde (selva). En el menú, bajo los selectores, va la línea de historia del escenario elegido (o la del modo infinito). En la pantalla final: línea de victoria del escenario, la de derrota, o la del infinito.
- **Enemigos robot** (sin cambio de balance): Androide (ex soldado; hombros de metal, visor rojo, brazo-cañón, batería), Rastreador (ex corredor; robot de cuatro patas con ojo sensor), Tanque autónomo (ex blindado; sensor rojo en la torreta), Coloso (ex jefe; con antena de enlace), Titán de NEXO (ex jefe final), Dron. Avisos: "¡Un Coloso se acerca!", "¡El Titán de NEXO se acerca!", "¡Coloso destruido!"; la barra de vida muestra el nombre del jefe. Ids internos sin cambios.

## Cambios v0.15.1
- La IA ahora se llama **TERMINUS** (antes NEXO, en todos los textos: historia, líneas de cada base, "Titán de TERMINUS", avisos).
- La primera pantalla de la historia muestra arriba el nombre del juego, **LAST HOPE**, en grande; desde la segunda pantalla se oculta.

## Cambios v0.15.2
- La historia se muestra **cada vez** que se abre el juego (antes solo la primera vez), antes del menú. Se puede saltar.

## Cambios v0.15.3
- Botón **⌂ Inicio** en la pausa (pedido de Mauricio): vuelve a la pantalla de inicio desde cualquier escenario, con confirmación de dos toques ("¿Salir? Toca otra vez"). Si el campo está limpio guarda la partida en ese momento; si hay una oleada en curso, "Continuar" la retoma desde la última oleada limpiada. Explicado en el manual (Controles).

## Cambios v0.16 (sonido y música)
- Todo generado por código con Web Audio (sin archivos de audio), sección "SONIDO Y MÚSICA" al inicio de juego.js (`SON`). El audio arranca con el primer toque (regla de los navegadores) y se suspende si la app pasa a segundo plano.
- **Efectos** (pintados una vez en buffers): bala, plasma, misil, explosión, explosión grande (jefe), mina, rayo, robot destruido, congelar, combo, berserk, fusión, alarma de jefe, inicio de oleada, oleada limpia, enemigo llega a la base, construir/mover, mejorar, vender, victoria, derrota. Zumbido continuo mientras algún láser dispara. Cada tipo tiene una separación mínima entre repeticiones para no saturar con muchas torres.
- **Música** adaptable: re menor, Dm–Bb–F–C, 92 ppm, capas (colchón, bajo, arpegio, batería) que suben según la intensidad: 0 menú/historia, 1 entre oleadas o en pausa, 2 combate, 3 jefe en pantalla.
- **Controles:** botón de parlante en la barra superior (silencia/activa todo); en el menú, "Música: sí/no" y "Efectos: sí/no" por separado. Se guardan en `guardado.sonido`. Manual: sección Sonido.
- Muestra grabada: `muestra_sonido_last_hope.mp3` (historia/menú → combate → jefe). Volumen medio: menú ≈ −35 dB, combate ≈ −27 dB.

## Cambios v0.17 (limpieza)
- `inicio.creditos` vuelve a **300**.
- `desbloquearTodo: false`: Estación Glaciar se abre al completar Puesto Duna y Refugio Verde al completar Estación Glaciar; las torres combo se desbloquean solo fusionando (fila ★ muestra candados). Para pruebas, volver a `true`.
- Carpeta `newgrounds-com` (65 MB, 585 archivos, copia de un sitio ajeno) **eliminada** de la carpeta del proyecto en el PC, con permiso de Mauricio. Nunca estuvo en GitHub.

## Cambios v0.17.1 (nombre de archivos)
- `Desert Zone.html` → **`Last Hope.html`**; acceso directo `Tower Defense Desert Zone.url` → **`Last Hope.url`** (mismo ícono); `manifest.webmanifest` local apunta a `Last%20Hope.html`; caché del service worker `last-hope-vX`.
- **Repositorio de GitHub:** el renombre `desert-zone` → `last-hope` no se puede hacer desde Claude (el proxy no permite cambiar ajustes del repositorio). Lo hace Mauricio en GitHub (Settings → General → Repository name). La dirección pasa a ser https://mauriciorodriguezu-beep.github.io/last-hope/ y la antigua deja de funcionar (GitHub no redirige las páginas). Hecho por Mauricio el 17-11-2026; publicación verificada (Pages compiló bien con el nombre nuevo).

## Cambios v0.17.2 (pantalla negra en teléfono)
- Reporte: en el teléfono de Mauricio el sector del mapa se veía negro al darle "Jugar" (HUD y botones sí se veían). No se reproduce en emulación (Pixel 7, iPhone 13, Galaxy S9+). Sospecha: WebGL del teléfono o carga parcial durante el cambio de nombre.
- **Recuadro de errores en pantalla:** si el juego falla, aparece un recuadro rojo abajo con el texto del error (tocar para cerrar). Sirve para que Mauricio lo lea o fotografíe.
- **Modo compatible (canvas 2D):** `?canvas` en la dirección lo fuerza y queda recordado (`td_render` en el almacenamiento); `?webgl` vuelve al normal. Si el teléfono pierde el contexto WebGL, el juego cambia solo a modo compatible y se recarga.
- En modo compatible los textos del mapa usan resolución 1 (con la resolución alta salían agrandados).
