/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/generos-formulario.js
 * Responsabilidad: armar el formulario de alta de géneros y leer sus valores.
 *
 * Nombre obligatorio y único: la unicidad la decide la API (409). El envío se
 * controla con preventDefault.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  var nodoBoton = null;

  function valorDe(formulario, nombre) {
    var control = formulario ? formulario.querySelector('[name="' + nombre + '"]') : null;
    if (!control) {
      return '';
    }
    return control.value === null || control.value === undefined ? '' : String(control.value);
  }

  function leer(formulario) {
    return { nombre: valorDe(formulario, 'nombre') };
  }

  function limpiar(formulario) {
    var control = formulario ? formulario.querySelector('[name="nombre"]') : null;
    if (control) {
      control.value = '';
    }
  }

  function armarFormulario(alEnviar) {
    var formulario = document.createElement('form');
    formulario.className = 'formulario vista-generos__formulario';
    formulario.setAttribute('novalidate', '');

    var titulo = document.createElement('h2');
    titulo.className = 'formulario__titulo';
    titulo.textContent = 'Registrar género';
    formulario.appendChild(titulo);

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
      var formulario = armarFormulario(ajustes.alEnviar);
      return {
        formulario: formulario,
        leer: function () { return leer(formulario); },
        limpiar: function () { limpiar(formulario); },
        deshabilitar: function (valor) {
          window.Libreria.ui.deshabilitar(nodoBoton, valor);
        }
      };
    }
  };
}());
