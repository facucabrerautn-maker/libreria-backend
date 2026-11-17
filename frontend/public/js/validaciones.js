/*
 * Librería — Global de Programación III.
 * Módulo: js/validaciones.js
 * Responsabilidad: funciones puras de validación y cálculo.
 *
 * Valida lo que se puede comprobar sin servidor: campos obligatorios, formatos,
 * importes, cantidades y renglones repetidos. La unicidad de ISBN y de email y
 * la existencia de editorial, género, autor, cliente y libro las decide la API
 * (409 / 422), y su mensaje se muestra tal como llega.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  var EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function texto(valor) {
    return valor === null || valor === undefined ? '' : String(valor).trim();
  }

  function numero(valor) {
    if (typeof valor === 'number') {
      return Number.isFinite(valor) ? valor : null;
    }
    var limpio = texto(valor);
    if (limpio === '') {
      return null;
    }
    var convertido = Number(limpio);
    return Number.isFinite(convertido) ? convertido : null;
  }

  function cantidadValida(valor) {
    var convertido = numero(valor);
    return convertido !== null && Number.isInteger(convertido) && convertido > 0;
  }

  function subtotalDe(renglon) {
    if (!renglon || typeof renglon !== 'object') {
      return 0;
    }
    var cantidad = numero(renglon.cantidad);
    var precio = numero(renglon.precioUnitario);
    if (cantidad === null || precio === null) {
      return 0;
    }
    return Math.round(cantidad * precio * 100) / 100;
  }

  window.Libreria.validaciones = {
    /** Errores de alta de un libro, uno por campo, antes de llamar a la API. */
    validarLibro: function (contexto) {
      var datos = contexto || {};
      var errores = [];

      if (texto(datos.titulo) === '') {
        errores.push({ campo: 'titulo', mensaje: 'El título es obligatorio.' });
      }

      if (texto(datos.isbn) === '') {
        errores.push({ campo: 'isbn', mensaje: 'El ISBN es obligatorio.' });
      }

      var precio = numero(datos.precio);
      if (precio === null || precio <= 0) {
        errores.push({
          campo: 'precio',
          mensaje: 'El precio debe ser un número mayor que cero (por ejemplo 1500 o 1500.50).'
        });
      }

      var stock = numero(datos.stock);
      if (stock === null || !Number.isInteger(stock) || stock < 0) {
        errores.push({
          campo: 'stock',
          mensaje: 'El stock debe ser un número entero mayor o igual a cero.'
        });
      }

      if (texto(datos.editorialId) === '') {
        errores.push({ campo: 'editorialId', mensaje: 'Elegí una editorial de la lista.' });
      }

      var autores = Array.isArray(datos.autores) ? datos.autores : [];
      if (autores.length === 0) {
        errores.push({
          campo: 'autores',
          mensaje: 'Agregá al menos un autor, verificando su ID contra la API.'
        });
      } else {
        var invalido = autores.some(function (autoria) {
          return !autoria || window.Libreria.api.idNumerico(autoria.autorId) === null;
        });
        if (invalido) {
          errores.push({ campo: 'autores', mensaje: 'Alguna autoría no tiene un ID válido.' });
        }
      }

      return errores;
    },

    /** Errores de alta de un autor antes de llamar a la API. */
    validarAutor: function (contexto) {
      var datos = contexto || {};
      var errores = [];

      if (texto(datos.nombre) === '') {
        errores.push({ campo: 'nombre', mensaje: 'El nombre del autor es obligatorio.' });
      }

      return errores;
    },

    /** Errores de alta de un género antes de llamar a la API. */
    validarGenero: function (contexto) {
      var datos = contexto || {};
      var errores = [];

      if (texto(datos.nombre) === '') {
        errores.push({ campo: 'nombre', mensaje: 'El nombre del género es obligatorio.' });
      }

      return errores;
    },

    /** Errores de alta de un cliente antes de llamar a la API. */
    validarCliente: function (contexto) {
      var datos = contexto || {};
      var errores = [];

      if (texto(datos.nombre) === '') {
        errores.push({ campo: 'nombre', mensaje: 'El nombre completo es obligatorio.' });
      }

      var email = texto(datos.email);
      if (email === '') {
        errores.push({ campo: 'email', mensaje: 'El email es obligatorio.' });
      } else if (!EMAIL_VALIDO.test(email)) {
        errores.push({
          campo: 'email',
          mensaje: 'El email no tiene un formato válido (ejemplo: nombre@example.com).'
        });
      }

      return errores;
    },

    /** Errores de la venta en curso antes de enviarla a la API. */
    validarVenta: function (contexto) {
      var datos = contexto || {};
      var errores = [];

      if (window.Libreria.api.idNumerico(datos.clienteId) === null) {
        errores.push({ campo: 'clienteId', mensaje: 'Elegí un cliente para la venta.' });
      }

      var renglones = Array.isArray(datos.renglones) ? datos.renglones : [];
      if (renglones.length === 0) {
        errores.push({
          campo: 'renglones',
          mensaje: 'Agregá al menos un libro a la venta antes de confirmarla.'
        });
        return errores;
      }

      var hayCantidadInvalida = renglones.some(function (renglon) {
        return !cantidadValida(renglon && renglon.cantidad);
      });
      if (hayCantidadInvalida) {
        errores.push({
          campo: 'renglones',
          mensaje: 'Las cantidades deben ser números enteros mayores que cero.'
        });
      }

      var vistos = {};
      var hayDuplicado = renglones.some(function (renglon) {
        var id = window.Libreria.api.idNumerico(renglon && renglon.libroId);
        var clave = id === null ? '' : String(id);
        if (clave === '' || vistos[clave]) {
          return true;
        }
        vistos[clave] = true;
        return false;
      });
      if (hayDuplicado) {
        errores.push({
          campo: 'renglones',
          mensaje: 'Cada libro puede aparecer una sola vez en la venta.'
        });
      }

      return errores;
    },

    cantidadValida: cantidadValida,
    calcularSubtotal: subtotalDe,

    /** Total del borrador: suma de los subtotales, con dos decimales. */
    calcularTotal: function (renglones) {
      var lista = Array.isArray(renglones)
        ? renglones
        : (renglones && Array.isArray(renglones.renglones) ? renglones.renglones : []);
      var total = lista.reduce(function (suma, renglon) {
        return suma + subtotalDe(renglon);
      }, 0);
      return Math.round(total * 100) / 100;
    }
  };
}());
