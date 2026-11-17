/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/autores-listado.js
 * Responsabilidad: tabla de autores registrados, armada con la página que
 * devolvió GET /autores/.
 *
 * La nacionalidad es opcional: si no está cargada se muestra el guion de
 * «sin dato». No edita ni borra (la consigna no lo pide): solo muestra.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  var ENCABEZADOS = ['ID', 'Nombre', 'Nacionalidad'];

  function fila(autor) {
    var modelo = window.Libreria.modelo;
    return [
      autor.id === undefined || autor.id === null ? modelo.TEXTO_SIN_DATO : String(autor.id),
      modelo.texto(autor.nombre),
      modelo.texto(autor.nacionalidad) || modelo.TEXTO_SIN_DATO
    ];
  }

  window.Libreria.autoresListado = {
    crear: function (autores) {
      var lista = Array.isArray(autores) ? autores : [];
      return window.Libreria.ui.crearTabla(ENCABEZADOS, lista.map(fila), {
        claseTabla: 'tabla tabla-autores',
        titulo: 'Autores registrados',
        vacia: 'Todavía no hay autores registrados.'
      });
    }
  };
}());
