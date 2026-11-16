/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/catalogo-fichas.js
 * Responsabilidad: armar la ficha de un libro del catálogo.
 *
 * La ficha muestra título, ISBN, editorial, género, precio y stock. Los
 * autores no vienen en el listado: se consultan en el detalle (GET /libros/{id})
 * desde el botón «Ver autores», que la vista conecta por callback.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  var TEXTO_SIN_GENERO = 'Sin clasificar';
  var TEXTO_SIN_DATO = window.Libreria.modelo.TEXTO_SIN_DATO;

  function par(termino, valor, clase) {
    var dt = document.createElement('dt');
    dt.className = 'ficha__etiqueta';
    dt.textContent = termino;

    var dd = document.createElement('dd');
    dd.className = clase ? 'ficha__valor ' + clase : 'ficha__valor';
    dd.textContent = valor;
    return [dt, dd];
  }

  /** Lista de autorías del detalle: nombre, rol y orden. */
  function crearListaAutores(autorias) {
    if (!autorias || autorias.length === 0) {
      var vacio = document.createElement('p');
      vacio.className = 'mensaje mensaje--vacio';
      vacio.textContent = 'El detalle del libro no informó autores.';
      return vacio;
    }

    var lista = document.createElement('ul');
    lista.className = 'lista-autores';
    autorias
      .slice()
      .sort(function (a, b) {
        return (a.orden || 0) - (b.orden || 0);
      })
      .forEach(function (autoria) {
        var item = document.createElement('li');
        item.textContent = autoria.nombre || ('Autor #' + autoria.autorId);
        if (autoria.rol && autoria.rol !== 'autor') {
          var rol = document.createElement('span');
          rol.className = 'badge badge--acento';
          rol.textContent = autoria.rol;
          item.appendChild(rol);
        }
        lista.appendChild(item);
      });
    return lista;
  }

  /**
   * Ficha de un libro. `opciones.alVerAutores(libro, contenedorDetalle, boton)`
   * conecta la consulta del detalle; sin callback, la ficha no muestra botón.
   */
  function crearFicha(libro, opciones) {
    if (!libro) {
      return null;
    }
    var config = opciones || {};
    var modelo = window.Libreria.modelo;
    var ui = window.Libreria.ui;

    var ficha = document.createElement('article');
    ficha.className = 'tarjeta';

    var cabecera = document.createElement('div');
    cabecera.className = 'tarjeta__cabecera';

    var titulo = document.createElement('h2');
    titulo.className = 'tarjeta__titulo';
    titulo.textContent = modelo.texto(libro.titulo) || 'Libro sin título';
    cabecera.appendChild(titulo);

    var genero = modelo.generoDeLibro(libro);
    var badge = document.createElement('span');
    badge.className = genero ? 'badge badge--acento' : 'badge badge--sin-clasificar';
    badge.textContent = genero || TEXTO_SIN_GENERO;
    cabecera.appendChild(badge);

    ficha.appendChild(cabecera);

    var datos = document.createElement('dl');
    datos.className = 'ficha';
    var editorial = modelo.editorialDeLibro(libro);
    par('ISBN', modelo.texto(libro.isbn) || TEXTO_SIN_DATO)
      .forEach(function (nodo) { datos.appendChild(nodo); });
    par('Editorial', editorial || TEXTO_SIN_DATO)
      .forEach(function (nodo) { datos.appendChild(nodo); });
    par('Precio', ui.formatearMonto(libro.precio), 'ficha__precio')
      .forEach(function (nodo) { datos.appendChild(nodo); });
    if (libro.stock !== undefined && libro.stock !== null) {
      par('Stock', String(modelo.numero(libro.stock)))
        .forEach(function (nodo) { datos.appendChild(nodo); });
    }
    ficha.appendChild(datos);

    if (typeof config.alVerAutores === 'function') {
      var pie = document.createElement('div');
      pie.className = 'tarjeta__pie';

      var detalle = document.createElement('div');
      detalle.className = 'detalle-libro';
      detalle.id = 'detalle-libro-' + modelo.texto(libro.id);
      detalle.hidden = true;

      var boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'boton boton--secundario';
      boton.textContent = 'Ver autores';
      boton.setAttribute('aria-expanded', 'false');
      boton.setAttribute('aria-controls', detalle.id);

      boton.addEventListener('click', function () {
        var abierto = boton.getAttribute('aria-expanded') === 'true';
        boton.setAttribute('aria-expanded', abierto ? 'false' : 'true');
        detalle.hidden = abierto;
        boton.textContent = abierto ? 'Ver autores' : 'Ocultar autores';
        if (!abierto) {
          config.alVerAutores(libro, detalle, boton);
        }
      });

      pie.appendChild(boton);
      ficha.appendChild(pie);
      ficha.appendChild(detalle);
    }

    return ficha;
  }

  window.Libreria.catalogoFichas = {
    crearFicha: crearFicha,
    crearListaAutores: crearListaAutores
  };
}());
