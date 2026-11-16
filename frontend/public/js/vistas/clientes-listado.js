/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/clientes-listado.js
 * Responsabilidad: tabla de clientes conocidos (consultados por ID o dados de
 * alta en esta sesión).
 *
 * La API del TP no expone un listado de clientes: se consultan de a uno con
 * GET /clientes/{id}. La tabla muestra lo que la interfaz ya conoce.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  var ENCABEZADOS = ['ID', 'Nombre completo', 'Email'];

  window.Libreria.clientesListado = {
    crear: function (clientes) {
      var lista = Array.isArray(clientes) ? clientes : [];
      var filas = lista.map(function (cliente) {
        return [
          cliente.id === undefined || cliente.id === null ? '—' : String(cliente.id),
          window.Libreria.modelo.texto(cliente.nombre),
          window.Libreria.modelo.texto(cliente.email)
        ];
      });
      return window.Libreria.ui.crearTabla(ENCABEZADOS, filas, {
        claseTabla: 'tabla tabla-clientes',
        titulo: 'Clientes consultados',
        vacia: 'Todavía no consultaste clientes. Podés dar de alta uno nuevo o buscarlo por ID.'
      });
    }
  };
}());
