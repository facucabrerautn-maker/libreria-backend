/*
 * Librería — Global de Programación III.
 * Módulo: js/api.js
 * Responsabilidad: único punto de contacto con la API FastAPI.
 *
 * Centraliza la URL base (/api, según el proxy Nginx), conserva la barra final
 * de las rutas de colección, agrega los parámetros de paginación y normaliza
 * las respuestas y los errores. Ninguna vista llama a fetch por su cuenta.
 *
 * Los endpoints devuelven siempre { ok, estado, datos } o
 * { ok: false, estado, error, cuerpo } para que la vista decida qué mostrar.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  /* Base pública: Nginx reenvía /api/ hacia API_UPSTREAM. */
  var BASE = '/api';

  /* Tiempo máximo de espera de una petición (ms). */
  var TIEMPO_LIMITE = 15000;

  /*
   * Contrato del backend. Si tu API nombra distinto algún campo, se cambia
   * acá y nada más (queda documentado en el README).
   */
  var CONTRATO = {
    campoStock: 'stock', // 'stock' si el POST /libros/ usa `stock`; 'stock_inicial' si usa ese nombre
    campoAutores: 'autores', // nombre del array de autorías en POST /libros/ (`autores` o `autorias`)
    limite: 20
  };

  var TEXTO_SIN_CONEXION =
    'No se pudo conectar con la API. Verificá que el backend esté en ejecución y que el proxy /api esté configurado.';
  var TEXTO_TIEMPO = 'La API tardó demasiado en responder. Intentá de nuevo.';

  /** Arma una URL de la API conservando la barra final de las colecciones. */
  function url(ruta) {
    var limpia = ruta === null || ruta === undefined ? '' : String(ruta).trim();
    if (limpia === '') {
      return BASE + '/';
    }
    if (limpia.charAt(0) === '/') {
      limpia = limpia.slice(1);
    }
    return BASE + '/' + limpia;
  }

  /** Agrega querystring omitiendo los valores vacíos o indefinidos. */
  function conParametros(destino, parametros) {
    var pares = [];
    var objeto = parametros || {};
    Object.keys(objeto).forEach(function (clave) {
      var valor = objeto[clave];
      if (valor === null || valor === undefined || valor === '') {
        return;
      }
      pares.push(encodeURIComponent(clave) + '=' + encodeURIComponent(valor));
    });
    if (pares.length === 0) {
      return destino;
    }
    return destino + (destino.indexOf('?') === -1 ? '?' : '&') + pares.join('&');
  }

  /** Extrae el mensaje legible de un error 409 / 422 / 500 de FastAPI. */
  function mensajeDeError(estado, cuerpo) {
    var detalle = cuerpo && typeof cuerpo === 'object' ? cuerpo.detail : null;
    if (Array.isArray(detalle)) {
      return detalle
        .map(function (item) {
          var campo = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : '';
          return (campo ? campo + ': ' : '') + (item.msg || 'dato inválido');
        })
        .join('. ');
    }
    if (typeof detalle === 'string' && detalle !== '') {
      return detalle;
    }
    if (estado === 401 || estado === 403) {
      return 'La API rechazó la operación por permisos (HTTP ' + estado + ').';
    }
    if (estado === 404) {
      return 'No se encontró el registro pedido (HTTP 404).';
    }
    if (estado >= 500) {
      return 'La API respondió con un error interno (HTTP ' + estado + ').';
    }
    return 'La API respondió con un error (HTTP ' + estado + ').';
  }

  /** Petición JSON con tiempo límite y errores normalizados. */
  async function pedir(destino, opciones) {
    var config = opciones || {};
    var controlador = typeof AbortController === 'function' ? new AbortController() : null;
    var temporizador = null;

    if (controlador) {
      temporizador = window.setTimeout(function () {
        controlador.abort();
      }, TIEMPO_LIMITE);
    }

    var cabeceras = { Accept: 'application/json' };
    if (config.cuerpo !== undefined) {
      cabeceras['Content-Type'] = 'application/json';
    }

    try {
      var respuesta = await fetch(destino, {
        method: config.metodo || 'GET',
        headers: cabeceras,
        body: config.cuerpo === undefined ? undefined : JSON.stringify(config.cuerpo),
        credentials: 'same-origin',
        signal: controlador ? controlador.signal : undefined
      });

      var tipo = respuesta.headers.get('content-type') || '';
      var cuerpo = null;
      if (respuesta.status !== 204) {
        cuerpo = tipo.indexOf('json') !== -1 ? await respuesta.json() : await respuesta.text();
      }

      if (!respuesta.ok) {
        return {
          ok: false,
          estado: respuesta.status,
          cuerpo: cuerpo,
          error: mensajeDeError(respuesta.status, cuerpo)
        };
      }

      return { ok: true, estado: respuesta.status, datos: cuerpo };
    } catch (error) {
      if (error && error.name === 'AbortError') {
        return { ok: false, estado: 0, error: TEXTO_TIEMPO, cuerpo: null };
      }
      return { ok: false, estado: 0, error: TEXTO_SIN_CONEXION, cuerpo: null };
    } finally {
      if (temporizador !== null) {
        window.clearTimeout(temporizador);
      }
    }
  }

  /** Normaliza un listado: acepta un array o el envoltorio { items, total }. */
  function normalizarLista(datos) {
    if (Array.isArray(datos)) {
      return { items: datos, total: null };
    }
    if (datos && Array.isArray(datos.items)) {
      var total = Number(datos.total);
      return { items: datos.items, total: Number.isFinite(total) ? total : datos.items.length };
    }
    if (datos && Array.isArray(datos.results)) {
      return { items: datos.results, total: null };
    }
    return { items: [], total: 0 };
  }

  /** Convierte un id a entero positivo o null (los ids de la API son enteros). */
  function idNumerico(valor) {
    var texto = valor === null || valor === undefined ? '' : String(valor).trim();
    if (texto === '') {
      return null;
    }
    var numero = Number(texto);
    if (!Number.isInteger(numero) || numero <= 0) {
      return null;
    }
    return numero;
  }

  /** Texto recortado; devuelve '' para null o undefined. */
  function textoRecortado(valor) {
    return valor === null || valor === undefined ? '' : String(valor).trim();
  }

  /** Cuerpo común de POST y PATCH de libro (mismos campos editables). */
  function cuerpoLibro(libro) {
    var datos = libro || {};
    var cuerpo = {
      titulo: textoRecortado(datos.titulo),
      isbn: textoRecortado(datos.isbn),
      precio: Number(datos.precio),
      editorial_id: Number(datos.editorialId),
      genero_id: datos.generoId === null || datos.generoId === '' ? null : Number(datos.generoId)
    };
    cuerpo[CONTRATO.campoStock] = Number(datos.stock);
    cuerpo[CONTRATO.campoAutores] = (datos.autores || []).map(function (autoria) {
      return {
        autor_id: Number(autoria.autorId),
        rol: autoria.rol || 'autor',
        orden: Number(autoria.orden) || 1
      };
    });
    return cuerpo;
  }

  /** Cuerpo común de POST y PATCH de editorial (nombre obligatorio, país opcional). */
  function cuerpoEditorial(editorial) {
    var datos = editorial || {};
    var pais = textoRecortado(datos.pais);
    return {
      nombre: textoRecortado(datos.nombre),
      pais: pais === '' ? null : pais
    };
  }

  /** Petición DELETE normalizada (204 sin cuerpo). */
  function eliminar(ruta) {
    return pedir(url(ruta), { metodo: 'DELETE' });
  }

  /** Restaura una baja lógica con PATCH { activo: true }. */
  function restaurar(ruta) {
    return pedir(url(ruta), { metodo: 'PATCH', cuerpo: { activo: true } });
  }

  window.Libreria.api = {
    CONTRATO: CONTRATO,
    idNumerico: idNumerico,
    normalizarLista: normalizarLista,

    /* ----------------------------- Libros ----------------------------- */

    /** GET /libros/ con título parcial y paginación limit/offset. */
    listarLibros: async function (opciones) {
      var ajustes = opciones || {};
      var destino = conParametros(url('libros/'), {
        titulo: ajustes.titulo,
        limit: ajustes.limit === undefined ? CONTRATO.limite : ajustes.limit,
        offset: ajustes.offset === undefined ? 0 : ajustes.offset,
        incluir_inactivos: ajustes.incluirInactivos ? 'true' : ''
      });
      var resultado = await pedir(destino);
      if (!resultado.ok) {
        return resultado;
      }
      return { ok: true, estado: resultado.estado, datos: normalizarLista(resultado.datos) };
    },

    /** GET /libros/{id}: detalle con autorías. */
    obtenerLibro: function (id) {
      return pedir(url('libros/' + encodeURIComponent(id)));
    },

    /** POST /libros/ con stock, género opcional y al menos una autoría. */
    crearLibro: function (libro) {
      return pedir(url('libros/'), { metodo: 'POST', cuerpo: cuerpoLibro(libro) });
    },

    /** PATCH /libros/{id}: actualiza los campos editables (incluye activo al restaurar). */
    actualizarLibro: function (id, libro) {
      return pedir(url('libros/' + encodeURIComponent(id)), {
        metodo: 'PATCH',
        cuerpo: cuerpoLibro(libro)
      });
    },

    /** DELETE /libros/{id}: baja lógica. */
    eliminarLibro: function (id) {
      return eliminar('libros/' + encodeURIComponent(id));
    },

    /** PATCH /libros/{id} con activo=true: restaura la baja lógica. */
    restaurarLibro: function (id) {
      return restaurar('libros/' + encodeURIComponent(id));
    },

    /* --------------------------- Catálogos ---------------------------- */

    /** GET /editoriales/ con paginación limit/offset (default 100 para catálogos). */
    listarEditoriales: async function (opciones) {
      var ajustes = opciones || {};
      var destino = conParametros(url('editoriales/'), {
        limit: ajustes.limit === undefined ? 100 : ajustes.limit,
        offset: ajustes.offset === undefined ? 0 : ajustes.offset
      });
      var resultado = await pedir(destino);
      if (!resultado.ok) {
        return resultado;
      }
      return { ok: true, estado: resultado.estado, datos: normalizarLista(resultado.datos) };
    },

    /** POST /editoriales/: nombre obligatorio y único (409 si ya existe). */
    crearEditorial: function (editorial) {
      return pedir(url('editoriales/'), {
        metodo: 'POST',
        cuerpo: cuerpoEditorial(editorial)
      });
    },

    /** PATCH /editoriales/{id}: actualiza nombre y país. */
    actualizarEditorial: function (id, editorial) {
      return pedir(url('editoriales/' + encodeURIComponent(id)), {
        metodo: 'PATCH',
        cuerpo: cuerpoEditorial(editorial)
      });
    },

    /** GET /generos/ */
    listarGeneros: async function (opciones) {
      var ajustes = opciones || {};
      var destino = conParametros(url('generos/'), {
        limit: ajustes.limit === undefined ? 100 : ajustes.limit,
        offset: ajustes.offset === undefined ? 0 : ajustes.offset,
        incluir_inactivos: ajustes.incluirInactivos ? 'true' : ''
      });
      var resultado = await pedir(destino);
      if (!resultado.ok) {
        return resultado;
      }
      return { ok: true, estado: resultado.estado, datos: normalizarLista(resultado.datos) };
    },

    /** GET /autores/ con paginación limit/offset. */
    listarAutores: async function (opciones) {
      var ajustes = opciones || {};
      var destino = conParametros(url('autores/'), {
        limit: ajustes.limit === undefined ? CONTRATO.limite : ajustes.limit,
        offset: ajustes.offset === undefined ? 0 : ajustes.offset,
        incluir_inactivos: ajustes.incluirInactivos ? 'true' : ''
      });
      var resultado = await pedir(destino);
      if (!resultado.ok) {
        return resultado;
      }
      return { ok: true, estado: resultado.estado, datos: normalizarLista(resultado.datos) };
    },

    /** POST /autores/: nombre obligatorio y nacionalidad opcional. */
    crearAutor: function (autor) {
      var datos = autor || {};
      var nacionalidad = textoRecortado(datos.nacionalidad);
      return pedir(url('autores/'), {
        metodo: 'POST',
        cuerpo: {
          nombre: textoRecortado(datos.nombre),
          nacionalidad: nacionalidad === '' ? null : nacionalidad
        }
      });
    },

    /** PATCH /autores/{id}: actualiza nombre y nacionalidad. */
    actualizarAutor: function (id, autor) {
      var datos = autor || {};
      var nacionalidad = textoRecortado(datos.nacionalidad);
      return pedir(url('autores/' + encodeURIComponent(id)), {
        metodo: 'PATCH',
        cuerpo: {
          nombre: textoRecortado(datos.nombre),
          nacionalidad: nacionalidad === '' ? null : nacionalidad
        }
      });
    },

    /** DELETE /autores/{id}: baja lógica. */
    eliminarAutor: function (id) {
      return eliminar('autores/' + encodeURIComponent(id));
    },

    /** PATCH /autores/{id} con activo=true: restaura la baja lógica. */
    restaurarAutor: function (id) {
      return restaurar('autores/' + encodeURIComponent(id));
    },

    /** POST /generos/: el nombre es único (409 si ya existe). */
    crearGenero: function (genero) {
      var datos = genero || {};
      return pedir(url('generos/'), {
        metodo: 'POST',
        cuerpo: { nombre: textoRecortado(datos.nombre) }
      });
    },

    /** PATCH /generos/{id}: actualiza el nombre. */
    actualizarGenero: function (id, genero) {
      var datos = genero || {};
      return pedir(url('generos/' + encodeURIComponent(id)), {
        metodo: 'PATCH',
        cuerpo: { nombre: textoRecortado(datos.nombre) }
      });
    },

    /** DELETE /generos/{id}: baja lógica. */
    eliminarGenero: function (id) {
      return eliminar('generos/' + encodeURIComponent(id));
    },

    /** PATCH /generos/{id} con activo=true: restaura la baja lógica. */
    restaurarGenero: function (id) {
      return restaurar('generos/' + encodeURIComponent(id));
    },

    /** GET /autores/{id}: nombre del autor antes de agregarlo a un libro. */
    obtenerAutor: function (id) {
      return pedir(url('autores/' + encodeURIComponent(id)));
    },

    /* ---------------------------- Clientes ---------------------------- */

    /** GET /clientes/ con paginación limit/offset. */
    listarClientes: async function (opciones) {
      var ajustes = opciones || {};
      var destino = conParametros(url('clientes/'), {
        limit: ajustes.limit === undefined ? CONTRATO.limite : ajustes.limit,
        offset: ajustes.offset === undefined ? 0 : ajustes.offset,
        incluir_inactivos: ajustes.incluirInactivos ? 'true' : ''
      });
      var resultado = await pedir(destino);
      if (!resultado.ok) {
        return resultado;
      }
      return { ok: true, estado: resultado.estado, datos: normalizarLista(resultado.datos) };
    },

    /** POST /clientes/ */
    crearCliente: function (cliente) {
      var datos = cliente || {};
      return pedir(url('clientes/'), {
        metodo: 'POST',
        cuerpo: { nombre: datos.nombre, email: datos.email }
      });
    },

    /** PATCH /clientes/{id}: actualiza nombre y email. */
    actualizarCliente: function (id, cliente) {
      var datos = cliente || {};
      return pedir(url('clientes/' + encodeURIComponent(id)), {
        metodo: 'PATCH',
        cuerpo: { nombre: datos.nombre, email: datos.email }
      });
    },

    /** DELETE /clientes/{id}: baja lógica. */
    eliminarCliente: function (id) {
      return eliminar('clientes/' + encodeURIComponent(id));
    },

    /** PATCH /clientes/{id} con activo=true: restaura la baja lógica. */
    restaurarCliente: function (id) {
      return restaurar('clientes/' + encodeURIComponent(id));
    },

    /** GET /clientes/{id}: consulta individual. */
    obtenerCliente: function (id) {
      return pedir(url('clientes/' + encodeURIComponent(id)));
    },

    /* ----------------------------- Ventas ----------------------------- */

    /** POST /ventas/ con el id del cliente y los renglones {libro_id, cantidad}. */
    crearVenta: function (venta) {
      var datos = venta || {};
      var renglones = (datos.renglones || []).map(function (renglon) {
        return { libro_id: Number(renglon.libroId), cantidad: Number(renglon.cantidad) };
      });
      return pedir(url('ventas/'), {
        metodo: 'POST',
        cuerpo: { cliente_id: Number(datos.clienteId), renglones: renglones }
      });
    },

    /** GET /ventas/ con limit y offset. */
    listarVentas: async function (opciones) {
      var ajustes = opciones || {};
      var destino = conParametros(url('ventas/'), {
        limit: ajustes.limit === undefined ? CONTRATO.limite : ajustes.limit,
        offset: ajustes.offset === undefined ? 0 : ajustes.offset
      });
      var resultado = await pedir(destino);
      if (!resultado.ok) {
        return resultado;
      }
      return { ok: true, estado: resultado.estado, datos: normalizarLista(resultado.datos) };
    },

    /** GET /ventas/{id}: detalle con importes históricos. */
    obtenerVenta: function (id) {
      return pedir(url('ventas/' + encodeURIComponent(id)));
    },

    /** GET /health/ready: comprobación de salud del backend a través del proxy. */
    salud: function () {
      return pedir(url('health/ready'));
    }
  };
}());
