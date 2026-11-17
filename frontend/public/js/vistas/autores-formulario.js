/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/autores-formulario.js
 * Responsabilidad: armar el formulario de alta y edición de autores y leer sus
 * valores.
 *
 * Nombre obligatorio y nacionalidad opcional. El mismo formulario sirve para
 * editar: la vista lo llena con cargar() y cambia el modo con fijarModoEdicion().
 * El envío se controla con preventDefault; la validez final de los datos la
 * decide la API (422).
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  var nodoTitulo = null;
  var nodoBoton = null;
  var nodoCancelar = null;
  var alCancelar = null;

  function crearEntrada(id, nombre, etiqueta, tipo, autocompletado, obligatorio) {
    var control = document.createElement('input');
    control.id = id;
    control.name = nombre;
    control.type = tipo;
    control.className = 'control';
    if (obligatorio) {
      control.setAttribute('required', '');
    }
    control.setAttribute('autocomplete', autocompletado);
    return window.Libreria.ui.crearCampo(etiqueta, control);
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
    return {
      nombre: valorDe(formulario, 'nombre'),
      nacionalidad: valorDe(formulario, 'nacionalidad')
    };
  }

  function limpiar(formulario) {
    ['nombre', 'nacionalidad'].forEach(function (nombre) {
      fijarValor(formulario, nombre, '');
    });
  }

  function cargar(formulario, datos) {
    var registro = datos || {};
    fijarValor(formulario, 'nombre', registro.nombre);
    fijarValor(formulario, 'nacionalidad', registro.nacionalidad);
  }

  function fijarModoEdicion(activo) {
    var editando = Boolean(activo);
    if (nodoTitulo) {
      nodoTitulo.textContent = editando ? 'Editar autor' : 'Registrar autor';
    }
    if (nodoBoton) {
      nodoBoton.textContent = editando ? 'Guardar cambios' : 'Registrar autor';
    }
    if (nodoCancelar) {
      nodoCancelar.hidden = !editando;
    }
  }

  function armarFormulario(alEnviar) {
    var formulario = document.createElement('form');
    formulario.className = 'formulario vista-autores__formulario';
    formulario.setAttribute('novalidate', '');

    nodoTitulo = document.createElement('h2');
    nodoTitulo.className = 'formulario__titulo';
    nodoTitulo.textContent = 'Registrar autor';
    formulario.appendChild(nodoTitulo);

    formulario.appendChild(crearEntrada('autor-nombre', 'nombre', 'Nombre', 'text', 'name', true));
    formulario.appendChild(
      crearEntrada(
        'autor-nacionalidad',
        'nacionalidad',
        'Nacionalidad (opcional)',
        'text',
        'country-name',
        false
      )
    );

    var acciones = document.createElement('div');
    acciones.className = 'campo__acciones';
    nodoBoton = document.createElement('button');
    nodoBoton.type = 'submit';
    nodoBoton.className = 'boton boton--primario';
    nodoBoton.textContent = 'Registrar autor';
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

  window.Libreria.autoresFormulario = {
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
