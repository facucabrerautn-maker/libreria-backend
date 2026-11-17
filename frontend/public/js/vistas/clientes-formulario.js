/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/clientes-formulario.js
 * Responsabilidad: armar el formulario de alta y edición de clientes y leer sus
 * valores.
 *
 * Nombre completo en un solo campo y email con type="email". El mismo formulario
 * sirve para editar con cargar() y fijarModoEdicion(). El envío se controla con
 * preventDefault; la unicidad del email la decide la API.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  var nodoTitulo = null;
  var nodoBoton = null;
  var nodoCancelar = null;
  var alCancelar = null;

  function crearCampo(id, etiqueta, control) {
    return window.Libreria.ui.crearCampo(etiqueta, control);
  }

  function crearEntrada(id, nombre, etiqueta, tipo, autocompletado) {
    var control = document.createElement('input');
    control.id = id;
    control.name = nombre;
    control.type = tipo;
    control.className = 'control';
    control.setAttribute('required', '');
    control.setAttribute('autocomplete', autocompletado);
    return crearCampo(id, etiqueta, control);
  }

  function valorDe(formulario, nombre) {
    var control = formulario ? formulario.querySelector('[name="' + nombre + '"]') : null;
    if (!control) {
      return '';
    }
    return control.value === null || control.value === undefined ? '' : String(control.value);
  }

  function fijarValor(formulario, nombre, valor) {
    var control = formulario ? formulario.querySelector('[name="' + nombre + '"]') : null;
    if (control) {
      control.value = valor === null || valor === undefined ? '' : String(valor);
    }
  }

  function leer(formulario) {
    return { nombre: valorDe(formulario, 'nombre'), email: valorDe(formulario, 'email') };
  }

  function limpiar(formulario) {
    ['nombre', 'email'].forEach(function (nombre) {
      fijarValor(formulario, nombre, '');
    });
  }

  function cargar(formulario, datos) {
    var registro = datos || {};
    fijarValor(formulario, 'nombre', registro.nombre);
    fijarValor(formulario, 'email', registro.email);
  }

  function fijarModoEdicion(activo) {
    var editando = Boolean(activo);
    if (nodoTitulo) {
      nodoTitulo.textContent = editando ? 'Editar cliente' : 'Registrar cliente';
    }
    if (nodoBoton) {
      nodoBoton.textContent = editando ? 'Guardar cambios' : 'Registrar cliente';
    }
    if (nodoCancelar) {
      nodoCancelar.hidden = !editando;
    }
  }

  function armarFormulario(alEnviar) {
    var formulario = document.createElement('form');
    formulario.className = 'formulario vista-clientes__formulario';
    formulario.setAttribute('novalidate', '');

    nodoTitulo = document.createElement('h2');
    nodoTitulo.className = 'formulario__titulo';
    nodoTitulo.textContent = 'Registrar cliente';
    formulario.appendChild(nodoTitulo);

    formulario.appendChild(crearEntrada('cliente-nombre', 'nombre', 'Nombre completo', 'text', 'name'));
    formulario.appendChild(crearEntrada('cliente-email', 'email', 'Email', 'email', 'email'));

    var acciones = document.createElement('div');
    acciones.className = 'campo__acciones';
    nodoBoton = document.createElement('button');
    nodoBoton.type = 'submit';
    nodoBoton.className = 'boton boton--primario';
    nodoBoton.textContent = 'Registrar cliente';
    acciones.appendChild(nodoBoton);

    nodoCancelar = document.createElement('button');
    nodoCancelar.type = 'button';
    nodoCancelar.className = 'boton boton--secundario';
    nodoCancelar.textContent = 'Cancelar edición';
    nodoCancelar.hidden = true;
    nodoCancelar.addEventListener('click', function () {
      if (typeof alCancelar === 'function') {
        alCancelar();
      }
    });
    acciones.appendChild(nodoCancelar);

    formulario.appendChild(acciones);

    formulario.addEventListener('submit', function (evento) {
      evento.preventDefault();
      if (typeof alEnviar === 'function') {
        alEnviar(leer(formulario), formulario);
      }
    });
    return formulario;
  }

  window.Libreria.clientesFormulario = {
    crear: function (opciones) {
      var ajustes = opciones || {};
      alCancelar = ajustes.alCancelar;
      var formulario = armarFormulario(ajustes.alEnviar);
      return {
        formulario: formulario,
        leer: function () { return leer(formulario); },
        limpiar: function () { limpiar(formulario); },
        cargar: function (datos) { cargar(formulario, datos); },
        fijarModoEdicion: fijarModoEdicion,
        enfocar: function () {
          var control = formulario.querySelector('[name="nombre"]');
          if (control) {
            control.focus();
          }
        },
        deshabilitar: function (valor) {
          window.Libreria.ui.deshabilitar(nodoBoton, valor);
          window.Libreria.ui.deshabilitar(nodoCancelar, valor);
        }
      };
    }
  };
}());
