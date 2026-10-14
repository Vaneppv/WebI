/**
 * <custom-panel> — el contenido de una pestaña, como componente independiente.
 *
 * Responsabilidad unica: mostrar y administrar lo que va *dentro* de una
 * pestaña. No conoce la existencia de pestañas, ni cuantas hay, ni cual esta
 * activa. Se puede usar por separado o integrado dentro de <custom-tabs>
 * (como `slot="panel"`).
 *
 * HTML:
 *   <custom-panel>
 *     <h3>Titulo</h3><p>Contenido declarado en HTML.</p>
 *   </custom-panel>
 *
 * JS:
 *   const panel = document.querySelector('custom-panel');
 *   panel.addRow({ elements: [{ type:'span', text:'Ana' }, { type:'span', text:'ana@mail' }] });
 *   panel.show(); / panel.hide();
 *
 * API:     addRow(config), deleteRow(index), clearRow(), setContent(html|Node),
 *          show(), hide(), rowCount, visible
 * Eventos: row-add, row-delete, row-clear, panel-show, panel-hide
 *           (bubbles + composed salvo row-*)
 * Tema:    --panel-row-gap, --panel-row-padding, --panel-row-border,
 *          --panel-muted, --panel-duration
 *
 * Nota: no importa ni depende de nada. Se registra solo.
 */

const PANEL_HTML = `
  <style>
    :host {
      display: block;
      container-type: inline-size;
      --panel-row-gap: 12px;
      --panel-row-padding: 12px 16px;
      --panel-row-border: rgba(0, 0, 0, .07);
      --panel-muted: #6b7280;
      --panel-duration: .3s;
      color: inherit;
    }
    :host([hidden]) { display: none; }

    .content {
      transform-origin: top center;
      transition: opacity .25s ease, transform .25s ease;
    }
    .content.is-hidden { opacity: 0; transform: scale(.97) translateY(-6px); }

    .rows { display: flex; flex-direction: column; }
    .row {
      display: flex; align-items: center; flex-wrap: wrap;
      gap: var(--panel-row-gap);
      padding: var(--panel-row-padding);
    }
    .row + .row { border-top: 1px solid var(--panel-row-border); }
    .empty { margin: 0; color: var(--panel-muted); font-style: italic; }

    @container (max-width: 480px) {
      .row { flex-direction: column; align-items: flex-start; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        transition-duration: .01ms !important;
        animation-duration: .01ms !important;
      }
    }
  </style>
  <div class="content" part="content">
    <slot></slot>
    <div class="rows" part="rows"></div>
  </div>`;

const HANDLER_ATTR = /^on/i;

class CustomPanel extends HTMLElement {
  #content;
  #rowsEl;
  #rows = [];
  #empty = null;
  #timeout = 0;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = PANEL_HTML;
    this.#content = shadow.querySelector('.content');
    this.#rowsEl = shadow.querySelector('.rows');

    // El contenido declarado en HTML llega al slot despues del constructor.
    shadow.querySelector('slot').addEventListener('slotchange', () => this.#renderEmpty());
    this.#renderEmpty();
  }

