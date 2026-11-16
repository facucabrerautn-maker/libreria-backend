/*
 * Librería — Global de Programación III.
 * Módulo: js/modelo.js
 * Responsabilidad: leer registros de la API sin acoplarse a un único formato.
 *
 * FastAPI puede devolver el nombre de la editorial anidado (`editorial.nombre`),
 * como campo plano (`editorial_nombre`) o solo el id. Las vistas no deberían
 * conocer esas variantes: estas funciones devuelven siempre texto listo para
 * mostrar y resuelven los nombres contra el catálogo cargado en estado.js.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  var TEXTO_SIN_DATO = '—';

  function texto(valor) {
    return valor === null || valor === undefined ? '' : String(valor).trim();
  }

  function numero(valor) {
    var convertido = Number(valor);
    return Number.isFinite(convertido) ? convertido : 0;
  }

  function primerTexto() {
    for (var i = 0; i < arguments.length; i += 1) {
      var valor = texto(arguments[i]);
      if (valor !== '') {
        return valor;
      }
    }
    return '';
  }

  /** Nombre de la editorial: anidada, plana o resuelta por id en el catálogo. */
  function editorialDeLibro(libro) {
    var registro = libro || {};
    var anidada = registro.editorial && registro.editorial.nombre;
    var directo = primerTexto(anidada, registro.editorial_nombre);
    if (directo !== '') {
      return directo;
    }
    var catalogo = window.Libreria.estado.obtenerEditorial(registro.editorial_id || registro.editorialId);
    return catalogo ? primerTexto(catalogo.nombre) : '';
  }

  /** Nombre del género, o null cuando el libro está «Sin clasificar». */
  function generoDeLibro(libro) {
    var registro = libro || {};
    if (registro.genero_id === null || registro.genero_id === undefined) {
      if (!registro.genero) {
        return null;
      }
    }
    var anidada = registro.genero && registro.genero.nombre;
    var directo = primerTexto(anidada, registro.genero_nombre);
    if (directo !== '') {
      return directo;
    }
    var catalogo = window.Libreria.estado.obtenerGenero(registro.genero_id || registro.generoId);
    return catalogo ? primerTexto(catalogo.nombre) : null;
  }

  /**
   * Autorías de un libro del detalle: [{ autorId, nombre, rol, orden }].
   * Acepta `autores`, `autorias` o una lista de ids.
   */
  function autoresDeLibro(libro) {
    var registro = libro || {};
    var lista = registro.autores || registro.autorias || [];
    if (!Array.isArray(lista)) {
      return [];
    }
    return lista
      .map(function (entrada, indice) {
        if (typeof entrada === 'number' || typeof entrada === 'string') {
          return { autorId: entrada, nombre: '', rol: '', orden: indice + 1 };
        }
        var autor = entrada && entrada.autor ? entrada.autor : null;
        var id = entrada && (entrada.autor_id || entrada.autorId || (autor && autor.id) || entrada.id);
        var nombre = primerTexto(
          entrada && entrada.nombre,
          autor && autor.nombre,
          entrada && entrada.autor_nombre
        );
        return {
          autorId: id === undefined ? null : id,
          nombre: nombre,
          rol: primerTexto(entrada && entrada.rol),
          orden: numero(entrada && entrada.orden) || indice + 1
        };
      })
      .filter(function (autoria) {
        return autoria.autorId !== null || autoria.nombre !== '';
      });
  }

  /** Nombre del cliente de una venta, con respaldo por id en la caché. */
  function nombreClienteDeVenta(venta) {
    var registro = venta || {};
    var anidado = registro.cliente && registro.cliente.nombre;
    var directo = primerTexto(anidado, registro.cliente_nombre, registro.clienteNombre);
    if (directo !== '') {
      return directo;
    }
    var cliente = window.Libreria.estado.obtenerCliente(registro.cliente_id || registro.clienteId);
    if (cliente) {
      return primerTexto(cliente.nombre);
    }
    var id = texto(registro.cliente_id || registro.clienteId);
    return id === '' ? 'Cliente sin identificar' : 'Cliente #' + id;
  }

  /** Renglones de una venta normalizados para la tabla de detalle. */
  function renglonesDeVenta(venta) {
    var registro = venta || {};
    var lista = Array.isArray(registro.renglones) ? registro.renglones : [];
    return lista.map(function (renglon) {
      var libro = (renglon && renglon.libro) || {};
      var libroId = renglon && (renglon.libro_id || renglon.libroId || libro.id);
      var cantidad = numero(renglon && renglon.cantidad);
      var precioUnitario = numero(
        renglon && (renglon.precio_unitario !== undefined ? renglon.precio_unitario : renglon.precioUnitario)
      );
      var subtotal =
        renglon && renglon.subtotal !== undefined && renglon.subtotal !== null
          ? numero(renglon.subtotal)
          : Math.round(cantidad * precioUnitario * 100) / 100;
      return {
        libroId: libroId === undefined ? null : libroId,
        titulo: primerTexto(
          renglon && renglon.titulo,
          libro.titulo,
          renglon && renglon.libro_titulo,
          libroId === null || libroId === undefined ? '' : 'Libro #' + libroId
        ),
        cantidad: cantidad,
        precioUnitario: precioUnitario,
        subtotal: subtotal
      };
    });
  }

  /** Total de la venta: el del servidor o la suma de los subtotales. */
  function totalDeVenta(venta) {
    var registro = venta || {};
    if (registro.total !== undefined && registro.total !== null) {
      return numero(registro.total);
    }
    return renglonesDeVenta(registro).reduce(function (suma, renglon) {
      return Math.round((suma + renglon.subtotal) * 100) / 100;
    }, 0);
  }

  window.Libreria.modelo = {
    texto: texto,
    numero: numero,
    editorialDeLibro: editorialDeLibro,
    generoDeLibro: generoDeLibro,
    autoresDeLibro: autoresDeLibro,
    nombreClienteDeVenta: nombreClienteDeVenta,
    renglonesDeVenta: renglonesDeVenta,
    totalDeVenta: totalDeVenta,
    TEXTO_SIN_DATO: TEXTO_SIN_DATO
  };
}());
