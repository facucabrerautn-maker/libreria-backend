/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/generos-formulario.js
 * Responsabilidad: armar el formulario de alta y edición de géneros y leer sus
 * valores.
 *
 * Nombre obligatorio y único: la unicidad la decide la API (409). El mismo
 * formulario sirve para editar con cargar() y fijarModoEdicion().
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  var nodoTitulo = null;
  var nodoBoton = null;
  var nodoCancelar = null;
  var alCancelar = null;

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
    return { nombre: valorDe(formulario, 'nombre') };
  }

  function limpiar(formulario) {
    fijarValor(formulario, 'nombre', '');
  }

  function cargar(formulario, datos) {
    var registro = datos || {};
    fijarValor(formulario, 'nombre', registro.nombre);
  }

  function fijarModoEdicion(activo) {
    var editando = Boolean(activo);
    if (nodoTitulo) {
      nodoTitulo.textContent = editando ? 'Editar género' : 'Registrar género';
    }
    if (nodoBoton) {
      nodoBoton.textContent = editando ? 'Guardar cambios' : 'Registrar género';
    }
    if (nodoCancelar) {
      nodoCancelar.hidden = !editando;
    }
  }

  function armarFormulario(alEnviar) {
    var formulario = document.createElement('form');
    formulario.className = 'formulario vista-generos__formulario';
    formulario.setAttribute('novalidate', '');

    nodoTitulo = document.createElement('h2');
    nodoTitulo.className = 'formulario__titulo';
    nodoTitulo.textContent = 'Registrar género';
    formulario.appendChild(nodoTitulo);

    var control = document.createElement('input');
    control.id = 'genero-nombre';
    control.name = 'nombre';
    control.type = 'text';
    control.className = 'control';
    control.setAttribute('required', '');
    control.setAttribute('autocomplete', 'off');
    formulario.appendChild(window.Libreria.ui.crearCampo('Nombre', control));

    var acciones = document.createElement('div');
    acciones.className = 'campo__acciones';
    nodoBoton = document.createElement('button');
    nodoBoton.type = 'submit';
    nodoBoton.className = 'boton boton--primario';
    nodoBoton.textContent = 'Registrar género';
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

  window.Libreria.generosFormulario = {
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
          var campo = formulario.querySelector('[name="nombre"]');
          if (campo) {
            campo.focus();
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
