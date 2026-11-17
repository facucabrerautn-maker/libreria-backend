/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/libros-listado.js
 * Responsabilidad: tabla de libros registrados, armada con la página que
 * devolvió GET /libros/.
 *
 * Cada fila ofrece Editar y, según el estado, Eliminar (baja lógica) o
 * Restaurar. Un libro sin género aparece como «Sin clasificar».
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  var ENCABEZADOS = ['Título', 'ISBN', 'Editorial', 'Género', 'Precio', 'Stock', 'Estado', 'Acciones'];
  var TEXTO_SIN_GENERO = 'Sin clasificar';
  var TEXTO_SIN_DATO = window.Libreria.modelo.TEXTO_SIN_DATO;

  function accionDe(libro, opciones) {
    var acciones = [];
    if (typeof opciones.alEditar === 'function') {
      acciones.push({
        texto: 'Editar',
        clase: 'boton--secundario',
        etiqueta: 'Editar el libro ' + libro.titulo,
        alHacer: function () { opciones.alEditar(libro); }
      });
    }
    if (libro.activo === false) {
      if (typeof opciones.alRestaurar === 'function') {
        acciones.push({
          texto: 'Restaurar',
          clase: 'boton--primario',
          etiqueta: 'Restaurar el libro ' + libro.titulo,
          alHacer: function () { opciones.alRestaurar(libro); }
        });
      }
    } else if (typeof opciones.alEliminar === 'function') {
      acciones.push({
        texto: 'Eliminar',
        clase: 'boton--peligro',
        etiqueta: 'Dar de baja el libro ' + libro.titulo,
        alHacer: function () { opciones.alEliminar(libro); }
      });
    }
    return window.Libreria.ui.crearAcciones(acciones);
  }

  function fila(libro, opciones) {
    var modelo = window.Libreria.modelo;
    var editorial = modelo.editorialDeLibro(libro);
    var genero = modelo.generoDeLibro(libro);
    return [
      modelo.texto(libro.titulo),
      modelo.texto(libro.isbn),
      editorial || TEXTO_SIN_DATO,
      genero || TEXTO_SIN_GENERO,
      window.Libreria.ui.formatearMonto(libro.precio),
      libro.stock === undefined || libro.stock === null ? TEXTO_SIN_DATO : String(modelo.numero(libro.stock)),
      libro.activo === false ? 'Eliminado' : 'Activo',
      accionDe(libro, opciones)
    ];
  }

  window.Libreria.librosListado = {
    crear: function (libros, opciones) {
      var lista = Array.isArray(libros) ? libros : [];
      var ajustes = opciones || {};
      return window.Libreria.ui.crearTabla(
        ENCABEZADOS,
        lista.map(function (libro) {
          return fila(libro, ajustes);
        }),
        {
          claseTabla: 'tabla tabla-libros',
          titulo: 'Libros registrados',
          vacia: 'Todavía no hay libros registrados.'
        }
      );
    }
  };
}());
