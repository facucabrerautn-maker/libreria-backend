/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/ventas-formulario.js
 * Responsabilidad: selectores de cliente y de libro de la vista Ventas.
 *
 * El selector de cliente se llena con GET /clientes/ (solo activos) y además
 * permite buscar uno puntual por ID con GET /clientes/{id}. Los libros se
 * cargan de GET /libros/ (hasta 100) y se pueden filtrar por título contra la
 * API. El formulario no conoce el borrador: avisa por callbacks y la vista
 * decide.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  var nodoCliente = null;
  var nodoClienteId = null;
  var nodoBotonCliente = null;
  var nodoAvisoCliente = null;
  var nodoLibro = null;
  var nodoTitulo = null;
  var nodoCantidad = null;
  var nodoBotonAgregar = null;
  var nodoAvisoLibro = null;
  var libros = [];
  var ajustes = {};

  function aviso(nodo, texto, tipo) {
    window.Libreria.ui.vaciar(nodo);
    if (texto) {
      window.Libreria.ui.mostrarMensaje(nodo, texto, tipo || 'aviso');
    }
  }

  function opcion(valor, texto) {
    var item = document.createElement('option');
    item.value = valor;
    item.textContent = texto;
    return item;
  }

  function fijarOpcionesCliente(clientes, seleccionado) {
    var ui = window.Libreria.ui;
    ui.vaciar(nodoCliente);
    nodoCliente.appendChild(opcion('', '— Elegí un cliente —'));
    clientes.forEach(function (cliente) {
      nodoCliente.appendChild(opcion(String(cliente.id), cliente.nombre + ' (ID ' + cliente.id + ')'));
    });
    if (seleccionado !== undefined && seleccionado !== null && seleccionado !== '') {
      nodoCliente.value = String(seleccionado);
    }
  }

  function fijarOpcionesLibro(seleccionado) {
    var ui = window.Libreria.ui;
    ui.vaciar(nodoLibro);
    nodoLibro.appendChild(opcion('', '— Elegí un libro —'));
    libros.forEach(function (libro) {
      nodoLibro.appendChild(
        opcion(
          String(libro.id),
          libro.titulo + ' — ' + window.Libreria.ui.formatearMonto(libro.precio)
        )
      );
    });
    if (seleccionado !== undefined && seleccionado !== null && seleccionado !== '') {
      nodoLibro.value = String(seleccionado);
    }
  }

  async function buscarCliente() {
    var ui = window.Libreria.ui;
    var api = window.Libreria.api;
    var id = api.idNumerico(nodoClienteId.value);

    if (id === null) {
      aviso(nodoAvisoCliente, 'Escribí un ID de cliente entero mayor que cero.', 'error');
      nodoClienteId.focus();
      return;
    }

    ui.deshabilitar(nodoBotonCliente, true);
    aviso(nodoAvisoCliente, 'Consultando el cliente en la API…', 'cargando');

    var resultado = await api.obtenerCliente(id);
    ui.deshabilitar(nodoBotonCliente, false);

    if (!resultado.ok) {
      aviso(
        nodoAvisoCliente,
        resultado.estado === 404
          ? 'No existe un cliente activo con el ID ' + id + '.'
          : ui.mensajeDeApi(resultado),
        'error'
      );
      return;
    }

    var cliente = window.Libreria.estado.recordarCliente(resultado.datos);
    fijarOpcionesCliente(window.Libreria.estado.listarClientes(), cliente.id);
    aviso(nodoAvisoCliente, 'Cliente encontrado: ' + cliente.nombre + '.', 'exito');
    nodoClienteId.value = '';
    if (ajustes.alElegirCliente) {
      ajustes.alElegirCliente(nodoCliente.value);
    }
  }

  async function buscarLibros() {
    var ui = window.Libreria.ui;
    var api = window.Libreria.api;
    var titulo = nodoTitulo.value.trim();

    aviso(nodoAvisoLibro, 'Buscando libros en la API…', 'cargando');
    var resultado = await api.listarLibros({ titulo: titulo, limit: 100, offset: 0 });

    if (!resultado.ok) {
      aviso(nodoAvisoLibro, ui.mensajeDeApi(resultado), 'error');
      return;
    }

    libros = resultado.datos.items;
    fijarOpcionesLibro('');
    aviso(
      nodoAvisoLibro,
      libros.length === 0
        ? (titulo === '' ? 'El catálogo no tiene libros cargados.' : 'No hay libros para "' + titulo + '".')
        : 'Libros disponibles: ' + libros.length + '.',
      libros.length === 0 ? 'vacio' : 'aviso'
    );
  }

  function agregarRenglon() {
    var api = window.Libreria.api;
    var libroId = api.idNumerico(nodoLibro.value);
    var cantidad = Number(nodoCantidad.value);

    if (libroId === null) {
      aviso(nodoAvisoLibro, 'Elegí un libro de la lista.', 'error');
      nodoLibro.focus();
      return;
    }

    if (!window.Libreria.validaciones.cantidadValida(cantidad)) {
      aviso(nodoAvisoLibro, 'La cantidad debe ser un entero mayor que cero.', 'error');
      nodoCantidad.focus();
      return;
    }

    var libro = libros.filter(function (registro) {
      return Number(registro.id) === libroId;
    })[0];

    if (!libro) {
      aviso(nodoAvisoLibro, 'El libro elegido ya no está en la lista: volvé a buscarlo.', 'error');
      return;
    }

    if (ajustes.alAgregar) {
      ajustes.alAgregar(libro, cantidad);
    }
    nodoCantidad.value = '1';
  }

  function campo(texto, control) {
    return window.Libreria.ui.crearCampo(texto, control);
  }

  function grupo(leyenda) {
    var fieldset = document.createElement('fieldset');
    fieldset.className = 'grupo-venta';
    var legend = document.createElement('legend');
    legend.className = 'campo__etiqueta';
    legend.textContent = leyenda;
    fieldset.appendChild(legend);
    return fieldset;
  }

  window.Libreria.ventasFormulario = {
    crear: function (opciones) {
      var ui = window.Libreria.ui;
      ajustes = opciones || {};
      libros = [];

      var formulario = document.createElement('form');
      formulario.className = 'formulario vista-ventas__formulario';
      formulario.setAttribute('novalidate', '');
      formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
      });

      /* Cliente */
      var grupoCliente = grupo('Cliente');
      nodoCliente = document.createElement('select');
      nodoCliente.id = 'venta-cliente';
      nodoCliente.name = 'clienteId';
      nodoCliente.className = 'control';
      nodoCliente.appendChild(opcion('', '— Elegí un cliente —'));
      nodoCliente.addEventListener('change', function () {
        if (ajustes.alElegirCliente) {
          ajustes.alElegirCliente(nodoCliente.value);
        }
      });
      grupoCliente.appendChild(campo('Cliente de la venta', nodoCliente));

      var campoClienteId = document.createElement('div');
      campoClienteId.className = 'campo';
      var etiquetaClienteId = document.createElement('label');
      etiquetaClienteId.className = 'campo__etiqueta';
      etiquetaClienteId.setAttribute('for', 'venta-cliente-id');
      etiquetaClienteId.textContent = 'Buscar cliente por ID';
      campoClienteId.appendChild(etiquetaClienteId);

      var filaCliente = document.createElement('div');
      filaCliente.className = 'fila';
      nodoClienteId = document.createElement('input');
      nodoClienteId.id = 'venta-cliente-id';
      nodoClienteId.name = 'cliente_id';
      nodoClienteId.type = 'number';
      nodoClienteId.min = '1';
      nodoClienteId.step = '1';
      nodoClienteId.inputMode = 'numeric';
      nodoClienteId.className = 'control';

      nodoBotonCliente = document.createElement('button');
      nodoBotonCliente.type = 'button';
      nodoBotonCliente.className = 'boton boton--secundario';
      nodoBotonCliente.textContent = 'Buscar cliente';
      nodoBotonCliente.addEventListener('click', buscarCliente);

      filaCliente.appendChild(nodoClienteId);
      filaCliente.appendChild(nodoBotonCliente);
      campoClienteId.appendChild(filaCliente);
      grupoCliente.appendChild(campoClienteId);

      nodoAvisoCliente = document.createElement('div');
      nodoAvisoCliente.className = 'grupo-venta__estado';
      grupoCliente.appendChild(nodoAvisoCliente);
      formulario.appendChild(grupoCliente);

      /* Renglón */
      var grupoRenglon = grupo('Agregar un libro');
      nodoTitulo = document.createElement('input');
      nodoTitulo.id = 'venta-buscar-titulo';
      nodoTitulo.name = 'titulo';
      nodoTitulo.type = 'search';
      nodoTitulo.className = 'control';
      nodoTitulo.setAttribute('autocomplete', 'off');
      grupoRenglon.appendChild(campo('Buscar libros por título', nodoTitulo));

      var accionesBusqueda = document.createElement('div');
      accionesBusqueda.className = 'campo__acciones';
      var botonBuscar = document.createElement('button');
      botonBuscar.type = 'button';
      botonBuscar.className = 'boton boton--secundario';
      botonBuscar.textContent = 'Buscar libros';
      botonBuscar.addEventListener('click', buscarLibros);
      accionesBusqueda.appendChild(botonBuscar);
      grupoRenglon.appendChild(accionesBusqueda);

      nodoLibro = document.createElement('select');
      nodoLibro.id = 'venta-libro';
      nodoLibro.name = 'libroId';
      nodoLibro.className = 'control';
      nodoLibro.appendChild(opcion('', '— Elegí un libro —'));
      grupoRenglon.appendChild(campo('Libro', nodoLibro));

      nodoCantidad = document.createElement('input');
      nodoCantidad.id = 'venta-cantidad';
      nodoCantidad.name = 'cantidad';
      nodoCantidad.type = 'number';
      nodoCantidad.min = '1';
      nodoCantidad.step = '1';
      nodoCantidad.inputMode = 'numeric';
      nodoCantidad.value = '1';
      nodoCantidad.className = 'control';
      grupoRenglon.appendChild(campo('Cantidad', nodoCantidad));

      var accionesAgregar = document.createElement('div');
      accionesAgregar.className = 'campo__acciones';
      nodoBotonAgregar = document.createElement('button');
      nodoBotonAgregar.type = 'button';
      nodoBotonAgregar.className = 'boton boton--primario';
      nodoBotonAgregar.textContent = 'Agregar renglón';
      nodoBotonAgregar.addEventListener('click', agregarRenglon);
      accionesAgregar.appendChild(nodoBotonAgregar);
      grupoRenglon.appendChild(accionesAgregar);

      nodoAvisoLibro = document.createElement('div');
      nodoAvisoLibro.className = 'grupo-venta__estado';
      grupoRenglon.appendChild(nodoAvisoLibro);
      formulario.appendChild(grupoRenglon);

      return {
        formulario: formulario,
        fijarClientes: function (clientes, seleccionado) {
          fijarOpcionesCliente(clientes, seleccionado);
        },
        cargarLibros: function (lista) {
          libros = Array.isArray(lista) ? lista.slice() : [];
          fijarOpcionesLibro('');
        },
        avisoLibro: function (texto, tipo) {
          aviso(nodoAvisoLibro, texto, tipo);
        },
        avisoCliente: function (texto, tipo) {
          aviso(nodoAvisoCliente, texto, tipo);
        },
        seleccionarCliente: function (id) {
          nodoCliente.value = id === null || id === undefined ? '' : String(id);
        },
        deshabilitarAgregar: function (valor) {
          ui.deshabilitar(nodoBotonAgregar, valor);
        }
      };
    }
  };
}());
