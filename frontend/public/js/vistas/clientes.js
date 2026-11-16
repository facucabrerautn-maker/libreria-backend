/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/clientes.js
 * Responsabilidad: vista Clientes: alta contra la API y consulta por ID.
 *
 * POST /clientes/ devuelve el cliente creado; GET /clientes/{id} permite
 * recuperar un cliente y mostrar su nombre antes de elegirlo en una venta.
 * La API no expone listado: la tabla muestra los clientes ya consultados.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};
  window.Libreria.vistas = window.Libreria.vistas || {};

  var SELECTOR_REGION = '.region-mensajes';

  var nodoRegion = null;
  var nodoListado = null;
  var nodoEstadoBusqueda = null;
  var nodoId = null;
  var nodoBotonBuscar = null;
  var piezasFormulario = null;
  var enviando = false;

  function mostrarResultado(texto, tipo) {
    var ui = window.Libreria.ui;
    ui.vaciar(nodoRegion);
    if (nodoRegion) {
      ui.mostrarMensaje(nodoRegion, texto, tipo);
    }
  }

  function pintarListado() {
    var ui = window.Libreria.ui;
    if (!nodoListado) {
      return false;
    }
    ui.vaciar(nodoListado);
    nodoListado.appendChild(
      window.Libreria.clientesListado.crear(window.Libreria.estado.listarClientes())
    );
    return true;
  }

  function mostrarAvisoBusqueda(texto, tipo) {
    var ui = window.Libreria.ui;
    ui.vaciar(nodoEstadoBusqueda);
    if (texto) {
      ui.mostrarMensaje(nodoEstadoBusqueda, texto, tipo || 'aviso');
    }
  }

  async function buscarPorId() {
    var ui = window.Libreria.ui;
    var api = window.Libreria.api;
    var id = api.idNumerico(nodoId.value);
    mostrarAvisoBusqueda('');

    if (id === null) {
      mostrarAvisoBusqueda('Escribí un ID de cliente entero mayor que cero.', 'error');
      nodoId.focus();
      return;
    }

    ui.deshabilitar(nodoBotonBuscar, true);
    mostrarAvisoBusqueda('Consultando el cliente en la API…', 'cargando');

    var resultado = await api.obtenerCliente(id);
    ui.deshabilitar(nodoBotonBuscar, false);

    if (!resultado.ok) {
      mostrarAvisoBusqueda(
        resultado.estado === 404
          ? 'No existe un cliente con el ID ' + id + '.'
          : ui.mensajeDeApi(resultado),
        'error'
      );
      return;
    }

    var cliente = window.Libreria.estado.recordarCliente(resultado.datos);
    pintarListado();
    mostrarAvisoBusqueda('Cliente encontrado: ' + cliente.nombre + ' (ID ' + cliente.id + ').', 'exito');
    nodoId.value = '';
  }

  function crearBuscador() {
    var ui = window.Libreria.ui;
    var busqueda = document.createElement('form');
    busqueda.className = 'formulario formulario--compacto busqueda-id';
    busqueda.setAttribute('role', 'search');
    busqueda.setAttribute('aria-label', 'Buscar un cliente por ID');

    nodoId = document.createElement('input');
    nodoId.id = 'cliente-buscar-id';
    nodoId.name = 'cliente_id';
    nodoId.type = 'number';
    nodoId.min = '1';
    nodoId.step = '1';
    nodoId.inputMode = 'numeric';
    nodoId.className = 'control';

    var ayuda = document.createElement('p');
    ayuda.className = 'campo__ayuda';
    ayuda.id = 'cliente-buscar-id-ayuda';
    ayuda.textContent =
      'La API no expone un listado de clientes: se consultan de a uno con GET /clientes/{id}.';
    nodoId.setAttribute('aria-describedby', ayuda.id);

    busqueda.appendChild(ui.crearCampo('Buscar cliente por ID', nodoId));
    busqueda.appendChild(ayuda);

    var acciones = document.createElement('div');
    acciones.className = 'campo__acciones';
    nodoBotonBuscar = document.createElement('button');
    nodoBotonBuscar.type = 'submit';
    nodoBotonBuscar.className = 'boton boton--secundario';
    nodoBotonBuscar.textContent = 'Buscar cliente';
    acciones.appendChild(nodoBotonBuscar);
    busqueda.appendChild(acciones);

    busqueda.addEventListener('submit', function (evento) {
      evento.preventDefault();
      buscarPorId();
    });

    return busqueda;
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
        [{ campo: 'email', mensaje: ui.mensajeDeApi(resultado) }],
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

    var errores = window.Libreria.validaciones.validarCliente(contexto);
    if (errores.length > 0) {
      ui.mostrarErrores(nodoRegion, errores, { formulario: formulario });
      ui.enfocarPrimerError(formulario);
      return;
    }

    enviando = true;
    piezasFormulario.deshabilitar(true);

    var resultado = await window.Libreria.api.crearCliente(contexto);
    enviando = false;
    piezasFormulario.deshabilitar(false);

    if (!resultado.ok) {
      mostrarErroresDeEnvio(resultado);
      return;
    }

    var cliente = resultado.datos || {};
    window.Libreria.estado.recordarCliente(cliente);
    piezasFormulario.limpiar();
    mostrarResultado(
      'Cliente «' + (cliente.nombre || contexto.nombre) +
        '» registrado correctamente' +
        (cliente.id !== undefined ? ' (ID ' + cliente.id + ').' : '.'),
      'exito'
    );
    pintarListado();
  }

  window.Libreria.vistas.clientes = {
    render: function (seccion) {
      var fragmento = document.createDocumentFragment();
      var ui = window.Libreria.ui;

      nodoRegion = seccion ? seccion.querySelector(SELECTOR_REGION) : null;

      var contenido = document.createElement('div');
      contenido.className = 'vista-clientes__contenido';

      piezasFormulario = window.Libreria.clientesFormulario.crear({ alEnviar: alEnviar });

      var columna = document.createElement('div');
      columna.className = 'vista-clientes__listado';

      var titulo = document.createElement('h2');
      titulo.className = 'vista-libros__listado-titulo';
      titulo.textContent = 'Clientes';
      columna.appendChild(titulo);
      columna.appendChild(crearBuscador());

      nodoEstadoBusqueda = document.createElement('div');
      nodoEstadoBusqueda.className = 'busqueda-id__estado';
      columna.appendChild(nodoEstadoBusqueda);

      nodoListado = document.createElement('div');
      nodoListado.className = 'listado';
      columna.appendChild(nodoListado);

      contenido.appendChild(piezasFormulario.formulario);
      contenido.appendChild(columna);
      fragmento.appendChild(contenido);

      pintarListado();
      return fragmento;
    },

    alCambiarElEstado: function () {
      return pintarListado();
    }
  };
}());
