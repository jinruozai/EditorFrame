/**
 * Thin project-level wrappers over EF.ui.modal / EF.ui.menu to replace
 * native prompt() / confirm() / the old ContextMenu module.
 *
 * All return Promise<result>. If the user escapes or clicks the backdrop,
 * the promise resolves with null (prompt) or false (confirm).
 *
 * Exposed as window.UIX.
 */
(function () {
  'use strict';
  var t = window.t;  // i18n shortcut, set below if I18N is loaded
  try { t = window.t || (function (s) { return s; }); } catch (_) { t = function (s) { return s; }; }

  var ui = EF.ui;

  // ──────────────────────────────────────────────────────────────────
  // PromptModal — single-line text input modal. Submits on Enter.
  // ──────────────────────────────────────────────────────────────────
  function promptModal(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var value = EF.signal(opts.default != null ? String(opts.default) : '');
      var body  = ui.h('div', null, { style: 'display:flex;flex-direction:column;gap:10px;min-width:320px;' });

      if (opts.message) body.appendChild(ui.h('div', null, { text: opts.message, style: 'font-size:12px;color:var(--ef-fg-2);' }));

      var input = ui.input({
        value:       value,
        placeholder: opts.placeholder || '',
      });
      body.appendChild(input);

      var footer = ui.h('div', null, { style: 'display:flex;gap:6px;justify-content:flex-end;' });
      var cancel = ui.button({ text: opts.cancelLabel || 'Cancel', onClick: function () { modal.close(); resolve(null); } });
      var ok     = ui.button({ text: opts.okLabel || 'OK', kind: 'primary', onClick: function () { modal.close(); resolve(value.peek()); } });
      footer.appendChild(cancel); footer.appendChild(ok);

      var modal = ui.modal({
        title: opts.title || '',
        content: body,
        footer: footer,
        onClose: function () { resolve(null); },
      });

      // Focus input + select all; submit on Enter.
      setTimeout(function () {
        var el = input.querySelector('input'); if (!el) return;
        el.focus(); el.select();
        el.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter') { modal.close(); resolve(value.peek()); }
        });
      }, 30);
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // ConfirmModal — Yes/No modal with optional danger styling.
  // ──────────────────────────────────────────────────────────────────
  function confirmModal(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var body = ui.h('div', null, { style: 'min-width:320px;max-width:460px;font-size:13px;color:var(--ef-fg-1);line-height:1.5;' });
      body.textContent = opts.message || '';

      var footer = ui.h('div', null, { style: 'display:flex;gap:6px;justify-content:flex-end;' });
      var cancel = ui.button({ text: opts.cancelLabel || 'Cancel', onClick: function () { modal.close(); resolve(false); } });
      var ok     = ui.button({
        text: opts.okLabel || 'OK',
        kind:  opts.danger ? 'danger' : 'primary',
        onClick: function () { modal.close(); resolve(true); },
      });
      footer.appendChild(cancel); footer.appendChild(ok);

      var modal = ui.modal({
        title: opts.title || '',
        content: body,
        footer: footer,
        onClose: function () { resolve(false); },
      });
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // contextMenu({ x, y }, items) — anchors a ui.menu at a point on screen.
  //
  // Items follow EF.ui.menu's spec: { label, icon?, kbd?, onSelect, danger?,
  // disabled? } | { type: 'divider' } | { type: 'header', label }.
  //
  // A zero-size anchor is placed at (x,y); popover positioning takes care
  // of flipping against viewport edges.
  // ──────────────────────────────────────────────────────────────────
  function contextMenu(pos, items) {
    var anchor = document.createElement('div');
    anchor.style.cssText = 'position:fixed;width:0;height:0;left:' + (pos.x || 0) + 'px;top:' + (pos.y || 0) + 'px;';
    document.body.appendChild(anchor);

    var menu = ui.menu({
      anchor: anchor,
      items:  items,
      side:   'bottom',
      align:  'start',
    });

    // Drop the anchor when the menu is dismissed (ui.menu calls close()
    // on outside-click / ESC). We watch for the anchor's disconnect by
    // wrapping the close handler.
    var origClose = menu.close;
    menu.close = function () {
      try { origClose(); } catch (_) {}
      if (anchor.parentNode) anchor.parentNode.removeChild(anchor);
    };
    return menu;
  }

  window.UIX = {
    prompt:      promptModal,
    confirm:     confirmModal,
    contextMenu: contextMenu,
  };
})();
