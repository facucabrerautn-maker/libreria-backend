/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/editoriales-listado.js
 * Responsabilidad: tabla de editoriales registradas, armada con la página que
 * devolvió GET /editoriales/.
 *
 * Cada fila ofrece Editar. No hay Eliminar ni Restaurar: la API de editoriales
 * no expone baja lógica (solo POST, GET y PATCH). El país es opcional: si no
 * está cargado se muestra el guion de «sin dato».
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  var ENCABEZADOS = ['ID', 'Nombre', 'País', 'Acciones'];

  function accionDe(editorial, opciones) {
    var acciones = [];
    if (typeof opciones.alEditar === 'function') {
      acciones.push({
        texto: 'Editar',
        clase: 'boton--secundario',
        etiqueta: 'Editar la editorial ' + editorial.nombre,
        alHacer: function () { opciones.alEditar(editorial); }
      });
    }
    return window.Libreria.ui.crearAcciones(acciones);
  }

  function fila(editorial, opciones) {
    var modelo = window.Libreria.modelo;
    return [
      editorial.id === undefined || editorial.id === null
        ? modelo.TEXTO_SIN_DATO
        : String(editorial.id),
      modelo.texto(editorial.nombre),
      modelo.texto(editorial.pais) || modelo.TEXTO_SIN_DATO,
      accionDe(editorial, opciones)
    ];
  }

  window.Libreria.editorialesListado = {
    crear: function (editoriales, opciones) {
      var lista = Array.isArray(editoriales) ? editoriales : [];
      var ajustes = opciones || {};
      return window.Libreria.ui.crearTabla(ENCABEZADOS, lista.map(function (editorial) {
        return fila(editorial, ajustes);
      }), {
        claseTabla: 'tabla tabla-editoriales',
        titulo: 'Editoriales registradas',
        vacia: 'Todavía no hay editoriales registradas.'
      });
    }
  };
}());
