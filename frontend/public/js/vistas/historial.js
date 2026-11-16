/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/historial.js
 * Responsabilidad: vista Historial: ventas registradas y detalle histórico.
 *
 * El listado sale de GET /ventas/ (paginado con limit/offset) y el detalle de
 * GET /ventas/{id}. Los importes que se muestran son los que devuelve la API:
 * nunca se recalculan con el precio actual del catálogo. La vista no edita ni
 * borra ventas.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};
  window.Libreria.vistas = window.Libreria.vistas || {};

  var LIMITE = 20;
  var ENCABEZADOS = ['Identificador', 'Fecha', 'Cliente', 'Total', 'Detalle'];

  var nodoListado = null;
  var nodoPaginacion = null;
  var nodoDetalle = null;
  var offset = 0;
  var total = null;
  var totalConocido = null;
  var token = 0;

  function crearBotonDetalle(id) {
    var boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'boton boton--secundario';
    boton.textContent = 'Ver detalle';
    boton.setAttribute('aria-label', 'Ver el detalle de la venta ' + id);
    boton.addEventListener('click', function () {
      mostrarDetalle(id, boton);
    });
    return boton;
  }

  function fila(venta) {
    var modelo = window.Libreria.modelo;
    var ui = window.Libreria.ui;
    return [
      venta.id === undefined || venta.id === null ? '—' : String(venta.id),
      ui.formatearFecha(venta.fecha) || modelo.TEXTO_SIN_DATO,
      modelo.nombreClienteDeVenta(venta),
      ui.formatearMonto(modelo.totalDeVenta(venta)),
      crearBotonDetalle(venta.id)
    ];
  }

  function mostrarErrorDeConexion(resultado) {
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

  function mostrarVacio() {
    var ui = window.Libreria.ui;
    ui.vaciar(nodoListado);
    ui.mostrarMensaje(
      nodoListado,
      'El historial todavía no tiene ventas registradas. Cada venta que confirmes desde la vista Ventas aparecerá aquí con los importes que devolvió la API.',
      'vacio'
    );
    var parrafo = document.createElement('p');
    parrafo.className = 'mensaje-estado__accion';
    var enlace = document.createElement('a');
    enlace.href = '#/ventas';
    enlace.textContent = 'Ir a Ventas';
    parrafo.appendChild(enlace);
    nodoListado.appendChild(parrafo);
  }

  async function cargarListado() {
    var ui = window.Libreria.ui;
    var api = window.Libreria.api;
    var actual = ++token;

    ui.vaciar(nodoListado);
    ui.vaciar(nodoPaginacion);
    if (nodoDetalle) {
      ui.vaciar(nodoDetalle);
      nodoDetalle.hidden = true;
    }
    ui.mostrarCargando(nodoListado, 'Consultando las ventas registradas…');

    var resultado = await api.listarVentas({ limit: LIMITE, offset: offset });
    if (actual !== token) {
      return;
    }

    ui.quitarCargando(nodoListado);
    ui.vaciar(nodoListado);

    if (!resultado.ok) {
      mostrarErrorDeConexion(resultado);
      return;
    }

    var ventas = resultado.datos.items;
    total = resultado.datos.total;

    if (ventas.length === 0) {
      if (offset > 0) {
        totalConocido = offset;
        offset = Math.max(0, offset - LIMITE);
        cargarListado();
        return;
      }
      mostrarVacio();
      return;
    }
    if (total === null && totalConocido !== null) {
      total = totalConocido;
    }

    nodoListado.appendChild(
      ui.crearTabla(ENCABEZADOS, ventas.map(fila), {
        claseTabla: 'tabla tabla-historial',
        titulo: 'Ventas registradas',
        vacia: 'No hay ventas en esta página.'
      })
    );

    nodoPaginacion.appendChild(
      window.Libreria.paginacion.crear({
        offset: offset,
        total: total,
        cantidad: ventas.length,
        limite: LIMITE,
        etiqueta: 'ventas',
        alCambiar: function (nuevoOffset) {
          offset = nuevoOffset;
          cargarListado();
        }
      })
    );
  }

  async function mostrarDetalle(id, disparador) {
    var ui = window.Libreria.ui;
    var api = window.Libreria.api;
    var ventaId = api.idNumerico(id);

    ui.vaciar(nodoDetalle);
    nodoDetalle.hidden = false;

    if (ventaId === null) {
      ui.mostrarMensaje(nodoDetalle, 'La venta no tiene un identificador válido.', 'error');
      return;
    }

    if (disparador) {
      ui.deshabilitar(disparador, true);
    }
    ui.mostrarCargando(nodoDetalle, 'Consultando el detalle de la venta ' + ventaId + '…');

    var resultado = await api.obtenerVenta(ventaId);
    ui.quitarCargando(nodoDetalle);
    ui.vaciar(nodoDetalle);

    if (disparador) {
      ui.deshabilitar(disparador, false);
    }

    if (!resultado.ok) {
      ui.mostrarMensaje(nodoDetalle, ui.mensajeDeApi(resultado), 'error');
      return;
    }

    nodoDetalle.appendChild(
      window.Libreria.ventasDetalle.crear(resultado.datos, {
        titulo: 'Detalle de la venta'
      })
    );
    ui.moverFoco(nodoDetalle.querySelector('h2'));
  }

  window.Libreria.vistas.historial = {
    render: function (seccion) {
      var fragmento = document.createDocumentFragment();

      offset = 0;
      total = null;
      totalConocido = null;

      var contenedor = document.createElement('div');
      contenedor.className = 'vista-historial__listado';

      nodoListado = document.createElement('div');
      nodoListado.className = 'listado';

      nodoPaginacion = document.createElement('div');
      nodoPaginacion.className = 'vista__paginacion';

      nodoDetalle = document.createElement('div');
      nodoDetalle.className = 'vista-historial__detalle';
      nodoDetalle.hidden = true;

      contenedor.appendChild(nodoListado);
      contenedor.appendChild(nodoPaginacion);
      contenedor.appendChild(nodoDetalle);
      fragmento.appendChild(contenedor);

      cargarListado();
      return fragmento;
    },

    alCambiarElEstado: function () {
      return cargarListado();
    }
  };
}());
