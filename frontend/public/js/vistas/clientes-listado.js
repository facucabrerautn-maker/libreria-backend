/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/clientes-listado.js
 * Responsabilidad: tabla de clientes, armada con la página que devolvió
 * GET /clientes/.
 *
 * Cada fila ofrece Editar y, según el estado, Eliminar (baja lógica) o
 * Restaurar.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  var ENCABEZADOS = ['ID', 'Nombre completo', 'Email', 'Estado', 'Acciones'];

  function accionDe(cliente, opciones) {
    var acciones = [];
    if (typeof opciones.alEditar === 'function') {
      acciones.push({
        texto: 'Editar',
        clase: 'boton--secundario',
        etiqueta: 'Editar el cliente ' + cliente.nombre,
        alHacer: function () { opciones.alEditar(cliente); }
      });
    }
    if (cliente.activo === false) {
      if (typeof opciones.alRestaurar === 'function') {
        acciones.push({
          texto: 'Restaurar',
          clase: 'boton--primario',
          etiqueta: 'Restaurar el cliente ' + cliente.nombre,
          alHacer: function () { opciones.alRestaurar(cliente); }
        });
      }
    } else if (typeof opciones.alEliminar === 'function') {
      acciones.push({
        texto: 'Eliminar',
        clase: 'boton--peligro',
        etiqueta: 'Dar de baja el cliente ' + cliente.nombre,
        alHacer: function () { opciones.alEliminar(cliente); }
      });
    }
    return window.Libreria.ui.crearAcciones(acciones);
  }

  function fila(cliente, opciones) {
    var modelo = window.Libreria.modelo;
    return [
      cliente.id === undefined || cliente.id === null ? modelo.TEXTO_SIN_DATO : String(cliente.id),
      modelo.texto(cliente.nombre),
      modelo.texto(cliente.email),
      cliente.activo === false ? 'Eliminado' : 'Activo',
      accionDe(cliente, opciones)
    ];
  }

  window.Libreria.clientesListado = {
    crear: function (clientes, opciones) {
      var lista = Array.isArray(clientes) ? clientes : [];
      var ajustes = opciones || {};
      return window.Libreria.ui.crearTabla(ENCABEZADOS, lista.map(function (cliente) {
        return fila(cliente, ajustes);
      }), {
        claseTabla: 'tabla tabla-clientes',
        titulo: 'Clientes registrados',
        vacia: 'Todavía no hay clientes registrados.'
      });
    }
  };
}());
