/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/libros-listado.js
 * Responsabilidad: tabla de libros registrados, armada con la página que
 * devolvió GET /libros/.
 *
 * No edita ni borra (la consigna no lo pide): solo muestra. Un libro sin género
 * aparece como «Sin clasificar».
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  var ENCABEZADOS = ['Título', 'ISBN', 'Editorial', 'Género', 'Precio', 'Stock'];
  var TEXTO_SIN_GENERO = 'Sin clasificar';
  var TEXTO_SIN_DATO = window.Libreria.modelo.TEXTO_SIN_DATO;

  function fila(libro) {
    var modelo = window.Libreria.modelo;
    var editorial = modelo.editorialDeLibro(libro);
    var genero = modelo.generoDeLibro(libro);
    return [
      modelo.texto(libro.titulo),
      modelo.texto(libro.isbn),
      editorial || TEXTO_SIN_DATO,
      genero || TEXTO_SIN_GENERO,
      window.Libreria.ui.formatearMonto(libro.precio),
      libro.stock === undefined || libro.stock === null ? TEXTO_SIN_DATO : String(modelo.numero(libro.stock))
    ];
  }

  window.Libreria.librosListado = {
    crear: function (libros) {
      var lista = Array.isArray(libros) ? libros : [];
      return window.Libreria.ui.crearTabla(
        ENCABEZADOS,
        lista.map(fila),
        {
          claseTabla: 'tabla tabla-libros',
          titulo: 'Libros registrados',
          vacia: 'Todavía no hay libros registrados.'
        }
      );
    }
  };
}());
