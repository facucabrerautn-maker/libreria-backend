/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/autores.js
 * Responsabilidad: vista Autores: alta, edición, baja lógica y listado paginado.
 *
 * El submit se intercepta, se valida lo comprobable en el cliente y se envía
 * POST /autores/ (alta) o PATCH /autores/{id} (edición). El listado se refresca
 * contra la API; la casilla «Mostrar dados de baja» incluye las bajas lógicas
 * para poder restaurarlas.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};
  window.Libreria.vistas = window.Libreria.vistas || {};

  var LIMITE = 20;
  var CLASE_CONTENIDO = 'vista-autores__contenido';
  var CLASE_LISTADO = 'vista-autores__listado';
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

  function alEditar(autor) {
    editandoId = autor.id;
    piezasFormulario.cargar(autor);
    piezasFormulario.fijarModoEdicion(true);
    piezasFormulario.formulario.scrollIntoView({ behavior: 'smooth', block: 'center' });
    piezasFormulario.enfocar();
  }

  async function alEliminar(autor) {
    var nombre = autor && autor.nombre ? autor.nombre : 'ID ' + autor.id;
    var confirmado = window.confirm(
      '¿Dar de baja el autor «' + nombre + '»? No se borra: queda como eliminado y se puede restaurar.'
    );
    if (!confirmado) {
      return;
    }

    var resultado = await window.Libreria.api.eliminarAutor(autor.id);
    if (!resultado.ok) {
      mostrarResultado(window.Libreria.ui.mensajeDeApi(resultado), 'error');
      return;
    }

    if (editandoId === autor.id) {
      cancelarEdicion();
    }
    mostrarResultado('Autor «' + nombre + '» dado de baja.', 'exito');
    cargarListado();
  }

  async function alRestaurar(autor) {
    var nombre = autor && autor.nombre ? autor.nombre : 'ID ' + autor.id;
    var resultado = await window.Libreria.api.restaurarAutor(autor.id);
    if (!resultado.ok) {
      mostrarResultado(window.Libreria.ui.mensajeDeApi(resultado), 'error');
      return;
    }

    mostrarResultado('Autor «' + nombre + '» restaurado.', 'exito');
    cargarListado();
  }

  async function cargarListado() {
    var ui = window.Libreria.ui;
    var api = window.Libreria.api;
    var actual = ++token;

    ui.vaciar(nodoTabla);
    ui.vaciar(nodoPaginacion);
    ui.mostrarCargando(nodoTabla);

    var resultado = await api.listarAutores({
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

    var autores = resultado.datos.items;
    total = resultado.datos.total;

    if (autores.length === 0 && offset > 0) {
      totalConocido = offset;
      offset = Math.max(0, offset - LIMITE);
      cargarListado();
      return;
    }
    if (total === null && totalConocido !== null) {
      total = totalConocido;
    }

    nodoTabla.appendChild(
      window.Libreria.autoresListado.crear(autores, {
        alEditar: alEditar,
        alEliminar: alEliminar,
        alRestaurar: alRestaurar
      })
    );
    nodoPaginacion.appendChild(
      window.Libreria.paginacion.crear({
        offset: offset,
        total: total,
        cantidad: autores.length,
        limite: LIMITE,
        etiqueta: 'autores',
        alCambiar: function (nuevoOffset) {
          offset = nuevoOffset;
          cargarListado();
        }
      })
    );
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

    mostrarResultado(ui.mensajeDeApi(resultado), 'error');
  }

  async function alEnviar(contexto, formulario) {
    var ui = window.Libreria.ui;
    if (enviando) {
      return;
    }

    ui.limpiarErrores(nodoRegion, formulario);
    ui.vaciar(nodoRegion);

    var errores = window.Libreria.validaciones.validarAutor(contexto);
    if (errores.length > 0) {
      ui.mostrarErrores(nodoRegion, errores, { formulario: formulario });
      ui.enfocarPrimerError(formulario);
      return;
    }

    var editando = editandoId !== null;
    enviando = true;
    piezasFormulario.deshabilitar(true);

    var resultado = editando
      ? await window.Libreria.api.actualizarAutor(editandoId, contexto)
      : await window.Libreria.api.crearAutor(contexto);
    enviando = false;
    piezasFormulario.deshabilitar(false);

    if (!resultado.ok) {
      mostrarErroresDeEnvio(resultado);
      return;
    }

    var autor = window.Libreria.estado.recordarAutor(resultado.datos || {});
    cancelarEdicion();
    if (!editando) {
      offset = 0;
      totalConocido = null;
    }
    mostrarResultado(
      'Autor «' + (autor.nombre || contexto.nombre) + '» ' +
        (editando ? 'actualizado' : 'registrado') + ' correctamente' +
        (autor.id !== undefined ? ' (ID ' + autor.id + ').' : '.'),
      'exito'
    );
    cargarListado();
  }

  function crearFiltros() {
    var filtros = document.createElement('div');
    filtros.className = 'listado__filtros';
    filtros.appendChild(
      window.Libreria.ui.crearCasilla('autores-incluir-inactivos', 'Mostrar dados de baja', function (activo) {
        incluirInactivos = activo;
        offset = 0;
        totalConocido = null;
        cargarListado();
      })
    );
    return filtros;
  }

  window.Libreria.vistas.autores = {
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

      piezasFormulario = window.Libreria.autoresFormulario.crear({
        alEnviar: alEnviar,
        alCancelar: cancelarEdicion
      });

      nodoListado = document.createElement('div');
      nodoListado.className = CLASE_LISTADO;

      var tituloListado = document.createElement('h2');
      tituloListado.className = 'vista-autores__listado-titulo';
      tituloListado.textContent = 'Autores registrados';
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

      cargarListado();

      return fragmento;
    },

    alCambiarElEstado: function () {
      cargarListado();
      return true;
    }
  };
}());
