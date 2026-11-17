/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/editoriales.js
 * Responsabilidad: vista Editoriales: alta, edición y listado paginado.
 *
 * El submit se intercepta, se valida lo comprobable en el cliente y se envía
 * POST /editoriales/ (alta) o PATCH /editoriales/{id} (edición). El listado se
 * refresca contra la API. La API de editoriales no tiene baja lógica, así que
 * el listado solo ofrece Editar.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};
  window.Libreria.vistas = window.Libreria.vistas || {};

  var LIMITE = 20;
  var CLASE_CONTENIDO = 'vista-editoriales__contenido';
  var CLASE_LISTADO = 'vista-editoriales__listado';
  var SELECTOR_REGION = '.region-mensajes';

  var offset = 0;
  var total = null;
  var totalConocido = null;
  var token = 0;
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

  function alEditar(editorial) {
    editandoId = editorial.id;
    piezasFormulario.cargar(editorial);
    piezasFormulario.fijarModoEdicion(true);
    piezasFormulario.formulario.scrollIntoView({ behavior: 'smooth', block: 'center' });
    piezasFormulario.enfocar();
  }

  async function cargarListado() {
    var ui = window.Libreria.ui;
    var api = window.Libreria.api;
    var actual = ++token;

    ui.vaciar(nodoTabla);
    ui.vaciar(nodoPaginacion);
    ui.mostrarCargando(nodoTabla);

    var resultado = await api.listarEditoriales({ limit: LIMITE, offset: offset });
    if (actual !== token) {
      return;
    }

    ui.quitarCargando(nodoTabla);
    ui.vaciar(nodoTabla);

    if (!resultado.ok) {
      mostrarErrorListado(resultado);
      return;
    }

    var editoriales = resultado.datos.items;
    total = resultado.datos.total;

    if (editoriales.length === 0 && offset > 0) {
      totalConocido = offset;
      offset = Math.max(0, offset - LIMITE);
      cargarListado();
      return;
    }
    if (total === null && totalConocido !== null) {
      total = totalConocido;
    }

    nodoTabla.appendChild(
      window.Libreria.editorialesListado.crear(editoriales, {
        alEditar: alEditar
      })
    );
    nodoPaginacion.appendChild(
      window.Libreria.paginacion.crear({
        offset: offset,
        total: total,
        cantidad: editoriales.length,
        limite: LIMITE,
        etiqueta: 'editoriales',
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

    var errores = window.Libreria.validaciones.validarEditorial(contexto);
    if (errores.length > 0) {
      ui.mostrarErrores(nodoRegion, errores, { formulario: formulario });
      ui.enfocarPrimerError(formulario);
      return;
    }

    var editando = editandoId !== null;
    enviando = true;
    piezasFormulario.deshabilitar(true);

    var resultado = editando
      ? await window.Libreria.api.actualizarEditorial(editandoId, contexto)
      : await window.Libreria.api.crearEditorial(contexto);
    enviando = false;
    piezasFormulario.deshabilitar(false);

    if (!resultado.ok) {
      mostrarErroresDeEnvio(resultado);
      return;
    }

    var editorial = resultado.datos || {};
    cancelarEdicion();
    if (!editando) {
      offset = 0;
      totalConocido = null;
    }
    mostrarResultado(
      'Editorial «' + (editorial.nombre || contexto.nombre) + '» ' +
        (editando ? 'actualizada' : 'registrada') + ' correctamente' +
        (editorial.id !== undefined ? ' (ID ' + editorial.id + ').' : '.'),
      'exito'
    );
    cargarListado();
  }

  window.Libreria.vistas.editoriales = {
    render: function (seccion) {
      var fragmento = document.createDocumentFragment();

      nodoRegion = seccion ? seccion.querySelector(SELECTOR_REGION) : null;
      offset = 0;
      total = null;
      totalConocido = null;
      editandoId = null;

      var contenido = document.createElement('div');
      contenido.className = CLASE_CONTENIDO;

      piezasFormulario = window.Libreria.editorialesFormulario.crear({
        alEnviar: alEnviar,
        alCancelar: cancelarEdicion
      });

      nodoListado = document.createElement('div');
      nodoListado.className = CLASE_LISTADO;

      var tituloListado = document.createElement('h2');
      tituloListado.className = 'vista-editoriales__listado-titulo';
      tituloListado.textContent = 'Editoriales registradas';
      nodoListado.appendChild(tituloListado);

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
