/*
 * Librería — Global de Programación III.
 * Módulo: js/paginacion.js
 * Responsabilidad: control de paginación limit/offset reutilizable.
 *
 * Recibe el desplazamiento actual, el total informado por la API (puede ser
 * null si el backend devuelve un array plano) y la cantidad de la página; avisa
 * el nuevo offset por callback. La vista decide cuándo reiniciar a cero.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  function crearBoton(texto, deshabilitado, accion) {
    var control = document.createElement('button');
    control.type = 'button';
    control.className = 'boton boton--secundario';
    control.textContent = texto;
    control.disabled = Boolean(deshabilitado);
    control.addEventListener('click', accion);
    return control;
  }

  window.Libreria.paginacion = {
    /**
     * opciones: { offset, total, cantidad, limite, etiqueta, alCambiar }
     * Devuelve un <nav> con el conteo y los botones Anterior/Siguiente.
     */
    crear: function (opciones) {
      var config = opciones || {};
      var limite = Number(config.limite) || 20;
      var offset = Math.max(0, Number(config.offset) || 0);
      var cantidad = Math.max(0, Number(config.cantidad) || 0);
      var total = config.total === null || config.total === undefined ? null : Number(config.total);

      var nav = document.createElement('nav');
      nav.className = 'paginacion';
      nav.setAttribute(
        'aria-label',
        config.etiqueta ? 'Paginación de ' + config.etiqueta : 'Paginación'
      );

      if (cantidad === 0) {
        return nav;
      }

      var conteo = document.createElement('p');
      conteo.className = 'paginacion__conteo';
      var sustantivo = config.etiqueta
        ? (cantidad === 1 && total === 1 && /s$/.test(config.etiqueta)
          ? config.etiqueta.slice(0, -1)
          : config.etiqueta)
        : '';
      if (total === null || !Number.isFinite(total)) {
        conteo.textContent = 'Mostrando ' + cantidad + (sustantivo ? ' ' + sustantivo : '');
      } else {
        conteo.textContent =
          'Mostrando ' + (offset + 1) + '–' + (offset + cantidad) + ' de ' + total +
          (sustantivo ? ' ' + sustantivo : '');
      }

      var acciones = document.createElement('div');
      acciones.className = 'paginacion__acciones';

      acciones.appendChild(
        crearBoton('Anterior', offset <= 0, function () {
          if (typeof config.alCambiar === 'function') {
            config.alCambiar(Math.max(0, offset - limite));
          }
        })
      );

      var haySiguiente = total === null || !Number.isFinite(total)
        ? cantidad >= limite
        : offset + cantidad < total;
      acciones.appendChild(
        crearBoton('Siguiente', !haySiguiente, function () {
          if (typeof config.alCambiar === 'function') {
            config.alCambiar(offset + limite);
          }
        })
      );

      nav.appendChild(conteo);
      nav.appendChild(acciones);
      return nav;
    }
  };
}());
