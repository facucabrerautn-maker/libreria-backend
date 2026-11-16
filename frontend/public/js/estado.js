/*
 * Librería — Global de Programación III.
 * Módulo: js/estado.js
 * Responsabilidad: estado compartido en memoria de la interfaz.
 *
 * Guarda lo que la API no expone como listado (catálogos de editoriales y
 * géneros, autores consultados, clientes consultados), el borrador de la venta
 * en curso (se conserva entre vistas y ante un rechazo del servidor) y la
 * última venta confirmada, para mostrar los importes que devolvió la API.
 *
 * No persiste en el navegador: la fuente de verdad son PostgreSQL y la API.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  var editoriales = [];
  var generos = [];
  var autores = {};        // id -> {id, nombre}
  var clientes = {};       // id -> {id, nombre, email}
  var ordenClientes = [];  // ids en el orden en que se consultaron
  var suscriptores = [];

  var borrador = { clienteId: '', renglones: [] };
  var ultimaVenta = null;

  function clave(valor) {
    var numero = window.Libreria.api.idNumerico(valor);
    return numero === null ? null : String(numero);
  }

  function notificar() {
    suscriptores.forEach(function (fn) {
      try {
        fn();
      } catch (error) {
        /* Una vista que falla al repintarse no debe romper a las demás. */
      }
    });
  }

  window.Libreria.estado = {
    /* ------------------------- Catálogos ------------------------- */

    fijarEditoriales: function (lista) {
      editoriales = Array.isArray(lista) ? lista.slice() : [];
    },

    fijarGeneros: function (lista) {
      generos = Array.isArray(lista) ? lista.slice() : [];
    },

    listarEditoriales: function () {
      return editoriales.slice();
    },

    listarGeneros: function () {
      return generos.slice();
    },

    obtenerEditorial: function (id) {
      var buscado = clave(id);
      if (buscado === null) {
        return null;
      }
      for (var i = 0; i < editoriales.length; i += 1) {
        if (clave(editoriales[i] && editoriales[i].id) === buscado) {
          return editoriales[i];
        }
      }
      return null;
    },

    obtenerGenero: function (id) {
      var buscado = clave(id);
      if (buscado === null) {
        return null;
      }
      for (var i = 0; i < generos.length; i += 1) {
        if (clave(generos[i] && generos[i].id) === buscado) {
          return generos[i];
        }
      }
      return null;
    },

    /* -------------------------- Autores -------------------------- */

    recordarAutor: function (autor) {
      var buscado = clave(autor && autor.id);
      if (buscado !== null) {
        autores[buscado] = autor;
      }
      return autor;
    },

    obtenerAutor: function (id) {
      var buscado = clave(id);
      return buscado === null ? null : autores[buscado] || null;
    },

    /* -------------------------- Clientes ------------------------- */

    recordarCliente: function (cliente) {
      var buscado = clave(cliente && cliente.id);
      if (buscado === null) {
        return null;
      }
      clientes[buscado] = cliente;
      if (ordenClientes.indexOf(buscado) === -1) {
        ordenClientes.push(buscado);
      }
      return cliente;
    },

    obtenerCliente: function (id) {
      var buscado = clave(id);
      return buscado === null ? null : clientes[buscado] || null;
    },

    listarClientes: function () {
      return ordenClientes.map(function (id) {
        return clientes[id];
      }).filter(Boolean);
    },

    /* ------------------- Borrador de la venta -------------------- */

    borrador: function () {
      return borrador;
    },

    fijarClienteDelBorrador: function (id) {
      var buscado = clave(id);
      borrador.clienteId = buscado === null ? '' : buscado;
      notificar();
    },

    agregarRenglon: function (renglon) {
      borrador.renglones.push(renglon);
      notificar();
    },

    cambiarCantidad: function (libroId, cantidad) {
      var buscado = clave(libroId);
      borrador.renglones.forEach(function (renglon) {
        if (clave(renglon.libroId) === buscado) {
          renglon.cantidad = cantidad;
        }
      });
      notificar();
    },

    quitarRenglon: function (libroId) {
      var buscado = clave(libroId);
      borrador.renglones = borrador.renglones.filter(function (renglon) {
        return clave(renglon.libroId) !== buscado;
      });
      notificar();
    },

    limpiarBorrador: function () {
      borrador = { clienteId: '', renglones: [] };
      notificar();
    },

    /* --------------------- Última venta -------------------------- */

    fijarUltimaVenta: function (venta) {
      ultimaVenta = venta;
      notificar();
    },

    ultimaVenta: function () {
      return ultimaVenta;
    },

    /* --------------------- Suscripción --------------------------- */

    alCambiar: function (fn) {
      if (typeof fn === 'function') {
        suscriptores.push(fn);
      }
    },

    notificar: notificar
  };
}());