  disconnectedCallback() {
    clearTimeout(this.#timeout);
  }

  /** Cantidad de filas agregadas por JS. */
  get rowCount() {
    return this.#rows.length;
  }

  /** true si el panel no esta oculto. */
  get visible() {
    return !this.hasAttribute('hidden');
  }
  set visible(v) {
    v ? this.show() : this.hide();
  }

  /**
   * Agrega una fila al final. Cada fila se construye sin innerHTML.
   * @param {{elements?: object[], style?: object, class?: string}} config
   * @returns {this}
   */
  addRow({ elements = [], style, class: className } = {}) {
    const row = this.#buildRow({ elements, style, class: className });
    this.#rowsEl.append(row);
    this.#rows.push(row);
    this.#renderEmpty();
    this.#emit('row-add', { index: this.#rows.length - 1 });

    return this;
  }

  /**
   * Elimina una fila por indice.
   * @param {number} index
   * @returns {this}
   */
  deleteRow(index) {
    const row = this.#rows[index];
    if (!row) return this;

    row.remove();
    this.#rows.splice(index, 1);
    this.#renderEmpty();
    this.#emit('row-delete', { index });

    return this;
  }

  /**
   * Vacia las filas agregadas por JS (no toca el contenido declarado).
   * @returns {this}
   */
  clearRow() {
    for (const row of this.#rows.splice(0)) row.remove();
    this.#renderEmpty();
    this.#emit('row-clear', {});

    return this;
  }

  /**
   * Reemplaza el contenido declarativo del panel.
   * @param {string | Node} content
   * @returns {this}
   */
  setContent(content) {
    this.replaceChildren(content instanceof Node ? content : this.#fragment(content));
    this.#renderEmpty();

    return this;
  }

  /** Muestra el panel con una animacion de entrada. */
  show() {
    clearTimeout(this.#timeout);
    if (!this.hasAttribute('hidden')) return this;

    this.removeAttribute('hidden');
    this.#content.classList.add('is-hidden');
    requestAnimationFrame(() => this.#content.classList.remove('is-hidden'));
    this.#emit('panel-show', { visible: true });

    return this;
  }

  /** Oculta el panel con una animacion de salida. */
  hide() {
    if (this.hasAttribute('hidden')) return this;

    this.#content.classList.add('is-hidden');
    const done = () => {
      if (this.#content.classList.contains('is-hidden')) this.setAttribute('hidden', '');
    };
    this.#content.addEventListener('transitionend', (e) => {
      if (e.target === this.#content) done();
    }, { once: true });
    this.#timeout = setTimeout(done, 400);
    this.#emit('panel-hide', { visible: false });

    return this;
  }

  /* ---------- Internos ---------- */

  #emit(name, detail) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  #renderEmpty() {
    const hasLight = [...this.childNodes].some(
      (n) => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim())
    );
    const hasContent = this.#rows.length > 0 || hasLight;
    if (hasContent) {
      this.#empty?.remove();
      this.#empty = null;
      return;
    }
    if (this.#empty) return;

    this.#empty = document.createElement('p');
    this.#empty.className = 'empty';
    this.#empty.textContent = 'Sin contenido.';
    this.#rowsEl.append(this.#empty);
  }

  #buildRow({ elements = [], style, class: className } = {}) {
    const row = document.createElement('div');
    row.className = className ? `row ${className}` : 'row';
    if (style) Object.assign(row.style, style);

    for (const spec of elements) {
      if (spec instanceof Node) row.append(spec);
      else if (spec && typeof spec === 'object') row.append(this.#build(spec));
    }

    return row;
  }

  /**
   * Construye un nodo desde su configuracion. El texto va por textContent y
   * el anidamiento por `children`; `html` queda como opcion explicita.
   * @param {object} spec
   * @returns {Node}
   */
  #build(spec) {
    const el = document.createElement(spec.type ?? 'div');

    if (spec.text != null) el.textContent = String(spec.text);
    if (spec.html != null) el.innerHTML = String(spec.html);
    if (spec.class) el.className = spec.class;
    if (spec.style) Object.assign(el.style, spec.style);

    if (spec.attrs) {
      for (const [name, value] of Object.entries(spec.attrs)) {
        if (HANDLER_ATTR.test(name)) {
          throw new TypeError(
            `CustomPanel: "${name}" es un handler; usa la propiedad "on".`
          );
        }
        el.setAttribute(name, value);
      }
    }

    if (spec.on) {
      for (const [event, handler] of Object.entries(spec.on)) {
        if (typeof handler === 'function') el.addEventListener(event, handler);
      }
    }

    for (const child of spec.children ?? []) {
      if (child instanceof Node) el.append(child);
      else if (child && typeof child === 'object') el.append(this.#build(child));
    }

    return el;
  }

  #fragment(html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = String(html ?? '');
    return tpl.content;
  }
}

if (!customElements.get('custom-panel')) {
  customElements.define('custom-panel', CustomPanel);
}

export { CustomPanel };
