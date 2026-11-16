/*
 * Librería — Global de Programación III.
 * Módulo: js/app.js
 * Responsabilidad: bootstrap, ruteo por hash y montaje de la vista activa.
 *
 * La aplicación es una única página con cinco secciones. Cada cambio de hash
 * desmonta la vista anterior, delega el render en su módulo, marca el enlace
 * activo y mueve el foco al h1. Los datos llegan de la API: este módulo no
 * hidrata ni persiste nada.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  var RUTAS = {
    catalogo: 'vista-catalogo',
    libros: 'vista-libros',
    clientes: 'vista-clientes',
    ventas: 'vista-ventas',
    historial: 'vista-historial'
  };

  var RUTA_INICIAL = 'catalogo';
  var SELECTOR_ENLACES = 'nav a[href]';
  var SELECTOR_REGION = '.region-mensajes';
  var CLASE_REGION = 'region-mensajes';
  var CLASE_ACTIVA = 'enlace-nav--activo';

  var rutaMontada = null;
  var arranqueHecho = false;

  /** Resuelve un hash contra RUTAS sin leer location ni el DOM. */
  function resolverRuta(hash) {
    var texto = typeof hash === 'string' ? hash : '';
    var sinAlmohadilla = texto.charAt(0) === '#' ? texto.slice(1) : texto;
    var nombre = sinAlmohadilla.replace(/^\/+/, '').toLowerCase();

    if (Object.prototype.hasOwnProperty.call(RUTAS, nombre)) {
      return { nombre: nombre, seccion: RUTAS[nombre], desconocida: false };
    }
    return { nombre: RUTA_INICIAL, seccion: RUTAS[RUTA_INICIAL], desconocida: true };
  }

  function obtenerSeccion(nombreVista, contenedor) {
    if (contenedor && contenedor.id === RUTAS[nombreVista]) {
      return contenedor;
    }
    return document.getElementById(RUTAS[nombreVista]);
  }

  /* Desmonta el contenido renderizado sin borrar el h1 ni la región de avisos. */
  function vaciarContenido(seccion) {
    var region = seccion.querySelector(SELECTOR_REGION);
    Array.prototype.forEach.call(seccion.children, function (hijo) {
      if (hijo === region || hijo.tagName === 'H1') {
        return;
      }
      seccion.removeChild(hijo);
    });
    if (region) {
      window.Libreria.ui.vaciar(region);
      region.removeAttribute('aria-busy');
    }
  }

  function marcarEnlaceActivo(nombreVista) {
    Array.prototype.forEach.call(document.querySelectorAll(SELECTOR_ENLACES), function (enlace) {
      var href = enlace.getAttribute('href') || '';
      var nombre = href.charAt(0) === '#' ? href.slice(1).replace(/^\/+/, '') : '';
      if (nombre === nombreVista) {
        enlace.setAttribute('aria-current', 'page');
        enlace.classList.add(CLASE_ACTIVA);
      } else {
        enlace.removeAttribute('aria-current');
        enlace.classList.remove(CLASE_ACTIVA);
      }
    });
  }

  /** Monta la vista pedida y mueve el foco a su encabezado. */
  function montarVista(nombreVista, contenedor) {
    var seccion = obtenerSeccion(nombreVista, contenedor);
    if (!seccion) {
      return null;
    }

    Array.prototype.forEach.call(document.querySelectorAll('main section'), function (otra) {
      vaciarContenido(otra);
      otra.hidden = true;
    });

    vaciarContenido(seccion);
    seccion.hidden = false;

    var modulo = (window.Libreria.vistas || {})[nombreVista];
    if (modulo && typeof modulo.render === 'function') {
      var fragmento = modulo.render(seccion);
      if (fragmento && fragmento.childNodes && fragmento.childNodes.length) {
        seccion.appendChild(fragmento);
      }
    }

    marcarEnlaceActivo(nombreVista);
    rutaMontada = nombreVista;

    var encabezado = seccion.querySelector('h1');
    if (!window.Libreria.ui.moverFoco(encabezado)) {
      window.Libreria.ui.moverFoco(document.querySelector('main'));
    }
    return seccion;
  }

  function textoAvisoRuta(hashSolicitado) {
    if (hashSolicitado === '' || hashSolicitado === '#' || hashSolicitado === '#/') {
      return 'No se indicó ninguna ruta: se muestra la vista Catálogo.';
    }
    return 'La ruta solicitada «' + hashSolicitado + '» no existe: se muestra la vista Catálogo.';
  }

  function avisarRutaDesconocida(hashSolicitado) {
    var seccion = document.getElementById(RUTAS[RUTA_INICIAL]);
    var region = seccion ? seccion.querySelector(SELECTOR_REGION) : null;
    if (!region) {
      return null;
    }
    return window.Libreria.ui.mostrarMensaje(region, textoAvisoRuta(hashSolicitado), 'aviso');
  }

  function aplicarRuta(hashSolicitado) {
    var ruta = resolverRuta(hashSolicitado);
    var hashEsperado = '#/' + ruta.nombre;

    if (hashSolicitado !== hashEsperado) {
      location.replace(hashEsperado);
    }

    if (ruta.nombre !== rutaMontada) {
      montarVista(ruta.nombre);
    }

    if (ruta.desconocida) {
      avisarRutaDesconocida(hashSolicitado);
    }
    return ruta.nombre;
  }

  function alCambiarHash() {
    aplicarRuta(location.hash);
  }

  /** Navega a otra vista por hash (lo usan los enlaces internos). */
  function irA(nombreVista) {
    var nombre = Object.prototype.hasOwnProperty.call(RUTAS, nombreVista) ? nombreVista : RUTA_INICIAL;
    location.hash = '#/' + nombre;
    return nombre;
  }

  /* Avisa a la vista activa que cambió el estado en memoria. */
  function avisarCambioDelEstado() {
    if (!rutaMontada) {
      return false;
    }
    var modulo = (window.Libreria.vistas || {})[rutaMontada];
    if (!modulo || typeof modulo.alCambiarElEstado !== 'function') {
      return false;
    }
    modulo.alCambiarElEstado();
    return true;
  }

  function iniciar() {
    if (arranqueHecho) {
      return rutaMontada;
    }
    arranqueHecho = true;

    window.Libreria.estado.alCambiar(avisarCambioDelEstado);
    window.addEventListener('hashchange', alCambiarHash);

    return aplicarRuta(location.hash);
  }

  window.Libreria.app = {
    iniciar: iniciar,
    montarVista: montarVista,
    irA: irA
  };

  window.Libreria.app.iniciar();
}());
