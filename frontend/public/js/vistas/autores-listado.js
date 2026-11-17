/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/autores-listado.js
 * Responsabilidad: tabla de autores registrados, armada con la página que
 * devolvió GET /autores/.
 *
 * Cada fila ofrece Editar y, según el estado, Eliminar (baja lógica) o
 * Restaurar. La nacionalidad es opcional: si no está cargada se muestra el
 * guion de «sin dato».
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  var ENCABEZADOS = ['ID', 'Nombre', 'Nacionalidad', 'Estado', 'Acciones'];

  function accionDe(autor, opciones) {
    var acciones = [];
    if (typeof opciones.alEditar === 'function') {
      acciones.push({
        texto: 'Editar',
        clase: 'boton--secundario',
        etiqueta: 'Editar el autor ' + autor.nombre,
        alHacer: function () { opciones.alEditar(autor); }
      });
    }
    if (autor.activo === false) {
      if (typeof opciones.alRestaurar === 'function') {
        acciones.push({
          texto: 'Restaurar',
          clase: 'boton--primario',
          etiqueta: 'Restaurar el autor ' + autor.nombre,
          alHacer: function () { opciones.alRestaurar(autor); }
        });
      }
    } else if (typeof opciones.alEliminar === 'function') {
      acciones.push({
        texto: 'Eliminar',
        clase: 'boton--peligro',
        etiqueta: 'Dar de baja el autor ' + autor.nombre,
        alHacer: function () { opciones.alEliminar(autor); }
      });
    }
    return window.Libreria.ui.crearAcciones(acciones);
  }

  function fila(autor, opciones) {
    var modelo = window.Libreria.modelo;
    return [
      autor.id === undefined || autor.id === null ? modelo.TEXTO_SIN_DATO : String(autor.id),
      modelo.texto(autor.nombre),
      modelo.texto(autor.nacionalidad) || modelo.TEXTO_SIN_DATO,
      autor.activo === false ? 'Eliminado' : 'Activo',
      accionDe(autor, opciones)
    ];
  }

  window.Libreria.autoresListado = {
    crear: function (autores, opciones) {
      var lista = Array.isArray(autores) ? autores : [];
      var ajustes = opciones || {};
      return window.Libreria.ui.crearTabla(ENCABEZADOS, lista.map(function (autor) {
        return fila(autor, ajustes);
      }), {
        claseTabla: 'tabla tabla-autores',
        titulo: 'Autores registrados',
        vacia: 'Todavía no hay autores registrados.'
      });
    }
  };
}());
