/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/generos-listado.js
 * Responsabilidad: tabla de géneros registrados, armada con la página que
 * devolvió GET /generos/.
 *
 * Cada fila ofrece Editar y, según el estado, Eliminar (baja lógica) o
 * Restaurar.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  var ENCABEZADOS = ['ID', 'Nombre', 'Estado', 'Acciones'];

  function accionDe(genero, opciones) {
    var acciones = [];
    if (typeof opciones.alEditar === 'function') {
      acciones.push({
        texto: 'Editar',
        clase: 'boton--secundario',
        etiqueta: 'Editar el género ' + genero.nombre,
        alHacer: function () { opciones.alEditar(genero); }
      });
    }
    if (genero.activo === false) {
      if (typeof opciones.alRestaurar === 'function') {
        acciones.push({
          texto: 'Restaurar',
          clase: 'boton--primario',
          etiqueta: 'Restaurar el género ' + genero.nombre,
          alHacer: function () { opciones.alRestaurar(genero); }
        });
      }
    } else if (typeof opciones.alEliminar === 'function') {
      acciones.push({
        texto: 'Eliminar',
        clase: 'boton--peligro',
        etiqueta: 'Dar de baja el género ' + genero.nombre,
        alHacer: function () { opciones.alEliminar(genero); }
      });
    }
    return window.Libreria.ui.crearAcciones(acciones);
  }

  function fila(genero, opciones) {
    var modelo = window.Libreria.modelo;
    return [
      genero.id === undefined || genero.id === null ? modelo.TEXTO_SIN_DATO : String(genero.id),
      modelo.texto(genero.nombre),
      genero.activo === false ? 'Eliminado' : 'Activo',
      accionDe(genero, opciones)
    ];
  }

  window.Libreria.generosListado = {
    crear: function (generos, opciones) {
      var lista = Array.isArray(generos) ? generos : [];
      var ajustes = opciones || {};
      return window.Libreria.ui.crearTabla(ENCABEZADOS, lista.map(function (genero) {
        return fila(genero, ajustes);
      }), {
        claseTabla: 'tabla tabla-generos',
        titulo: 'Géneros registrados',
        vacia: 'Todavía no hay géneros registrados.'
      });
    }
  };
}());
