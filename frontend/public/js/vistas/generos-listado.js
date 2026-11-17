/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/generos-listado.js
 * Responsabilidad: tabla de géneros registrados, armada con la página que
 * devolvió GET /generos/.
 *
 * No edita ni borra (la consigna no lo pide): solo muestra.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  var ENCABEZADOS = ['ID', 'Nombre'];

  function fila(genero) {
    var modelo = window.Libreria.modelo;
    return [
      genero.id === undefined || genero.id === null ? modelo.TEXTO_SIN_DATO : String(genero.id),
      modelo.texto(genero.nombre)
    ];
  }

  window.Libreria.generosListado = {
    crear: function (generos) {
      var lista = Array.isArray(generos) ? generos : [];
      return window.Libreria.ui.crearTabla(ENCABEZADOS, lista.map(fila), {
        claseTabla: 'tabla tabla-generos',
        titulo: 'Géneros registrados',
        vacia: 'Todavía no hay géneros registrados.'
      });
    }
  };
}());
