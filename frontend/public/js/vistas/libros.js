/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/libros.js
 * Responsabilidad: vista Libros: alta, edición, baja lógica y listado paginado.
 *
 * El submit se intercepta, se valida lo comprobable en el cliente y se envía
 * POST /libros/ (alta) o PATCH /libros/{id} (edición). Para editar se pide el
 * detalle con GET /libros/{id}, que trae las autorías con el nombre del autor.
 * La casilla «Mostrar dados de baja» incluye las bajas lógicas.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};
  window.Libreria.vistas = window.Libreria.vistas || {};

  var LIMITE = 20;
  var CLASE_CONTENIDO = 'vista-libros__contenido';
  var CLASE_LISTADO = 'vista-libros__listado';
  var SELECTOR_REGION = '.region-mensajes';

  var offset = 0;
  var total = null;
  var totalConocido = null;
  var token = 0;
  var incluirInactivos = false;
  var editandoId = null;

  var nodoRegion = null;
  var nodoListado = null;
  var nodoTabla = null;
  var nodoPaginacion = null;
  var piezasFormulario = null;
  var enviando = false;

  function mostrarResultado(texto, tipo) {
    var ui = window.Libreria.ui;
    ui.vaciar(nodoRegion);
    if (nodoRegion) {
      ui.mostrarMensaje(nodoRegion, texto, tipo);
    }
  }

  function mostrarErrorListado(resultado) {
    var ui = window.Libreria.ui;
    ui.vaciar(nodoTabla);
    ui.mostrarMensaje(nodoTabla, ui.mensajeDeApi(resultado), 'error');
    var reintentar = document.createElement('button');
    reintentar.type = 'button';
    reintentar.className = 'boton boton--secundario';
    reintentar.textContent = 'Reintentar';
    reintentar.addEventListener('click', function () {
      cargarListado();
    });
    nodoTabla.appendChild(reintentar);
  }

  function cancelarEdicion() {
    editandoId = null;
    piezasFormulario.fijarModoEdicion(false);
    piezasFormulario.limpiar();
  }

  async function alEditar(libro) {
    var resultado = await window.Libreria.api.obtenerLibro(libro.id);
    if (!resultado.ok) {
      mostrarResultado(window.Libreria.ui.mensajeDeApi(resultado), 'error');
      return;
    }

    editandoId = libro.id;
    piezasFormulario.cargar(resultado.datos);
    piezasFormulario.fijarModoEdicion(true);
    piezasFormulario.formulario.scrollIntoView({ behavior: 'smooth', block: 'center' });
    piezasFormulario.enfocar();
  }

  async function alEliminar(libro) {
    var titulo = libro && libro.titulo ? libro.titulo : 'ID ' + libro.id;
    var confirmado = window.confirm(
      '¿Dar de baja el libro «' + titulo + '»? No se borra: queda como eliminado y se puede restaurar.'
    );
    if (!confirmado) {
      return;
    }

    var resultado = await window.Libreria.api.eliminarLibro(libro.id);
    if (!resultado.ok) {
      mostrarResultado(window.Libreria.ui.mensajeDeApi(resultado), 'error');
      return;
    }

    if (editandoId === libro.id) {
      cancelarEdicion();
    }
    mostrarResultado('Libro «' + titulo + '» dado de baja.', 'exito');
    cargarListado();
  }

  async function alRestaurar(libro) {
    var titulo = libro && libro.titulo ? libro.titulo : 'ID ' + libro.id;
    var resultado = await window.Libreria.api.restaurarLibro(libro.id);
    if (!resultado.ok) {
      mostrarResultado(window.Libreria.ui.mensajeDeApi(resultado), 'error');
      return;
    }

    mostrarResultado('Libro «' + titulo + '» restaurado.', 'exito');
    cargarListado();
  }

  async function cargarListado() {
    var ui = window.Libreria.ui;
    var api = window.Libreria.api;
    var actual = ++token;

    ui.vaciar(nodoTabla);
    ui.vaciar(nodoPaginacion);
    ui.mostrarCargando(nodoTabla);

    var resultado = await api.listarLibros({
      limit: LIMITE,
      offset: offset,
      incluirInactivos: incluirInactivos
    });
    if (actual !== token) {
      return;
    }

    ui.quitarCargando(nodoTabla);
    ui.vaciar(nodoTabla);

    if (!resultado.ok) {
      mostrarErrorListado(resultado);
      return;
    }

    var libros = resultado.datos.items;
    total = resultado.datos.total;

    if (libros.length === 0 && offset > 0) {
      totalConocido = offset;
      offset = Math.max(0, offset - LIMITE);
      cargarListado();
      return;
    }
    if (total === null && totalConocido !== null) {
      total = totalConocido;
    }

    nodoTabla.appendChild(
      window.Libreria.librosListado.crear(libros, {
        alEditar: alEditar,
        alEliminar: alEliminar,
        alRestaurar: alRestaurar
      })
    );
    nodoPaginacion.appendChild(
      window.Libreria.paginacion.crear({
        offset: offset,
        total: total,
        cantidad: libros.length,
        limite: LIMITE,
        etiqueta: 'libros',
        alCambiar: function (nuevoOffset) {
          offset = nuevoOffset;
          cargarListado();
        }
      })
    );
  }

  async function cargarCatalogos() {
    var ui = window.Libreria.ui;
    var api = window.Libreria.api;

    var resultados = await Promise.all([api.listarEditoriales(), api.listarGeneros({ limit: 100 })]);
    var editoriales = resultados[0];
    var generos = resultados[1];

    if (!editoriales.ok || !generos.ok) {
      var fallido = !editoriales.ok ? editoriales : generos;
      mostrarResultado(
        'No se pudieron cargar los catálogos de editoriales y géneros. ' +
          ui.mensajeDeApi(fallido),
        'error'
      );
      return;
    }

    window.Libreria.estado.fijarEditoriales(editoriales.datos.items);
    window.Libreria.estado.fijarGeneros(generos.datos.items);
    piezasFormulario.cargarCatalogos(editoriales.datos.items, generos.datos.items);
  }

  function mostrarErroresDeEnvio(resultado) {
    var ui = window.Libreria.ui;
    ui.limpiarErrores(nodoRegion, piezasFormulario.formulario);
    ui.vaciar(nodoRegion);

    if (resultado.estado === 422) {
      var errores = ui.erroresDeApi(resultado);
      if (errores.length > 0) {
        ui.mostrarErrores(nodoRegion, errores, { formulario: piezasFormulario.formulario });
        ui.enfocarPrimerError(piezasFormulario.formulario);
        return;
      }
    }

    if (resultado.estado === 409) {
      ui.mostrarErrores(
        nodoRegion,
        [{ campo: 'isbn', mensaje: ui.mensajeDeApi(resultado) }],
        { formulario: piezasFormulario.formulario }
      );
      ui.enfocarPrimerError(piezasFormulario.formulario);
      return;
    }

    mostrarResultado(ui.mensajeDeApi(resultado), 'error');
  }

  async function alEnviar(contexto, formulario) {
    var ui = window.Libreria.ui;
    if (enviando) {
      return;
    }

    ui.limpiarErrores(nodoRegion, formulario);
    ui.vaciar(nodoRegion);

    var errores = window.Libreria.validaciones.validarLibro(contexto);
    if (errores.length > 0) {
      ui.mostrarErrores(nodoRegion, errores, { formulario: formulario });
      ui.enfocarPrimerError(formulario);
      return;
    }

    var editando = editandoId !== null;
    enviando = true;
    piezasFormulario.deshabilitar(true);

    var resultado = editando
      ? await window.Libreria.api.actualizarLibro(editandoId, contexto)
      : await window.Libreria.api.crearLibro(contexto);
    enviando = false;
    piezasFormulario.deshabilitar(false);

    if (!resultado.ok) {
      mostrarErroresDeEnvio(resultado);
      return;
    }

    var libro = resultado.datos || {};
    cancelarEdicion();
    if (!editando) {
      offset = 0;
      totalConocido = null;
    }
    mostrarResultado(
      'Libro «' + (libro.titulo || contexto.titulo) + '» ' +
        (editando ? 'actualizado' : 'registrado') + ' correctamente' +
        (libro.id !== undefined ? ' (ID ' + libro.id + ').' : '.'),
      'exito'
    );
    cargarListado();
  }

  function crearFiltros() {
    var filtros = document.createElement('div');
    filtros.className = 'listado__filtros';
    filtros.appendChild(
      window.Libreria.ui.crearCasilla('libros-incluir-inactivos', 'Mostrar dados de baja', function (activo) {
        incluirInactivos = activo;
        offset = 0;
        totalConocido = null;
        cargarListado();
      })
    );
    return filtros;
  }

  window.Libreria.vistas.libros = {
    render: function (seccion) {
      var fragmento = document.createDocumentFragment();
      var ui = window.Libreria.ui;

      nodoRegion = seccion ? seccion.querySelector(SELECTOR_REGION) : null;
      offset = 0;
      total = null;
      totalConocido = null;
      incluirInactivos = false;
      editandoId = null;

      var contenido = document.createElement('div');
      contenido.className = CLASE_CONTENIDO;

      piezasFormulario = window.Libreria.librosFormulario.crear({
        alEnviar: alEnviar,
        alCancelar: cancelarEdicion
      });

      nodoListado = document.createElement('div');
      nodoListado.className = CLASE_LISTADO;

      var tituloListado = document.createElement('h2');
      tituloListado.className = 'vista-libros__listado-titulo';
      tituloListado.textContent = 'Libros registrados';
      nodoListado.appendChild(tituloListado);
      nodoListado.appendChild(crearFiltros());

      nodoTabla = document.createElement('div');
      nodoTabla.className = 'listado';
      nodoListado.appendChild(nodoTabla);

      nodoPaginacion = document.createElement('div');
      nodoPaginacion.className = 'vista__paginacion';
      nodoListado.appendChild(nodoPaginacion);

      contenido.appendChild(piezasFormulario.formulario);
      contenido.appendChild(nodoListado);
      fragmento.appendChild(contenido);

      cargarCatalogos();
      cargarListado();

      return fragmento;
    },

    alCambiarElEstado: function () {
      cargarListado();
      return true;
    }
  };
}());
