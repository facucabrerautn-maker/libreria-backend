/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/ventas.js
 * Responsabilidad: vista Ventas: borrador, confirmación y respuesta de la API.
 *
 * El borrador (cliente + renglones) vive en Libreria.estado: sobrevive al
 * cambio de vista y a un rechazo 409 / 422, y solo se vacía cuando la API
 * confirma la venta con 201. El total que se muestra antes de confirmar es una
 * vista previa con el precio del catálogo; los importes definitivos son los que
 * devuelve POST /ventas/ y se muestran en el detalle.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};
  window.Libreria.vistas = window.Libreria.vistas || {};

  var SELECTOR_REGION = '.region-mensajes';

  var nodoRegion = null;
  var nodoRenglones = null;
  var nodoPanel = null;
  var nodoConfirmacion = null;
  var piezasFormulario = null;
  var nodoBotonConfirmar = null;
  var nodoBotonVaciar = null;
  var nodoTotal = null;
  var nodoClienteResumen = null;
  var nodoConteo = null;
  var enviando = false;

  function mostrarResultado(texto, tipo) {
    var ui = window.Libreria.ui;
    ui.vaciar(nodoRegion);
    if (nodoRegion) {
      ui.mostrarMensaje(nodoRegion, texto, tipo);
    }
  }

  function nombreDelCliente(id) {
    var cliente = window.Libreria.estado.obtenerCliente(id);
    if (cliente) {
      return cliente.nombre + ' (ID ' + cliente.id + ')';
    }
    return id === '' || id === null || id === undefined ? 'Sin elegir' : 'Cliente #' + id;
  }

  /** Repinta el panel y la tabla del borrador sin reconstruir el formulario. */
  function pintarBorrador() {
    if (!nodoRenglones) {
      return false;
    }
    var ui = window.Libreria.ui;
    var borrador = window.Libreria.estado.borrador();
    var renglones = borrador.renglones;

    ui.vaciar(nodoRenglones);
    nodoRenglones.appendChild(
      window.Libreria.ventasRenglones.crear(renglones, {
        alCambiarCantidad: function (libroId, cantidad) {
          window.Libreria.estado.cambiarCantidad(libroId, cantidad);
        },
        alQuitar: function (libroId) {
          window.Libreria.estado.quitarRenglon(libroId);
        }
      })
    );

    nodoClienteResumen.textContent = nombreDelCliente(borrador.clienteId);
    nodoConteo.textContent = String(renglones.length);
    nodoTotal.textContent = window.Libreria.ui.formatearMonto(
      window.Libreria.validaciones.calcularTotal(renglones)
    );
    nodoBotonConfirmar.disabled = renglones.length === 0 || enviando;
    nodoBotonVaciar.disabled = renglones.length === 0 || enviando;
    return true;
  }

  function crearPanel() {
    var panel = document.createElement('div');
    panel.className = 'panel-resumen';

    function linea(etiqueta, valor, clase) {
      var fila = document.createElement('div');
      fila.className = 'panel-resumen__linea';

      var termino = document.createElement('span');
      termino.className = 'panel-resumen__etiqueta';
      termino.textContent = etiqueta;

      var dato = document.createElement('span');
      dato.className = 'panel-resumen__valor' + (clase ? ' ' + clase : '');
      dato.textContent = valor;

      fila.appendChild(termino);
      fila.appendChild(dato);
      return { fila: fila, valor: dato };
    }

    var cliente = linea('Cliente', 'Sin elegir');
    nodoClienteResumen = cliente.valor;
    panel.appendChild(cliente.fila);

    var conteo = linea('Renglones', '0');
    nodoConteo = conteo.valor;
    panel.appendChild(conteo.fila);

    var total = document.createElement('div');
    total.className = 'panel-resumen__total';
    var etiquetaTotal = document.createElement('span');
    etiquetaTotal.textContent = 'Total estimado';
    nodoTotal = document.createElement('span');
    nodoTotal.className = 'panel-resumen__valor';
    nodoTotal.textContent = '0.00';
    total.appendChild(etiquetaTotal);
    total.appendChild(nodoTotal);
    panel.appendChild(total);

    var ayuda = document.createElement('p');
    ayuda.className = 'campo__ayuda';
    ayuda.textContent =
      'El total es una vista previa con el precio actual del catálogo. ' +
      'Los importes definitivos los calcula la API al confirmar la venta.';
    panel.appendChild(ayuda);

    var acciones = document.createElement('div');
    acciones.className = 'panel-resumen__acciones';

    nodoBotonConfirmar = document.createElement('button');
    nodoBotonConfirmar.type = 'button';
    nodoBotonConfirmar.className = 'boton boton--primario';
    nodoBotonConfirmar.textContent = 'Confirmar venta';
    nodoBotonConfirmar.disabled = true;
    nodoBotonConfirmar.addEventListener('click', confirmar);

    nodoBotonVaciar = document.createElement('button');
    nodoBotonVaciar.type = 'button';
    nodoBotonVaciar.className = 'boton boton--secundario';
    nodoBotonVaciar.textContent = 'Vaciar borrador';
    nodoBotonVaciar.disabled = true;
    nodoBotonVaciar.addEventListener('click', function () {
      window.Libreria.estado.limpiarBorrador();
      piezasFormulario.seleccionarCliente('');
      mostrarResultado('Se vació el borrador de la venta.', 'aviso');
    });

    acciones.appendChild(nodoBotonConfirmar);
    acciones.appendChild(nodoBotonVaciar);
    panel.appendChild(acciones);

    return panel;
  }

  function agregarLibro(libro, cantidad) {
    var borrador = window.Libreria.estado.borrador();
    var repetido = borrador.renglones.some(function (renglon) {
      return String(renglon.libroId) === String(libro.id);
    });

    if (repetido) {
      piezasFormulario.avisoLibro(
        'Ese libro ya está en la venta: cambiá la cantidad desde la tabla de renglones.',
        'aviso'
      );
      return;
    }

    window.Libreria.estado.agregarRenglon({
      libroId: libro.id,
      titulo: libro.titulo,
      isbn: libro.isbn,
      precioUnitario: Number(libro.precio),
      cantidad: cantidad
    });
    piezasFormulario.avisoLibro('Renglón agregado: ' + libro.titulo + '.', 'exito');
  }

  function mostrarErroresDeEnvio(resultado) {
    var ui = window.Libreria.ui;
    ui.vaciar(nodoRegion);

    if (resultado.estado === 422) {
      var errores = ui.erroresDeApi(resultado);
      if (errores.length > 0) {
        ui.mostrarErrores(nodoRegion, errores, { formulario: piezasFormulario.formulario });
        ui.enfocarPrimerError(piezasFormulario.formulario);
        return;
      }
    }

    mostrarResultado(
      ui.mensajeDeApi(resultado) +
        ' El borrador se conserva: corregí lo indicado y volvé a confirmar.',
      'error'
    );
  }

  async function confirmar() {
    var ui = window.Libreria.ui;
    if (enviando) {
      return;
    }

    var borrador = window.Libreria.estado.borrador();
    ui.limpiarErrores(nodoRegion, piezasFormulario.formulario);
    ui.vaciar(nodoRegion);

    var errores = window.Libreria.validaciones.validarVenta({
      clienteId: borrador.clienteId,
      renglones: borrador.renglones
    });
    if (errores.length > 0) {
      ui.mostrarErrores(nodoRegion, errores, { formulario: piezasFormulario.formulario });
      ui.enfocarPrimerError(piezasFormulario.formulario);
      return;
    }

    enviando = true;
    nodoBotonConfirmar.disabled = true;
    nodoBotonConfirmar.textContent = 'Confirmando…';
    ui.mostrarCargando(nodoRegion, 'Enviando la venta a la API…');

    var resultado = await window.Libreria.api.crearVenta({
      clienteId: borrador.clienteId,
      renglones: borrador.renglones
    });

    enviando = false;
    nodoBotonConfirmar.textContent = 'Confirmar venta';
    ui.quitarCargando(nodoRegion);

    if (!resultado.ok) {
      pintarBorrador();
      mostrarErroresDeEnvio(resultado);
      return;
    }

    var venta = resultado.datos || {};
    var cliente = window.Libreria.estado.obtenerCliente(borrador.clienteId);
    if (cliente) {
      window.Libreria.estado.recordarCliente(cliente);
    }
    window.Libreria.estado.limpiarBorrador();
    piezasFormulario.seleccionarCliente('');

    ui.vaciar(nodoConfirmacion);
    nodoConfirmacion.appendChild(
      window.Libreria.ventasDetalle.crear(venta, { titulo: 'Venta confirmada' })
    );
    nodoConfirmacion.hidden = false;

    mostrarResultado(
      'La API confirmó la venta' +
        (venta.id !== undefined && venta.id !== null ? ' con el identificador ' + venta.id : '') +
        '. El detalle muestra los importes devueltos por el servidor.',
      'exito'
    );
    var tituloDetalle = nodoConfirmacion.querySelector('h2');
    ui.moverFoco(tituloDetalle);
  }

  window.Libreria.vistas.ventas = {
    render: function (seccion) {
      var fragmento = document.createDocumentFragment();

      nodoRegion = seccion ? seccion.querySelector(SELECTOR_REGION) : null;
      enviando = false;

      piezasFormulario = window.Libreria.ventasFormulario.crear({
        alElegirCliente: function (valor) {
          window.Libreria.estado.fijarClienteDelBorrador(valor);
        },
        alAgregar: agregarLibro
      });

      var layout = document.createElement('div');
      layout.className = 'vista-ventas__layout';

      var columnaIzquierda = document.createElement('div');
      columnaIzquierda.className = 'vista-ventas__selector';
      columnaIzquierda.appendChild(piezasFormulario.formulario);

      var columnaDerecha = document.createElement('div');
      columnaDerecha.className = 'vista-ventas__renglones';

      var tituloRenglones = document.createElement('h2');
      tituloRenglones.className = 'vista-ventas__detalle-titulo';
      tituloRenglones.textContent = 'Venta en curso';
      columnaDerecha.appendChild(tituloRenglones);

      nodoRenglones = document.createElement('div');
      nodoRenglones.className = 'listado';
      columnaDerecha.appendChild(nodoRenglones);

      nodoPanel = crearPanel();
      columnaDerecha.appendChild(nodoPanel);

      layout.appendChild(columnaIzquierda);
      layout.appendChild(columnaDerecha);
      fragmento.appendChild(layout);

      nodoConfirmacion = document.createElement('div');
      nodoConfirmacion.className = 'vista-ventas__confirmacion';
      nodoConfirmacion.hidden = true;
      fragmento.appendChild(nodoConfirmacion);

      var borrador = window.Libreria.estado.borrador();
      piezasFormulario.fijarClientes(window.Libreria.estado.listarClientes(), borrador.clienteId);
      pintarBorrador();

      apiListarClientes();
      apiListarLibros();

      return fragmento;
    },

    alCambiarElEstado: function () {
      return pintarBorrador();
    }
  };

  /*
   * Carga los clientes activos desde GET /clientes/ para que el selector sea
   * usable sin haber visitado antes la vista Clientes. La baja lógica los
   * excluye del listado: un cliente dado de baja no se puede elegir para vender.
   */
  async function apiListarClientes() {
    var ui = window.Libreria.ui;
    var resultado = await window.Libreria.api.listarClientes({ limit: 100, offset: 0 });
    if (!resultado.ok) {
      piezasFormulario.avisoCliente(
        'No se pudieron cargar los clientes: ' + ui.mensajeDeApi(resultado),
        'error'
      );
      return;
    }

    window.Libreria.estado.fijarClientes(resultado.datos.items);

    var borrador = window.Libreria.estado.borrador();
    piezasFormulario.fijarClientes(window.Libreria.estado.listarClientes(), borrador.clienteId);
    pintarBorrador();

    if (resultado.datos.items.length === 0) {
      piezasFormulario.avisoCliente(
        'No hay clientes activos: cargá uno desde la vista Clientes antes de vender.',
        'vacio'
      );
    }
  }

  async function apiListarLibros() {
    var ui = window.Libreria.ui;
    var resultado = await window.Libreria.api.listarLibros({ limit: 100, offset: 0 });
    if (!resultado.ok) {
      piezasFormulario.avisoLibro(
        'No se pudieron cargar los libros: ' + ui.mensajeDeApi(resultado),
        'error'
      );
      return;
    }
    piezasFormulario.cargarLibros(resultado.datos.items);
    if (resultado.datos.items.length === 0) {
      piezasFormulario.avisoLibro(
        'El catálogo no tiene libros: cargá uno desde la vista Libros antes de vender.',
        'vacio'
      );
    }
  }
}());
