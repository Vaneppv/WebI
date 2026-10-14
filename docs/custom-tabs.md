# Documentación — `<custom-tabs>` y `<custom-panel>`

Dos Web Components **vanilla** (sin frameworks, sin build, sin dependencias) para
construir pestañas, pensados para trabajar **desacoplados**:

- **`<custom-tabs>`** — la barra de pestañas y el cambio entre ellas. Responsivo,
  animado y accesible.
- **`<custom-panel>`** — el **contenido** de una pestaña: muestra HTML declarativo
  y administra **filas** por JS. Se usa **dentro** de un tab o **por separado**.

> `custom-tabs` **no importa** `custom-panel`. Usa composición por contrato
> (_duck-typing_): si el panel expone `addRow(...)`, delega en él; si no, maneja
> las filas él mismo (_fallback_). Podés cargar solo uno o los dos.

---

## Índice

1. [Inclusión](#1-inclusión)
2. [`<custom-tabs>`](#2-custom-tabs)
3. [`<custom-panel>`](#3-custom-panel)
4. [Configuración de filas y elementos](#4-configuración-de-filas-y-elementos)
5. [Formas de uso](#5-formas-de-uso)
6. [Recetario (ejemplos de acciones)](#6-recetario-ejemplos-de-acciones)
7. [Temas y estilos](#7-temas-y-estilos)
8. [Referencia rápida](#8-referencia-rápida)
9. [Notas y limitaciones](#9-notas-y-limitaciones)

---

## 1. Inclusión

Los archivos se **auto-registran**. Alcanza con importarlos como módulos:

```html
<script type="module">
  import './js/custom-panel.js'; // define <custom-panel>
  import './js/custom-tabs.js';  // define <custom-tabs>
</script>
```

- Si solo importás `custom-tabs.js`, funciona igual: las filas usan el _fallback_.
- **Servir por HTTP** (no `file://`): los `import` de módulos están bloqueados por
  CORS desde el sistema de archivos. Ej: `python3 -m http.server`.

---

## 2. `<custom-tabs>`

### 2.1 Slots (estructura)

| Slot | Qué se coloca | Ejemplo |
|---|---|---|
| `tab` | El título/botón de cada pestaña | `<div slot="tab">Inicio</div>` |
| `panel` | El contenido de cada pestaña | `<custom-panel slot="panel">…</custom-panel>` o `<div slot="panel">…</div>` |

Las pestañas y los paneles se **emparejan por orden**: la 1.ª `tab` con el 1.er
`panel`, y así sucesivamente.

Un `tab` puede llevar `data-tab-id="…"` para referenciarlo por id (ver
[`key`](#32-la-clave-key)).

### 2.2 Atributos

| Atributo | Valores | Descripción |
|---|---|---|
| `active` | número (índice) | Pestaña activa. Si está fuera de rango, se corrige solo. |
| `visible` | `"false"` / ausente | `"false"` oculta el componente con animación. |

```html
<custom-tabs active="0" visible="true">…</custom-tabs>
```

### 2.3 Propiedades

| Propiedad | Tipo | Descripción |
|---|---|---|
| `active` | `number` (get/set) | Índice activo; asignarlo equivale a `selectTab`. |
| `activeId` | `string \| null` (get) | `data-tab-id` de la pestaña activa. |
| `visible` | `boolean` (get/set) | Estado de visibilidad del componente. |
| `tabCount` | `number` (get) | Cantidad de pestañas. |
| `tabs` | `HTMLElement[]` (get) | Elementos con `slot="tab"`, en orden. |
| `panels` | `HTMLElement[]` (get) | Elementos con `slot="panel"`, en orden. |

### 2.4 Métodos

| Método | Devuelve | Descripción |
|---|---|---|
| `selectTab(key)` | — | Activa la pestaña indicada (índice o id). |
| `addTab({ title, content, rows, select, id })` | `number` (índice) | Crea una pestaña y su panel. |
| `removeTab(key)` | — | Elimina la pestaña y su panel. |
| `addRow(key, config)` | `this` | Agrega una fila al panel de esa pestaña. |
| `addElement(key, rowIndex, spec)` | `this` | Agrega un elemento al final de una fila existente. |
| `deleteRow(key, rowIndex)` | `this` | Elimina una fila. |
| `clearRow(key)` | `this` | Vacía las filas del panel. |
| `rowCount(key)` | `number` | Cantidad de filas del panel. |
| `getRow(key, rowIndex)` | `HTMLElement \| null` | Elemento de la fila (para ediciones avanzadas). |
| `show()` / `hide()` | — | Muestra / oculta el componente con animación. |

`addRow`, `addElement`, `deleteRow` y `clearRow` son **encadenables**.

**`addTab` recibe:**

| Clave | Tipo | Descripción |
|---|---|---|
| `title` | `string \| Node` | Texto o nodo del botón de la pestaña. |
| `content` | `string \| Node` | HTML (string) o nodo para el contenido del panel. |
| `rows` | `object[]` | Opcional: filas iniciales (se agregan con `addRow`). |
| `select` | `boolean` | Si `true`, activa la pestaña al crearla. |
| `id` | `string` | Opcional: define `data-tab-id` para referenciarla por id. |

> `addTab` devuelve el **índice** (número), no `this`. Los demás son encadenables.

### 2.5 Eventos

Todos con `bubbles: true` y `composed: true`.

| Evento | `detail` | Cuándo |
|---|---|---|
| `tab-change` | `{ index, previous, id }` | Al completarse un cambio de pestaña. |
| `visibility-change` | `{ visible }` | Al mostrar/ocultar el componente. |

```js
tabs.addEventListener('tab-change', (e) => {
  const { index, previous, id } = e.detail;
  console.log(`De ${previous} a ${index}${id ? ` (${id})` : ''}`);
});
```

### 2.6 Teclado y accesibilidad

- `role="tablist"` / `role="tab"` / `role="tabpanel"`, con `aria-selected`,
  `aria-controls` y `aria-labelledby` automáticos.
- Foco itinerante (_roving tabindex_): solo la pestaña activa es tabulable.
- Teclas: **← / →** (anterior/siguiente, con _wrap_), **Home** (primera),
  **End** (última).

---

## 3. `<custom-panel>`

El contenido de una pestaña. No conoce pestañas ni cuál está activa.

### 3.1 Contenido

- **HTML declarativo** → se proyecta por el `<slot>` por defecto.
- **Filas por JS** → `addRow(...)`, dentro de un contenedor propio.

### 3.2 Propiedades

| Propiedad | Tipo | Descripción |
|---|---|---|
| `rowCount` | `number` (get) | Cantidad de filas agregadas por JS. |
| `visible` | `boolean` (get/set) | `true` si no está oculto. |

### 3.3 Métodos

| Método | Devuelve | Descripción |
|---|---|---|
| `addRow(config)` | `this` | Agrega una fila al final. |
| `addElement(rowIndex, spec)` | `this` | Agrega un elemento al final de una fila existente. |
| `deleteRow(index)` | `this` | Elimina una fila por índice. |
| `clearRow()` | `this` | Vacía las filas agregadas por JS (no toca el HTML declarado). |
| `setContent(html \| Node)` | `this` | Reemplaza el contenido declarativo. |
| `getRow(rowIndex)` | `HTMLElement \| null` | Elemento de la fila. |
| `show()` / `hide()` | `this` | Muestra / oculta con animación. |

Todos son **encadenables** (devuelven `this`).

### 3.4 Eventos

`bubbles: true` y `composed: true`.

| Evento | `detail` | Cuándo |
|---|---|---|
| `row-add` | `{ index }` | Se agregó una fila. |
| `row-delete` | `{ index }` | Se eliminó una fila. |
| `row-clear` | `{}` | Se vaciaron las filas. |
| `panel-show` | `{ visible: true }` | El panel se mostró. |
| `panel-hide` | `{ visible: false }` | El panel se ocultó. |

---

## 4. Configuración de filas y elementos

### 4.1 Fila (`config`)

```js
{
  elements: [ /* ElementSpec[] */ ],  // elementos de la fila
  style: { /* estilos inline, opcional */ },
  class: 'mi-clase',                  // clase extra, opcional
}
```

### 4.2 Elemento (`ElementSpec`)

| Clave | Tipo | Descripción |
|---|---|---|
| `type` | `string` | Etiqueta a crear (`'span'`, `'button'`, `'div'`, …). Por defecto `'div'`. |
| `text` | `string` | Texto (seguro: usa `textContent`). |
| `html` | `string` | HTML interno (uso explícito, sin sanitizar). |
| `class` | `string` | `className`. |
| `style` | `object` | Estilos inline. |
| `attrs` | `object` | Atributos (`setAttribute`). **No** admite claves que empiecen con `on`. |
| `on` | `object` | Listeners: `{ evento: handler }` (solo funciones). |
| `children` | `ElementSpec[] \| Node[]` | Anidamiento recursivo. |

> Para handlers usá `on`, no `attrs`. Si `attrs` incluye una clave `on*`, el
> componente lanza un `TypeError`.

---

## 5. Formas de uso

### 5.1 HTML declarativo (con `<custom-panel>`)

```html
<custom-tabs active="0" style="--tabs-accent:#0ea5e9">
  <div slot="tab" data-tab-id="inicio">Inicio</div>
  <custom-panel slot="panel">
    <h3>Inicio</h3>
    <p>Contenido declarado en HTML.</p>
  </custom-panel>

  <div slot="tab" data-tab-id="perfil">Perfil</div>
  <custom-panel slot="panel">
    <p>Este panel acepta filas por JS.</p>
  </custom-panel>
</custom-tabs>
```

### 5.2 HTML declarativo (con `<div>` plano → fallback)

```html
<custom-tabs active="0">
  <div slot="tab" data-tab-id="perfil">Perfil</div>
  <div slot="panel">
    <h3>Perfil</h3>
    <p>Sin <code>&lt;custom-panel&gt;</code>: el componente usa el modo fallback.</p>
  </div>
</custom-tabs>
```

### 5.3 Todo por JavaScript

```html
<custom-tabs id="tabs" active="0"></custom-tabs>
```

```js
const tabs = document.getElementById('tabs');

tabs.addTab({ id: 'estudiantes', title: 'Estudiantes', select: true });
tabs.addTab({ id: 'aulas', title: 'Aulas' });
```

> `addTab` devuelve el **índice** de la pestaña creada (no `this`), así que no se
> encadena desde él. Los métodos de filas sí son encadenables.

### 5.4 `<custom-panel>` por separado

```html
<custom-panel id="panel">
  <h3>Panel suelto</h3>
</custom-panel>
```

```js
const panel = document.getElementById('panel');
panel.addRow({ elements: [{ type: 'span', text: 'Fila 1' }] });
panel.hide();  // se anima el ocultado
panel.show();  // se anima la aparición
```

---

## 6. Recetario (ejemplos de acciones)

### 6.1 Añadir una fila con varios elementos (columnas)

```js
tabs.addRow('estudiantes', {
  elements: [
    { type: 'span', text: 'Ana Torres', style: { fontWeight: 600, minWidth: '9rem' } },
    { type: 'span', text: 'ana@email.com', style: { color: '#6b7280' } },
    { type: 'span', text: 'Resina epóxica' },
  ],
});
```

### 6.2 **Añadir un elemento a una fila existente**

```js
// Al final de la primera fila de la pestaña "estudiantes"
tabs.addElement('estudiantes', 0, { type: 'span', text: 'Activo', class: 'badge' });
```

```js
// Desde el propio panel (índice de fila, sin tabId)
panel.addElement(0, { type: 'a', text: 'Ver', attrs: { href: '#ver' } });
panel.addElement(0, document.createElement('strong')).addElement(0, { type: 'em', text: 'nuevo' });
```

### 6.3 Leer una fila para editarla o consultarla

```js
const row = tabs.getRow('estudiantes', 0);
row.classList.add('destacada');
row.style.background = '#f5f3ff';
console.log(row.textContent);
```

### 6.4 Eliminar una fila / vaciar un panel

```js
tabs.deleteRow('estudiantes', 0); // primera fila
tabs.clearRow('estudiantes');     // todas las filas del panel
```

### 6.5 Añadir una pestaña en tiempo de ejecución

```js
const n = tabs.tabCount + 1;
const index = tabs.addTab({
  id: 'nuevo-' + n,
  title: 'Tab ' + n,
  content: '<p>Contenido creado al vuelo.</p>',
  rows: [
    { elements: [{ type: 'span', text: 'Fila inicial' }] },
  ],
  select: true,
});
console.log('Se creó en el índice', index);
```

### 6.6 Seleccionar por índice o por id

```js
tabs.selectTab(1);        // por índice
tabs.selectTab('aulas');  // por data-tab-id
tabs.active = 0;          // propiedad (equivale a selectTab(0))
console.log(tabs.active, tabs.activeId);
```

### 6.7 Añadir una pestaña por JS y llenarla con datos

```js
const alumnos = [
  { nombre: 'Ana Torres', correo: 'ana@email.com', curso: 'Resina epóxica' },
  { nombre: 'Bruno Díaz', correo: 'bruno@email.com', curso: 'Manejo de tuberías' },
];

tabs.addTab({ id: 'alumnos', title: 'Alumnos', select: true });

alumnos.forEach((a) => {
  tabs.addRow('alumnos', {
    elements: [
      { type: 'span', text: a.nombre, style: { fontWeight: 600 } },
      { type: 'span', text: a.correo },
      { type: 'span', text: a.curso },
    ],
  });
});
```

### 6.8 Fila con botón y su handler

```js
tabs.addRow('docentes', {
  elements: [
    { type: 'span', text: 'Ing. Pérez' },
    {
      type: 'button',
      text: 'Quitar de la lista',
      attrs: { type: 'button' },
      on: { click: () => tabs.deleteRow('docentes', 0) },
    },
  ],
});
```

### 6.9 Contenido anidado complejo (sin `innerHTML`)

```js
tabs.addRow('estudiantes', {
  elements: [{
    type: 'details',
    children: [
      { type: 'summary', text: 'Ver notas' },
      {
        type: 'ul',
        children: [
          { type: 'li', text: 'Ana aprobó con 9.' },
          { type: 'li', text: 'Bruno debe un parcial.' },
        ],
      },
    ],
  }],
});
```

### 6.10 Reemplazar el contenido de un panel (standalone)

```js
panel.setContent('<h3>Nuevo título</h3><p>Contenido reemplazado.</p>');
// o con un nodo:
panel.setContent(document.createElement('section'));
```

### 6.11 Mostrar / ocultar

```js
// El componente entero (con animación de fade + escala)
tabs.visible = !tabs.visible; // o tabs.show(); tabs.hide();

// Un panel suelto
panel.hide();
panel.show();
```

### 6.12 Escuchar eventos

```js
tabs.addEventListener('tab-change', (e) =>
  console.log('tab-change', e.detail));

tabs.addEventListener('visibility-change', (e) =>
  console.log('visibility-change', e.detail.visible));

// Los eventos del panel hacen burbuja y atraviesan <custom-tabs>
tabs.addEventListener('row-add', (e) => console.log('fila agregada:', e.detail.index));
panel.addEventListener('panel-hide', () => console.log('panel oculto'));
```

### 6.13 Encadenar varias acciones

```js
tabs
  .addRow('aulas', { elements: [{ type: 'span', text: 'Aula 101' }] })
  .addRow('aulas', { elements: [{ type: 'span', text: 'Aula 202' }] })
  .addElement('aulas', 0, { type: 'span', text: 'Capacidad: 30' });
```

---

## 7. Temas y estilos

Se personaliza por **variables CSS** y **`::part()`** (los estilos internos están
encapsulados en Shadow DOM).

### `<custom-tabs>`

```css
.custom-tabs {
  --tabs-accent: #0ea5e9;   /* color de la pestaña activa y del indicador */
  --tabs-text: #1f2937;
  --tabs-muted: #6b7280;
  --tabs-border: #e5e7eb;
  --tabs-duration: .3s;     /* duración de las animaciones */
}
```

`part`: `root`, `header`, `indicator`, `panels`.

```css
custom-tabs::part(header) { background: #f9fafb; }
```

### `<custom-panel>`

```css
#panel {
  --panel-row-gap: 12px;
  --panel-row-padding: 12px 16px;
  --panel-row-border: rgba(0, 0, 0, .07);
  --panel-muted: #6b7280;
  --panel-duration: .3s;
}
```

`part`: `content`, `rows`.

> En el **modo fallback** (panel `<div>` plano), las filas se crean como
> `div.custom-tabs-row` en el DOM normal: estilalas desde tu hoja de estilos.

Se respeta `@media (prefers-reduced-motion: reduce)`.

---

## 8. Referencia rápida

```js
// --- <custom-tabs> ---
tabs.active                    // índice activo
tabs.activeId                  // id activo (o null)
tabs.visible                   // boolean
tabs.tabCount                  // número de pestañas
tabs.tabs / tabs.panels        // arrays de elementos

tabs.selectTab(1 | 'aulas')
tabs.addTab({ title, content, rows, select, id })   // → índice
tabs.removeTab(1 | 'aulas')

tabs.addRow(key, config)                     // → this
tabs.addElement(key, rowIndex, spec)         // → this
tabs.deleteRow(key, rowIndex)                // → this
tabs.clearRow(key)                           // → this
tabs.rowCount(key)                           // → número
tabs.getRow(key, rowIndex)                   // → HTMLElement | null

tabs.show() / tabs.hide()

// --- <custom-panel> ---
panel.rowCount
panel.visible

panel.addRow(config)                  // → this
panel.addElement(rowIndex, spec)      // → this
panel.deleteRow(index)                // → this
panel.clearRow()                      // → this
panel.setContent(html | Node)         // → this
panel.getRow(rowIndex)                // → HTMLElement | null
panel.show() / panel.hide()           // → this

// key  = índice (number) o id (string, data-tab-id)
// config = { elements: [...], style: {...}, class: '...' }
// spec   = { type, text, html, class, style, attrs, on, children }
```

---

## 9. Notas y limitaciones

- **`key`**: en los métodos de filas acepta un **índice** (número o su texto) o un
  **id** (`data-tab-id`). Si no se encuentra la pestaña, el método avisa por
  `console.warn` y no hace nada.
- **Fallback**: si el elemento `<custom-panel>` no está definido (no lo importaste)
  o el panel es un `<div>`, `custom-tabs` maneja las filas por sí mismo,
  creando `div.custom-tabs-row` en el DOM normal.
- **`addTab`** crea un `<custom-panel>` si el componente está registrado; si no,
  un `<div>`.
- Las **filas creadas por JS** de un `<custom-panel>` viven en su **Shadow DOM**;
  para acceder a ellas por API usá `getRow(...)`. `clearRow()` **no** borra el
  contenido declarado en HTML del panel.
- Los eventos `row-*` y `panel-*` del panel **atraviesan** `custom-tabs`
  (`composed`), así que se pueden escuchar desde el contenedor paterno.
- `attrs` no acepta handlers (`on*`): usá `on`.
