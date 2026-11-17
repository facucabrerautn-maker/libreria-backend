/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/generos.js
 * Responsabilidad: vista Géneros: alta, edición, baja lógica y listado paginado.
 *
 * El submit se intercepta, se valida lo comprobable en el cliente y se envía
 * POST /generos/ (alta) o PATCH /generos/{id} (edición). El listado se refresca
 * contra la API; la casilla «Mostrar dados de baja» incluye las bajas lógicas
 * para poder restaurarlas.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};
  window.Libreria.vistas = window.Libreria.vistas || {};

  var LIMITE = 20;
  var CLASE_CONTENIDO = 'vista-generos__contenido';
  var CLASE_LISTADO = 'vista-generos__listado';
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

  function alEditar(genero) {
    editandoId = genero.id;
    piezasFormulario.cargar(genero);
    piezasFormulario.fijarModoEdicion(true);
    piezasFormulario.formulario.scrollIntoView({ behavior: 'smooth', block: 'center' });
    piezasFormulario.enfocar();
  }

  async function alEliminar(genero) {
    var nombre = genero && genero.nombre ? genero.nombre : 'ID ' + genero.id;
    var confirmado = window.confirm(
      '¿Dar de baja el género «' + nombre + '»? No se borra: queda como eliminado y se puede restaurar.'
    );
    if (!confirmado) {
      return;
    }

    var resultado = await window.Libreria.api.eliminarGenero(genero.id);
    if (!resultado.ok) {
      mostrarResultado(window.Libreria.ui.mensajeDeApi(resultado), 'error');
      return;
    }

    if (editandoId === genero.id) {
      cancelarEdicion();
    }
    mostrarResultado('Género «' + nombre + '» dado de baja.', 'exito');
    cargarListado();
  }

  async function alRestaurar(genero) {
    var nombre = genero && genero.nombre ? genero.nombre : 'ID ' + genero.id;
    var resultado = await window.Libreria.api.restaurarGenero(genero.id);
    if (!resultado.ok) {
      mostrarResultado(window.Libreria.ui.mensajeDeApi(resultado), 'error');
      return;
    }

    mostrarResultado('Género «' + nombre + '» restaurado.', 'exito');
    cargarListado();
  }

  async function cargarListado() {
    var ui = window.Libreria.ui;
    var api = window.Libreria.api;
    var actual = ++token;

    ui.vaciar(nodoTabla);
    ui.vaciar(nodoPaginacion);
    ui.mostrarCargando(nodoTabla);

    var resultado = await api.listarGeneros({
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

    var generos = resultado.datos.items;
    total = resultado.datos.total;

    if (generos.length === 0 && offset > 0) {
      totalConocido = offset;
      offset = Math.max(0, offset - LIMITE);
      cargarListado();
      return;
    }
    if (total === null && totalConocido !== null) {
      total = totalConocido;
    }

    nodoTabla.appendChild(
      window.Libreria.generosListado.crear(generos, {
        alEditar: alEditar,
        alEliminar: alEliminar,
        alRestaurar: alRestaurar
      })
    );
    nodoPaginacion.appendChild(
      window.Libreria.paginacion.crear({
        offset: offset,
        total: total,
        cantidad: generos.length,
        limite: LIMITE,
        etiqueta: 'géneros',
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

    if (resultado.estado === 409) {
      ui.mostrarErrores(
        nodoRegion,
        [{ campo: 'nombre', mensaje: ui.mensajeDeApi(resultado) }],
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

    var errores = window.Libreria.validaciones.validarGenero(contexto);
    if (errores.length > 0) {
      ui.mostrarErrores(nodoRegion, errores, { formulario: formulario });
      ui.enfocarPrimerError(formulario);
      return;
    }

    var editando = editandoId !== null;
    enviando = true;
    piezasFormulario.deshabilitar(true);

    var resultado = editando
      ? await window.Libreria.api.actualizarGenero(editandoId, contexto)
      : await window.Libreria.api.crearGenero(contexto);
    enviando = false;
    piezasFormulario.deshabilitar(false);

    if (!resultado.ok) {
      mostrarErroresDeEnvio(resultado);
      return;
    }

    var genero = resultado.datos || {};
    cancelarEdicion();
    if (!editando) {
      offset = 0;
      totalConocido = null;
    }
    mostrarResultado(
      'Género «' + (genero.nombre || contexto.nombre) + '» ' +
        (editando ? 'actualizado' : 'registrado') + ' correctamente' +
        (genero.id !== undefined ? ' (ID ' + genero.id + ').' : '.'),
      'exito'
    );
    cargarListado();
  }

  function crearFiltros() {
    var filtros = document.createElement('div');
    filtros.className = 'listado__filtros';
    filtros.appendChild(
      window.Libreria.ui.crearCasilla('generos-incluir-inactivos', 'Mostrar dados de baja', function (activo) {
        incluirInactivos = activo;
        offset = 0;
        totalConocido = null;
        cargarListado();
      })
    );
    return filtros;
  }

  window.Libreria.vistas.generos = {
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

      piezasFormulario = window.Libreria.generosFormulario.crear({
        alEnviar: alEnviar,
        alCancelar: cancelarEdicion
      });

      nodoListado = document.createElement('div');
      nodoListado.className = CLASE_LISTADO;

      var tituloListado = document.createElement('h2');
      tituloListado.className = 'vista-generos__listado-titulo';
      tituloListado.textContent = 'Géneros registrados';
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
