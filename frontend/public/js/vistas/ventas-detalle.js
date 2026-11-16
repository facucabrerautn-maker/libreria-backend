/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/ventas-detalle.js
 * Responsabilidad: detalle de una venta confirmada (renglones e importes).
 *
 * Se usa al confirmar (con la respuesta 201) y en el historial (con
 * GET /ventas/{id}). Los importes son los que devolvió la API: nunca se
 * recalculan desde el precio actual del catálogo.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  var ENCABEZADOS = ['Libro', 'Cantidad', 'Precio unitario', 'Subtotal'];

  window.Libreria.ventasDetalle = {
    /**
     * Devuelve un fragmento con el encabezado, los datos de la venta y la tabla
     * de renglones. `opciones.titulo` permite distinguir el origen (confirmación
     * o historial).
     */
    crear: function (venta, opciones) {
      var config = opciones || {};
      var modelo = window.Libreria.modelo;
      var ui = window.Libreria.ui;
      var registro = venta || {};
      var fragmento = document.createDocumentFragment();

      var titulo = document.createElement('h2');
      titulo.className = 'vista-ventas__detalle-titulo';
      titulo.tabIndex = -1;
      titulo.textContent = (config.titulo || 'Venta confirmada') +
        (registro.id !== undefined && registro.id !== null ? ' «' + registro.id + '»' : '');
      fragmento.appendChild(titulo);

      var datos = document.createElement('dl');
      datos.className = 'ficha';
      [
        ['Fecha', ui.formatearFecha(registro.fecha) || modelo.TEXTO_SIN_DATO],
        ['Cliente', modelo.nombreClienteDeVenta(registro)],
        ['Total', ui.formatearMonto(modelo.totalDeVenta(registro))]
      ].forEach(function (par) {
        var termino = document.createElement('dt');
        termino.className = 'ficha__etiqueta';
        termino.textContent = par[0];
        var valor = document.createElement('dd');
        valor.className = par[0] === 'Total' ? 'ficha__valor ficha__precio' : 'ficha__valor';
        valor.textContent = par[1];
        datos.appendChild(termino);
        datos.appendChild(valor);
      });
      fragmento.appendChild(datos);

      var renglones = modelo.renglonesDeVenta(registro);
      fragmento.appendChild(
        ui.crearTabla(
          ENCABEZADOS,
          renglones.map(function (renglon) {
            return [
              renglon.titulo,
              String(renglon.cantidad),
              ui.formatearMonto(renglon.precioUnitario),
              ui.formatearMonto(renglon.subtotal)
            ];
          }),
          {
            claseTabla: 'tabla tabla-historial',
            titulo: 'Renglones con importes históricos',
            vacia: 'La venta no informó renglones.'
          }
        )
      );

      return fragmento;
    }
  };
}());
