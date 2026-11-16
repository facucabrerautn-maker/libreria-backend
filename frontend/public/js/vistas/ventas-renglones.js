/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/ventas-renglones.js
 * Responsabilidad: tabla editable del borrador de venta.
 *
 * Cada renglón muestra libro, ISBN, cantidad editable, precio unitario del
 * catálogo (vista previa del borrador) y subtotal. Quitar un renglón o cambiar
 * la cantidad avisa a la vista, que actualiza el estado y el total.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  var ENCABEZADOS = ['Libro', 'ISBN', 'Cantidad', 'Precio unitario', 'Subtotal', 'Quitar'];

  function crearEntrada(renglon, alCambiarCantidad) {
    var entrada = document.createElement('input');
    entrada.type = 'number';
    entrada.min = '1';
    entrada.step = '1';
    entrada.inputMode = 'numeric';
    entrada.className = 'control control--compacto numero';
    entrada.value = String(renglon.cantidad);
    entrada.setAttribute('aria-label', 'Cantidad de ' + renglon.titulo);
    entrada.addEventListener('change', function () {
      var cantidad = Number(entrada.value);
      if (!window.Libreria.validaciones.cantidadValida(cantidad)) {
        entrada.value = String(renglon.cantidad);
        return;
      }
      alCambiarCantidad(renglon.libroId, cantidad);
    });
    return entrada;
  }

  function crearQuitar(renglon, alQuitar) {
    var boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'boton boton--secundario';
    boton.textContent = 'Quitar';
    boton.setAttribute('aria-label', 'Quitar ' + renglon.titulo + ' de la venta');
    boton.addEventListener('click', function () {
      alQuitar(renglon.libroId);
    });
    return boton;
  }

  window.Libreria.ventasRenglones = {
    crear: function (renglones, opciones) {
      var config = opciones || {};
      var ui = window.Libreria.ui;
      var lista = Array.isArray(renglones) ? renglones : [];

      var filas = lista.map(function (renglon) {
        return [
          renglon.titulo,
          renglon.isbn || '—',
          crearEntrada(renglon, config.alCambiarCantidad || function () {}),
          ui.formatearMonto(renglon.precioUnitario),
          ui.formatearMonto(window.Libreria.validaciones.calcularSubtotal(renglon)),
          crearQuitar(renglon, config.alQuitar || function () {})
        ];
      });

      return ui.crearTabla(ENCABEZADOS, filas, {
        claseTabla: 'tabla tabla-renglones',
        titulo: 'Renglones de la venta en curso',
        vacia: 'No hay renglones en la venta todavía.'
      });
    }
  };
}());
