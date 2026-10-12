# WebI — Componente de Tabs

Este repo contiene **dos versiones** del mismo componente. Conviven a propósito,
y cada una se puede abrir por separado:

| Versión | Dónde | Cuándo usarla |
|---|---|---|
| **Original** | `src/index.html` + `src/js/Tab.js` + `src/js/main.js` | Para comparar. Cumple la norma 1 del brief, pero mezcla navegación y contenido en un mismo archivo. |
| **`2b-db`** | `src/demo.html` + `src/js/Tabs.js` | La versión nueva. Separa las dos responsabilidades y las compone. |

La sección [El brief original](#el-brief-original) al final está **intacta**: es
el enunciado de la tarea. Todo lo de arriba es la implementación.

---

## Índice

- [Corré la demo](#corré-la-demo)
- [El problema que resuelve `2b-db`](#el-problema-que-resuelve-2b-db)
- [Arquitectura](#arquitectura)
- [Las dos piezas por dentro](#las-dos-piezas-por-dentro)
- [La fachada](#la-fachada)
- [API](#api)
- [Sin `innerHTML`](#sin-innerhtml)
- [Cómo se desacopló](#cómo-se-desacopló)
- [Qué se corrigió respecto de la versión original](#qué-se-corrigió-respecto-de-la-versión-original)
- [Archivos](#archivos)
- [El brief original](#el-brief-original)

---

## Corré la demo

Los ES modules **no cargan desde `file://`**: el navegador los bloquea por CORS.
Si abrís el HTML con doble click vas a ver un error en la consola y una página
en blanco. Hay que servirlo por HTTP.

```bash
npx serve src
```

Después abrí <http://localhost:3000/demo.html> para la versión nueva, o
<http://localhost:3000/index.html> para la original.

No hay build, ni bundler, ni `package.json`. Son módulos ES nativos: copiás la
carpeta `src/js/` a cualquier proyecto y funciona.

---

## El problema que resuelve `2b-db`

La versión original tiene un archivo, `Tab.js`, que hace dos cosas que no tienen
nada que ver entre sí:

1. Decide **qué pestaña está activa** (navegación).
2. Decide **qué hay adentro de un panel** (contenido).

El problema no es que el archivo sea largo. Es que son **dos razones para
cambiar** mezcladas en un mismo lugar. Si mañana querés cambiar cómo se anima el
cambio de pestaña, vas a tocar el mismo archivo donde vive el render de las
filas, y no hay forma de desacoplar el cambio sin arriesgar romper el otro.

Hay un segundo problema, más concreto: `addRow()` necesita recibir un `tabId`
para saber en qué panel insertar la fila. Eso obliga a que el código que maneja
el contenido **sepa que existe el concepto de pestaña**. Si mañana el mismo
componente de filas se usa en un panel suelta, en un acordeón o en un modal,
no le sirve.

La versión `2b-db` parte el problema en dos y lo vuelve a armar con una fachada.

---

## Arquitectura

Tres archivos, tres responsabilidades. La regla es que **cada uno tiene una sola
razón para cambiar**:

| Pieza | Responde a | Sabe de | NO sabe de |
|---|---|---|---|
| `TabChrome.js` | ¿qué pestaña está activa? | navegación, paneles, ARIA, teclado, animación | que existan filas |
| `TabContent.js` | ¿qué hay adentro? | filas y construcción de nodos | que existan pestañas |
| `Tabs.js` | — | compone las dos anteriores | — |

```
┌─ <custom-tabs> ────────────────────────────────┐   ← TabChrome
│  shadow root propio: nav, indicador, teclado    │
│                                                 │
│  <div slot="tab">Estudiantes</div>               │
│  <div slot="panel">                             │
│    ┌─ shadow root propio ───────────────────┐   │   ← TabContent
│    │  .tw-row  Ana Torres   ana@email.com   │   │
│    │  .tw-row  Bruno Díaz   bruno@email.com │   │
│    └────────────────────────────────────────┘   │
│  </div>                                         │
└─────────────────────────────────────────────────┘
```

Son **dos shadow roots anidados**. El chrome no puede alcanzar los estilos de las
filas, y las filas no pueden alcanzar los del chrome. Ninguno de los dos depende
de `styles.css` ni del CSS de la página.

Y el contenido **no sabe que existe una barra de pestañas arriba**. Solo recibe
un panel y escribe adentro. Por eso `TabContent` se puede usar suelto, en
cualquier otro contenedor.

---

## Las dos piezas por dentro

### `TabChrome` — el cuadrado

Envuelve el custom element `<custom-tabs>` en lugar de exponerlo. Esto no es
decorativo: hace que **quien usa el componente dependa de la interfaz de
`TabChrome` y no de la implementación**. Si mañana se reemplaza
`<custom-tabs>` por otra cosa, `TabChrome` sigue teniendo los mismos métodos y
nadie más se entera.

De este archivo sale el `aria-controls` que la versión anterior no tenía, y es
el que garantiza que un lector de pantalla pueda **leer el panel y no solo ver
la barra**.

```js
const chrome = new TabChrome(document.getElementById('app'));
chrome.addOption({ id: 'estudiantes', label: 'Estudiantes' });

chrome.getPanel('estudiantes');
// → <div slot="panel">, el panel vacío de esa pestaña
```

`getPanel()` es el punto de costura: es por ahí donde la fachada le inyecta un
`TabContent`.

### `TabContent` — el interior

Recibe el panel por inyección y no sabe nada más.

```js
new TabContent(panel).addRow({ elements: [...] });
```

Notá lo que **no** aparece: `tabId`. No lo necesita, porque el panel que recibió
ya sabe dónde está. Por eso `addRow` de la versión nueva tiene una firma más
simple que el de la original, y esa diferencia existe a propósito.

---

## La fachada

`Tabs` es lo que hace que el conjunto se use **como un solo componente**. Es la
diferencia entre esto:

```js
// Pieza por pieza — el consumidor tiene que saber cuántas hay
const chrome = new TabChrome(root);
const content = new TabContent(chrome.getPanel('estudiantes'));
content.addRow({ elements: [...] });
```

y esto:

```js
// Como un solo componente
new Tabs(root)
  .addOption({ id: 'estudiantes', label: 'Estudiantes' })
  .addRow('estudiantes', { elements: [...] });
```

Todos los métodos devuelven `this`, así que encadenan. El `tabId` sigue estando
en la superficie pública **por compatibilidad** con la API anterior, aunque hacia
adentro no sea necesario: la fachada sabe a qué `TabContent` corresponde.

---

## API

```js
import { Tabs } from './js/Tabs.js';

const tabs = new Tabs(document.getElementById('app'), { accent: '#0ea5e9' });
```

| Método | Qué hace |
|---|---|
| `new Tabs(root, options?)` | Crea el componente dentro de `root`. |
| `.addOption({ id, label })` | Agrega una pestaña con su panel vacío. |
| `.addRow(tabId, config)` | Agrega una fila al panel indicado. |
| `.deleteRow(tabId, index)` | Elimina una fila por índice. |
| `.clearRow(tabId)` | Vacia un panel. |
| `.rowCount(tabId)` | Cantidad de filas de un panel. |
| `.removeOption(tabId)` | Elimina la pestaña y su contenido. |
| `.selectTab(tabId)` | Activa una pestaña por id. |
| `.show()` / `.hide()` | Muestra u oculta el componente. |
| `.on(tipo, fn)` | Escucha `tab-change` y `visibility-change`. |
| `.tabIds` / `.length` / `.activeId` | Estado, en lectura. |

**`options.accent`** es opcional y **solo setea una variable CSS**
(`--tabs-accent`). No toca la estructura interna: es la única forma de
personalizar el componente desde afuera, y a propósito.

### Cómo se escribe una fila

Cada elemento de `elements` acepta:

| Campo | Qué es |
|---|---|
| `type` | Etiqueta. Por defecto `div`. |
| `text` | Contenido textual. Va por `textContent`. |
| `class` | Clases. |
| `style` | Estilos inline. |
| `attrs` | Atributos HTML. **No acepta nada que empiece con `on`.** |
| `on` | Listeners: `{ click: fn }`. |
| `children` | Hijos, anidados recursivamente. |

```js
tabs.addRow('estudiantes', {
  elements: [
    { type: 'span', text: 'Ana Torres', style: { fontWeight: 600, minWidth: '9rem' } },
    { type: 'span', text: 'ana@email.com', style: { color: '#6b7280' } },
  ],
});

tabs.addRow('estudiantes', {
  class: 'tw-row--muted',
  style: { padding: '8px 16px' },
  elements: [{ type: 'span', text: 'Fila atenuada' }],
});
```

---

## Sin `innerHTML`

No hay `innerHTML` en ninguno de los tres archivos. Los nodos se construyen con
`createElement`, el texto entra por `textContent`, y el anidamiento se resuelve
con `children` de forma recursiva:

```js
tabs.addRow('estudiantes', {
  elements: [{
    type: 'details',
    children: [
      { type: 'summary', text: 'Ver notas' },
      {
        type: 'ul',
        children: [
          { type: 'li', text: 'Ana Torres aprobó con 9.' },
          { type: 'li', text: 'Bruno Díaz debe un parcial.' },
        ],
      },
    ],
  }],
});
```

### Por qué `attrs` rechaza los `on*`

Quitar `innerHTML` **no alcanza** para cerrar los XSS. `attrs: { onclick: '...' }`
sigue siendo un sink: el navegador compila ese string como código. Por eso
cualquier atributo que empiece con `on` se rechaza con un error explícito, y los
handlers van por `on`, que usa `addEventListener` y recibe una función.

```js
{ type: 'button', attrs: { onclick: 'alert(1)' } }
// TypeError: "onclick" es un handler y no puede ir en attrs. Usá la propiedad "on".

{ type: 'button', on: { click: () => alert(1) } }
// OK: función, no string
```

---

## Cómo se desacopló

**El contenedor se recibe, no se busca.** `new Tabs(root)` recibe un `Element`.
La versión original hacía `document.getElementById('app-tabs')` por dentro, que
es dependencia del DOM global: el componente sabía de la página. Acá quien llama
resuelve y le pasa el elemento.

**El panel se inyecta.** `TabContent` no busca su panel, lo recibe. Eso elimina
el `tabId` de su API y la vuelve reutilizable fuera de un contexto de pestañas.

**Cada pieza mete sus estilos en su propio shadow root.** No hay CSS global, ni
clases que colisionen, ni dependencia de que `styles.css` esté cargado.

**La fachada oculta la implementación.** Nadie fuera de `Tabs.js` importa
`TabChrome` o `TabContent`.

---

## Qué se corrigió respecto de la versión original

Estas correcciones son el argumento de por qué la versión nueva existe:

| Problema | Antes | Ahora |
|---|---|---|
| **Selección perdida en silencio** | — | `selectTab()` encadenado justo después de `addOption()` no hacía nada, porque el reparto de slots ocurre en una microtask y el componente todavía no veía las pestañas. Ahora espera la microtask. |
| **Listeners filtrados** | `clearRow()` hacía `panel.innerHTML = ''`, que destruye los nodos sin disparar cleanup: los listeners de las filas quedaban colgados en memoria. | Usa `remove()` sobre cada fila, que sí libera. |
| **Fuga de XSS** | `addRow()` aceptaba `html: '<script>...'` y lo inyectaba con `innerHTML`. | Sin `innerHTML`. El texto va por `textContent`. |
| **XSS por atributos** | — | `attrs` rechaza `on*`. |
| **ARIA incompleto** | Sin `role`, sin `aria-selected`, sin navegación por teclado. Un lector de pantalla no anuncia la pestaña activa. | `role="tab"` + `aria-selected` + `role="tabpanel"` + `aria-labelledby` + `aria-controls`, y flechas `←` `→` `Home` `End`. |
| **Paneles sin animación** | Solo se alternaba `display: none` / `flex`. | Transiciones con dirección: el panel entra y sale según si avanzás o volvés. |
| **Animación sin soporte** | El CSS definía `.tab-enter` / `.tab-exit`, pero el JS nunca las aplicaba. | Se animan de verdad, con `prefers-reduced-motion` respetado. |
| **Formato de `deleteRow`** | El brief documentaba `deleteRow(rowIndex)` y el código hacía `deleteRow(tabId, index)`. | Firma única, sin contradicción. |

---

## Archivos

```
src/
├── demo.html          Demo de la versión nueva
├── index.html            Demo de la versión original
├── custom-tabs-demo.html Demo de custom-tabs por separado
├── css/styles.css        Estilos de la versión original
└── js/
    ├── Tabs.js           Fachada — punto de entrada de 2b-db
    ├── TabChrome.js      El cuadrado
    ├── TabContent.js     El interior
    ├── custom-tabs.js    Custom element que hace de chrome
    ├── Tab.js            Versión original (sin cambios)
    └── main.js           Demo original (sin cambios)
```

---

---

# El brief original

_Enunciado de la tarea, replicado sin cambios._

# Tab - WEB COMPONENT

## Descripción del Proyecto

Desarrollo de un componente de pestañas (Tabs) interactivo, responsivo y hermético utilizando JS, HTML y CSS. El objetivo principal es garantizar un desacoplamiento total: el HTML base solo servirá como ancla, mientras que la clase en JavaScript manejará todas las opciones, el contenido de cada pestaña y la inyección en el DOM.

El cambio de pestañas (ej. de *Estudiantes* a *Aulas*) debe ocultar la información anterior y mostrar la nueva de forma animada.

## Estructura de Carpetas 

* **`/src/`**: Código fuente del proyecto.
* **`/src/index.html`**: Archivo principal.


* **`/src/css/styles.css`**: Archivo de estilos.


* **`/src/js/Tab.js`**: Archivo central.

* **`/src/js/main.js`**: Archivo de ejecución. 


* **`README.md`**: Documentación y normativas del proyecto para el equipo de desarrollo.

## Interfaz y Métodos a Implementar

El archivo `Tab.js` debe exponer los siguientes métodos para manipular el componente sin tocar el HTML:

### Gestión de Pestañas

* **`addOption(config)`**: Método principal para agregar nuevas opciones/pestañas de navegación y sus contenedores de información al tab, gestionado enteramente en JS.


### Manipulación de Contenido

* **`addRow(tabId, config)`**: Permite inyectar elementos (filas) dentro del contenedor de una pestaña específica, asignándoles estilos y estructurándolos (ej. pasándole un arreglo de `elements` y un objeto `style`).


* **`deleteRow(rowIndex)`**: Elimina una fila específica dentro de la pestaña activa.


* **`clearRow(tabId)`**: Limpia por completo el contenido de una pestaña determinada.



### Control de Visibilidad y Animaciones

* **`showContent(tabId)`**: Muestra el contenido de la pestaña activando las animaciones correspondientes (animación JS / transiciones CSS).


* **`hideContent(tabId)`**: Oculta el contenido de la pestaña saliente ejecutando la animación de cierre.



## Normas

1. **Prohibido tocar el HTML para agregar contenido:** Cualquier nueva pestaña, fila, texto o estilo dinámico debe insertarse utilizando los métodos de la clase `Tab` (`addOption`, `addRow`).


2. **Modularidad:** El archivo `Tab.js` no debe conocer detalles específicos del negocio (no debe tener variables llamadas "estudiantes" o "aulas" dentro de su lógica interna). Debe ser lo suficientemente genérico para recibir cualquier tipo de datos.

3. **Animaciones Obligatorias:** Tanto la aparición inicial del componente como los intercambios entre pestañas deben ser transiciones fluidas manejadas mediante CSS (`KeyFrames` / `Transitions`) y controladas por las clases de JS.git add .
