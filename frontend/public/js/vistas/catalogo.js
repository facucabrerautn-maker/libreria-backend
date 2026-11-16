/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/catalogo.js
 * Responsabilidad: vista Catálogo contra la API.
 *
 * - Busca por título en el servidor (GET /libros/?titulo=…) y pagina con
 *   limit/offset; al cambiar el filtro, el desplazamiento vuelve a cero.
 * - Distingue carga, catálogo vacío, búsqueda sin coincidencias y error de
 *   conexión, cada uno con su mensaje y su acción.
 * - Los autores se piden al detalle (GET /libros/{id}) desde cada ficha.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};
  window.Libreria.vistas = window.Libreria.vistas || {};

  var LIMITE = 20;
  var ESPERA_BUSQUEDA = 350;
  var PREFIJO_SIN_COINCIDENCIAS = 'No se encontraron libros para "';
  var MENSAJE_CATALOGO_VACIO =
    'El catálogo todavía no tiene libros cargados en la base. Cuando des de alta un título ' +
    'desde la vista Libros, va a aparecer acá.';

  var consulta = '';
  var offset = 0;
  var total = null;
  var totalConocido = null; // total deducido al llegar a una página vacía
  var token = 0;
  var temporizador = null;

  var nodoRegion = null;
  var nodoResultados = null;
  var nodoPaginacion = null;

  function boton(texto, clase) {
    var control = document.createElement('button');
    control.type = 'button';
    control.className = 'boton ' + (clase || 'boton--secundario');
    control.textContent = texto;
    return control;
  }

  function mostrarErrorDeConexion(resultado) {
    var ui = window.Libreria.ui;
    ui.vaciar(nodoResultados);
    ui.mostrarMensaje(nodoResultados, ui.mensajeDeApi(resultado), 'error');
    var reintentar = boton('Reintentar');
    reintentar.addEventListener('click', function () {
      cargar();
    });
    nodoResultados.appendChild(reintentar);
  }

  function pintarPaginador(cantidad) {
    var ui = window.Libreria.ui;
    ui.vaciar(nodoPaginacion);
    nodoPaginacion.appendChild(
      window.Libreria.paginacion.crear({
        offset: offset,
        total: total,
        cantidad: cantidad,
        limite: LIMITE,
        etiqueta: 'libros',
        alCambiar: function (nuevoOffset) {
          offset = nuevoOffset;
          cargar();
        }
      })
    );
  }

  function crearGrilla(libros) {
    var grilla = document.createElement('ul');
    grilla.className = 'grilla-catalogo';
    libros.forEach(function (libro) {
      var item = document.createElement('li');
      item.className = 'grilla-catalogo__item';
      item.appendChild(
        window.Libreria.catalogoFichas.crearFicha(libro, { alVerAutores: mostrarAutores })
      );
      grilla.appendChild(item);
    });
    return grilla;
  }

  /** Resuelve los nombres que el detalle no trajo, consultando GET /autores/{id}. */
  async function completarAutores(autorias) {
    var api = window.Libreria.api;
    var estado = window.Libreria.estado;
    await Promise.all(
      autorias.map(async function (autoria) {
        if (autoria.nombre || autoria.autorId === null) {
          return;
        }
        var recordado = estado.obtenerAutor(autoria.autorId);
        if (recordado) {
          autoria.nombre = recordado.nombre;
          return;
        }
        var resultado = await api.obtenerAutor(autoria.autorId);
        if (resultado.ok) {
          estado.recordarAutor(resultado.datos);
          autoria.nombre = resultado.datos.nombre;
        }
      })
    );
    return autorias;
  }

  async function mostrarAutores(libro, contenedor) {
    var ui = window.Libreria.ui;
    var api = window.Libreria.api;
    ui.vaciar(contenedor);
    ui.mostrarCargando(contenedor, 'Consultando el detalle del libro…');

    if (api.idNumerico(libro.id) === null) {
      ui.quitarCargando(contenedor);
      ui.mostrarMensaje(contenedor, 'El libro no tiene un id válido.', 'error');
      return;
    }

    var resultado = await api.obtenerLibro(libro.id);
    ui.quitarCargando(contenedor);
    ui.vaciar(contenedor);

    if (!resultado.ok) {
      ui.mostrarMensaje(contenedor, ui.mensajeDeApi(resultado), 'error');
      return;
    }

    var autorias = await completarAutores(window.Libreria.modelo.autoresDeLibro(resultado.datos));
    contenedor.appendChild(window.Libreria.catalogoFichas.crearListaAutores(autorias));
  }

  async function cargar() {
    var ui = window.Libreria.ui;
    var api = window.Libreria.api;
    var actual = ++token;

    ui.vaciar(nodoResultados);
    ui.vaciar(nodoPaginacion);
    ui.mostrarCargando(nodoResultados);

    var resultado = await api.listarLibros({ titulo: consulta, limit: LIMITE, offset: offset });
    if (actual !== token) {
      return;
    }

    ui.quitarCargando(nodoResultados);
    ui.vaciar(nodoResultados);

    if (!resultado.ok) {
      mostrarErrorDeConexion(resultado);
      return;
    }

    var libros = resultado.datos.items;
    total = resultado.datos.total;

    /* Página vacía tras «Siguiente»: la lista terminó en la página anterior. */
    if (libros.length === 0 && offset > 0) {
      totalConocido = offset;
      offset = Math.max(0, offset - LIMITE);
      cargar();
      return;
    }
    if (total === null && totalConocido !== null) {
      total = totalConocido;
    }

    if (libros.length === 0) {
      if (consulta !== '') {
        mostrarMensajeEstado(PREFIJO_SIN_COINCIDENCIAS + consulta + '"');
      } else {
        mostrarMensajeEstado(MENSAJE_CATALOGO_VACIO, true);
      }
      return;
    }

    nodoResultados.appendChild(crearGrilla(libros));
    pintarPaginador(libros.length);
  }

  function mostrarMensajeEstado(texto, conEnlace) {
    var ui = window.Libreria.ui;
    ui.mostrarMensaje(nodoResultados, texto, 'vacio');
    if (!conEnlace) {
      return;
    }
    var parrafo = document.createElement('p');
    parrafo.className = 'mensaje-estado__accion';
    var enlace = document.createElement('a');
    enlace.href = '#/libros';
    enlace.textContent = 'Ir a Libros';
    parrafo.appendChild(enlace);
    nodoResultados.appendChild(parrafo);
  }

  function crearBuscador() {
    return window.Libreria.catalogoBuscador.crear({
      valor: consulta,
      alBuscar: function (texto) {
        consulta = texto;
        offset = 0;
        totalConocido = null;
        cargar();
      },
      alCambiar: function (texto) {
        consulta = texto;
        offset = 0;
        totalConocido = null;
        if (temporizador !== null) {
          window.clearTimeout(temporizador);
        }
        temporizador = window.setTimeout(function () {
          cargar();
        }, ESPERA_BUSQUEDA);
      },
      alLimpiar: function () {
        consulta = '';
        offset = 0;
        totalConocido = null;
        cargar();
      }
    }).formulario;
  }

  window.Libreria.vistas.catalogo = {
    render: function (seccion) {
      var fragmento = document.createDocumentFragment();
      var ui = window.Libreria.ui;

      nodoRegion = seccion ? seccion.querySelector('.region-mensajes') : null;
      nodoResultados = document.createElement('div');
      nodoResultados.className = 'vista-catalogo__resultados';
      nodoPaginacion = document.createElement('div');
      nodoPaginacion.className = 'vista__paginacion';

      fragmento.appendChild(crearBuscador());
      fragmento.appendChild(nodoResultados);
      fragmento.appendChild(nodoPaginacion);
      cargar();

      return fragmento;
    },

    alCambiarElEstado: function () {
      return cargar();
    }
  };
}());
