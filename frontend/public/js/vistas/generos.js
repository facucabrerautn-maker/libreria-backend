/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/generos.js
 * Responsabilidad: vista Géneros: alta contra la API y listado paginado.
 *
 * El submit se intercepta, se valida lo comprobable en el cliente y se envía
 * POST /generos/. Un 201 usa el registro devuelto para confirmar el alta y
 * refrescar el listado; un 409 marca el nombre duplicado y un 422 muestra el
 * detalle del servidor.
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

  var nodoRegion = null;
  var nodoListado = null;
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
    ui.vaciar(nodoListado);
    ui.mostrarMensaje(nodoListado, ui.mensajeDeApi(resultado), 'error');
    var reintentar = document.createElement('button');
    reintentar.type = 'button';
    reintentar.className = 'boton boton--secundario';
    reintentar.textContent = 'Reintentar';
    reintentar.addEventListener('click', function () {
      cargarListado();
    });
    nodoListado.appendChild(reintentar);
  }

  async function cargarListado() {
    var ui = window.Libreria.ui;
    var api = window.Libreria.api;
    var actual = ++token;

    ui.vaciar(nodoListado);
    ui.vaciar(nodoPaginacion);
    ui.mostrarCargando(nodoListado);

    var resultado = await api.listarGeneros({ limit: LIMITE, offset: offset });
    if (actual !== token) {
      return;
    }

    ui.quitarCargando(nodoListado);
    ui.vaciar(nodoListado);

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

    nodoListado.appendChild(window.Libreria.generosListado.crear(generos));
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

    enviando = true;
    piezasFormulario.deshabilitar(true);

    var resultado = await window.Libreria.api.crearGenero(contexto);
    enviando = false;
    piezasFormulario.deshabilitar(false);

    if (!resultado.ok) {
      mostrarErroresDeEnvio(resultado);
      return;
    }

    var genero = resultado.datos || {};
    piezasFormulario.limpiar();
    offset = 0;
    totalConocido = null;
    mostrarResultado(
      'Género «' + (genero.nombre || contexto.nombre) +
        '» registrado correctamente' +
        (genero.id !== undefined ? ' (ID ' + genero.id + ').' : '.'),
      'exito'
    );
    cargarListado();
  }

  window.Libreria.vistas.generos = {
    render: function (seccion) {
      var fragmento = document.createDocumentFragment();
      var ui = window.Libreria.ui;

      nodoRegion = seccion ? seccion.querySelector(SELECTOR_REGION) : null;
      offset = 0;
      total = null;
      totalConocido = null;

      var contenido = document.createElement('div');
      contenido.className = CLASE_CONTENIDO;

      piezasFormulario = window.Libreria.generosFormulario.crear({ alEnviar: alEnviar });

      nodoListado = document.createElement('div');
      nodoListado.className = CLASE_LISTADO;

      var tituloListado = document.createElement('h2');
      tituloListado.className = 'vista-generos__listado-titulo';
      tituloListado.textContent = 'Géneros registrados';
      nodoListado.appendChild(tituloListado);

      nodoPaginacion = document.createElement('div');
      nodoPaginacion.className = 'vista__paginacion';

      contenido.appendChild(piezasFormulario.formulario);
      contenido.appendChild(nodoListado);
      contenido.appendChild(nodoPaginacion);
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
