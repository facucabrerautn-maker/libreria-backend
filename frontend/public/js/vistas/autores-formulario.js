/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/autores-formulario.js
 * Responsabilidad: armar el formulario de alta de autores y leer sus valores.
 *
 * Nombre obligatorio y nacionalidad opcional. El envío se controla con
 * preventDefault; la validez final de los datos la decide la API (422).
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  var nodoBoton = null;

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

  function leer(formulario) {
    return {
      nombre: valorDe(formulario, 'nombre'),
      nacionalidad: valorDe(formulario, 'nacionalidad')
    };
  }

  function limpiar(formulario) {
    ['nombre', 'nacionalidad'].forEach(function (nombre) {
      var control = formulario ? formulario.querySelector('[name="' + nombre + '"]') : null;
      if (control) {
        control.value = '';
      }
    });
  }

  function armarFormulario(alEnviar) {
    var formulario = document.createElement('form');
    formulario.className = 'formulario vista-autores__formulario';
    formulario.setAttribute('novalidate', '');

    var titulo = document.createElement('h2');
    titulo.className = 'formulario__titulo';
    titulo.textContent = 'Registrar autor';
    formulario.appendChild(titulo);

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
