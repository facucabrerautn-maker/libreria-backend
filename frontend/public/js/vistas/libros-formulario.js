/*
 * Librería — Global de Programación III.
 * Módulo: js/vistas/libros-formulario.js
 * Responsabilidad: armar el formulario de alta de libros, leer sus valores y
 * limpiarlo.
 *
 * Editorial y género salen de GET /editoriales/ y GET /generos/. Los autores se
 * agregan por ID: cada ID se verifica con GET /autores/{id} y se muestra el
 * nombre antes de incorporarlo, con su rol de autoría y su orden.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  var ROLES = ['autor', 'coautor', 'traductor', 'ilustrador'];
  var autores = [];
  var nodoLista = null;
  var nodoEstadoAutor = null;
  var nodoBotonEnviar = null;
  var nodoCancelar = null;
  var nodoTitulo = null;
  var nodoAutorId = null;
  var nodoEditorial = null;
  var nodoGenero = null;
  var alCancelar = null;

  function crearSelect(id, nombre, etiqueta) {
    var control = document.createElement('select');
    control.id = id;
    control.name = nombre;
    control.className = 'control';
    var campo = window.Libreria.ui.crearCampo(etiqueta, control);
    return { control: control, campo: campo };
  }

  function fijarOpciones(control, opciones) {
    var previo = control.value;
    window.Libreria.ui.vaciar(control);
    (opciones || []).forEach(function (opcion) {
      var item = document.createElement('option');
      item.value = opcion.valor;
      item.textContent = opcion.texto;
      control.appendChild(item);
    });
    if (opciones && opciones.some(function (opcion) { return opcion.valor === previo; })) {
      control.value = previo;
    }
  }

  function crearEntrada(id, nombre, etiqueta, tipo, atributos) {
    var control = document.createElement('input');
    control.id = id;
    control.name = nombre;
    control.type = tipo;
    control.className = 'control';
    (atributos || []).forEach(function (atributo) {
      control.setAttribute(atributo[0], atributo[1]);
    });
    return window.Libreria.ui.crearCampo(etiqueta, control);
  }

  function pintarAutores() {
    if (!nodoLista) {
      return;
    }
    window.Libreria.ui.vaciar(nodoLista);
    autores.forEach(function (autoria, indice) {
      var item = document.createElement('li');
      item.className = 'autor-item';

      var nombre = document.createElement('span');
      nombre.className = 'autor-item__nombre';
      nombre.textContent = (indice + 1) + '. ' + autoria.nombre + ' (ID ' + autoria.autorId + ')';

      var rol = document.createElement('select');
      rol.className = 'control control--compacto';
      rol.setAttribute('aria-label', 'Rol de ' + autoria.nombre);
      ROLES.forEach(function (nombreRol) {
        var opcion = document.createElement('option');
        opcion.value = nombreRol;
        opcion.textContent = nombreRol;
        rol.appendChild(opcion);
      });
      rol.value = autoria.rol;
      rol.addEventListener('change', function () {
        autoria.rol = rol.value;
      });

      var quitar = document.createElement('button');
      quitar.type = 'button';
      quitar.className = 'boton boton--secundario';
      quitar.textContent = 'Quitar';
      quitar.setAttribute('aria-label', 'Quitar autor ' + autoria.nombre);
      quitar.addEventListener('click', function () {
        autores = autores.filter(function (otra) {
          return otra !== autoria;
        });
        pintarAutores();
      });

      item.appendChild(nombre);
      item.appendChild(rol);
      item.appendChild(quitar);
      nodoLista.appendChild(item);
    });
  }

  function avisoAutor(texto, tipo) {
    if (!nodoEstadoAutor) {
      return;
    }
    window.Libreria.ui.vaciar(nodoEstadoAutor);
    if (texto) {
      window.Libreria.ui.mostrarMensaje(nodoEstadoAutor, texto, tipo || 'aviso');
    }
  }

  async function agregarAutor() {
    var api = window.Libreria.api;
    var id = api.idNumerico(nodoAutorId.value);
    avisoAutor('');

    if (id === null) {
      avisoAutor('Escribí un ID de autor entero mayor que cero.', 'error');
      nodoAutorId.focus();
      return;
    }

    if (autores.some(function (autoria) { return Number(autoria.autorId) === id; })) {
      avisoAutor('Ese autor ya está agregado a la lista.', 'aviso');
      return;
    }

    avisoAutor('Verificando el autor en la API…', 'cargando');
    nodoAutorId.disabled = true;

    var resultado = await api.obtenerAutor(id);
    nodoAutorId.disabled = false;

    if (!resultado.ok) {
      avisoAutor(
        resultado.estado === 404
          ? 'No existe un autor con el ID ' + id + '.'
          : window.Libreria.ui.mensajeDeApi(resultado),
        'error'
      );
      return;
    }

    var autor = window.Libreria.estado.recordarAutor(resultado.datos);
    autores.push({ autorId: autor.id, nombre: autor.nombre, rol: 'autor', orden: autores.length + 1 });
    pintarAutores();
    nodoAutorId.value = '';
    nodoAutorId.focus();
    avisoAutor('Autor agregado: ' + autor.nombre + '.', 'exito');
  }

  function crearGrupoAutores() {
    var grupo = document.createElement('fieldset');
    grupo.className = 'grupo-autores';

    var leyenda = document.createElement('legend');
    leyenda.className = 'campo__etiqueta';
    leyenda.textContent = 'Autorías';
    grupo.appendChild(leyenda);

    var ayuda = document.createElement('p');
    ayuda.className = 'campo__ayuda';
    ayuda.id = 'libro-autores-ayuda';
    ayuda.textContent =
      'Cada autor se verifica contra la API (GET /autores/{id}) y se muestra su nombre ' +
      'antes de agregarlo. Podés cambiar el rol de cada autoría.';
    grupo.appendChild(ayuda);

    var campo = document.createElement('div');
    campo.className = 'campo';
    var etiqueta = document.createElement('label');
    etiqueta.className = 'campo__etiqueta';
    etiqueta.setAttribute('for', 'libro-autor-id');
    etiqueta.textContent = 'ID de autor';
    campo.appendChild(etiqueta);

    var fila = document.createElement('div');
    fila.className = 'fila';

    nodoAutorId = document.createElement('input');
    nodoAutorId.id = 'libro-autor-id';
    nodoAutorId.name = 'autor_id';
    nodoAutorId.type = 'number';
    nodoAutorId.min = '1';
    nodoAutorId.step = '1';
    nodoAutorId.inputMode = 'numeric';
    nodoAutorId.className = 'control';
    nodoAutorId.setAttribute('aria-describedby', ayuda.id);

    var agregar = document.createElement('button');
    agregar.type = 'button';
    agregar.className = 'boton boton--secundario';
    agregar.textContent = 'Agregar autor';
    agregar.addEventListener('click', agregarAutor);

    nodoAutorId.addEventListener('keydown', function (evento) {
      if (evento.key === 'Enter') {
        evento.preventDefault();
        agregarAutor();
      }
    });

    fila.appendChild(nodoAutorId);
    fila.appendChild(agregar);
    campo.appendChild(fila);
    grupo.appendChild(campo);

    nodoEstadoAutor = document.createElement('div');
    nodoEstadoAutor.className = 'grupo-autores__estado';
    grupo.appendChild(nodoEstadoAutor);

    nodoLista = document.createElement('ul');
    nodoLista.className = 'lista-autores lista-autores--editable';
    grupo.appendChild(nodoLista);

    return grupo;
  }

  function valorDe(formulario, nombre) {
    var control = formulario.querySelector('[name="' + nombre + '"]');
    if (!control) {
      return '';
    }
    var valor = control.value;
    return valor === null || valor === undefined ? '' : String(valor).trim();
  }

  function leer(formulario) {
    var generoId = valorDe(formulario, 'generoId');
    return {
      titulo: valorDe(formulario, 'titulo'),
      isbn: valorDe(formulario, 'isbn'),
      precio: valorDe(formulario, 'precio'),
      stock: valorDe(formulario, 'stock'),
      editorialId: valorDe(formulario, 'editorialId'),
      generoId: generoId === '' ? null : generoId,
      autores: autores.map(function (autoria, indice) {
        return { autorId: autoria.autorId, rol: autoria.rol, orden: indice + 1 };
      })
    };
  }

  function fijarValor(formulario, nombre, valor) {
    var control = formulario.querySelector('[name="' + nombre + '"]');
    if (control) {
      control.value = valor === null || valor === undefined ? '' : String(valor);
    }
  }

  function limpiar(formulario) {
    ['titulo', 'isbn', 'precio', 'stock', 'editorialId', 'generoId', 'autor_id'].forEach(function (nombre) {
      fijarValor(formulario, nombre, '');
    });
    autores = [];
    pintarAutores();
    avisoAutor('');
  }

  /** Llena el formulario con un libro del detalle (GET /libros/{id}). */
  function cargar(formulario, datos) {
    var libro = datos || {};
    fijarValor(formulario, 'titulo', libro.titulo);
    fijarValor(formulario, 'isbn', libro.isbn);
    fijarValor(formulario, 'precio', libro.precio);
    fijarValor(formulario, 'stock', libro.stock);
    fijarValor(formulario, 'editorialId', libro.editorial_id);
    fijarValor(
      formulario,
      'generoId',
      libro.genero_id === null || libro.genero_id === undefined ? '' : libro.genero_id
    );

    autores = window.Libreria.modelo.autoresDeLibro(libro).map(function (autoria, indice) {
      return {
        autorId: autoria.autorId,
        nombre: autoria.nombre || 'Autor #' + autoria.autorId,
        rol: ROLES.indexOf(autoria.rol) === -1 ? 'autor' : autoria.rol,
        orden: indice + 1
      };
    });
    pintarAutores();
    avisoAutor('');
  }

  function fijarModoEdicion(activo) {
    var editando = Boolean(activo);
    if (nodoTitulo) {
      nodoTitulo.textContent = editando ? 'Editar libro' : 'Registrar libro';
    }
    if (nodoBotonEnviar) {
      nodoBotonEnviar.textContent = editando ? 'Guardar cambios' : 'Registrar libro';
    }
    if (nodoCancelar) {
      nodoCancelar.hidden = !editando;
    }
  }

  function crearFormulario(alEnviar) {
    var ui = window.Libreria.ui;
    autores = [];

    var formulario = document.createElement('form');
    formulario.className = 'formulario vista-libros__formulario';
    formulario.setAttribute('novalidate', '');

    nodoTitulo = document.createElement('h2');
    nodoTitulo.className = 'formulario__titulo';
    nodoTitulo.textContent = 'Registrar libro';
    formulario.appendChild(nodoTitulo);

    formulario.appendChild(
      crearEntrada('libro-titulo', 'titulo', 'Título', 'text', [['required', '']])
    );
    formulario.appendChild(
      crearEntrada('libro-isbn', 'isbn', 'ISBN', 'text', [['required', ''], ['maxlength', '20']])
    );
    formulario.appendChild(
      crearEntrada('libro-precio', 'precio', 'Precio', 'number', [
        ['required', ''],
        ['min', '0.01'],
        ['step', '0.01'],
        ['inputmode', 'decimal']
      ])
    );
    formulario.appendChild(
      crearEntrada('libro-stock', 'stock', 'Stock', 'number', [
        ['required', ''],
        ['min', '0'],
        ['step', '1'],
        ['inputmode', 'numeric'],
        ['value', '0']
      ])
    );

    var editorial = crearSelect('libro-editorial', 'editorialId', 'Editorial');
    nodoEditorial = editorial.control;
    fijarOpciones(nodoEditorial, [{ valor: '', texto: 'Cargando editoriales…' }]);
    nodoEditorial.setAttribute('required', '');
    formulario.appendChild(editorial.campo);

    var genero = crearSelect('libro-genero', 'generoId', 'Género');
    nodoGenero = genero.control;
    fijarOpciones(nodoGenero, [{ valor: '', texto: 'Sin clasificar' }]);
    formulario.appendChild(genero.campo);

    formulario.appendChild(crearGrupoAutores());

    var acciones = document.createElement('div');
    acciones.className = 'campo__acciones';
    nodoBotonEnviar = document.createElement('button');
    nodoBotonEnviar.type = 'submit';
    nodoBotonEnviar.className = 'boton boton--primario';
    nodoBotonEnviar.textContent = 'Registrar libro';
    acciones.appendChild(nodoBotonEnviar);

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

  window.Libreria.librosFormulario = {
    crear: function (opciones) {
      var ajustes = opciones || {};
      alCancelar = ajustes.alCancelar;
      var formulario = crearFormulario(ajustes.alEnviar);
      return {
        formulario: formulario,
        leer: function () { return leer(formulario); },
        limpiar: function () { limpiar(formulario); },
        cargar: function (datos) { cargar(formulario, datos); },
        fijarModoEdicion: fijarModoEdicion,
        enfocar: function () {
          var control = formulario.querySelector('[name="titulo"]');
          if (control) {
            control.focus();
          }
        },
        deshabilitar: function (valor) {
          window.Libreria.ui.deshabilitar(nodoBotonEnviar, valor);
          window.Libreria.ui.deshabilitar(nodoCancelar, valor);
        },
        cargarCatalogos: function (editoriales, generos) {
          fijarOpciones(nodoEditorial, [{ valor: '', texto: 'Elegí una editorial' }].concat(
            editoriales.map(function (editorial) {
              return { valor: String(editorial.id), texto: editorial.nombre };
            })
          ));
          fijarOpciones(nodoGenero, [{ valor: '', texto: 'Sin clasificar' }].concat(
            generos.map(function (genero) {
              return { valor: String(genero.id), texto: genero.nombre };
            })
          ));
        }
      };
    }
  };
}());
