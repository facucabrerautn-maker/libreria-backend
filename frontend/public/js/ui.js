/*
 * Librería — Global de Programación III.
 * Módulo: js/ui.js
 * Responsabilidad: helpers de DOM, mensajes, estados de carga y formato.
 *
 * Todo el contenido se inserta como texto: createElement + textContent, nunca
 * markup interpolado. Los helpers no conocen el dominio ni llaman a la API;
 * reciben resultados ya normalizados.
 */
(function () {
  'use strict';

  window.Libreria = window.Libreria || {};

  /* Campos de la API que se muestran junto a un control del formulario. */
  var CAMPOS_API = {
    editorial_id: 'editorialId',
    genero_id: 'generoId',
    cliente_id: 'clienteId',
    libro_id: 'libroId',
    precio_unitario: 'precioUnitario'
  };

  function aTexto(valor) {
    return valor === null || valor === undefined ? '' : String(valor);
  }

  function crear(etiqueta, texto, clase) {
    var elemento = document.createElement(etiqueta);
    if (texto !== null && texto !== undefined) {
      elemento.textContent = aTexto(texto);
    }
    if (typeof clase === 'string' && clase !== '') {
      elemento.className = clase;
    }
    return elemento;
  }

  function recorrer(nodos, fn) {
    Array.prototype.forEach.call(nodos || [], fn);
  }

  /** Vacía un contenedor sin reemplazar el nodo (conserva sus escuchas). */
  function vaciar(contenedor) {
    if (!contenedor) {
      return false;
    }
    while (contenedor.firstChild) {
      contenedor.removeChild(contenedor.firstChild);
    }
    return true;
  }

  /** Campo de formulario con etiqueta asociada, ayuda y contenedor `.campo`. */
  function crearCampo(etiqueta, control, opciones) {
    var config = opciones || {};
    var campo = document.createElement('div');
    campo.className = 'campo';

    var label = document.createElement('label');
    label.className = 'campo__etiqueta';
    label.setAttribute('for', control.id);
    label.textContent = aTexto(etiqueta);
    campo.appendChild(label);
    campo.appendChild(control);

    if (config.ayuda) {
      var ayuda = crear('p', config.ayuda, 'campo__ayuda');
      ayuda.id = control.id + '-ayuda';
      campo.appendChild(ayuda);
      control.setAttribute('aria-describedby', ayuda.id);
    }
    return campo;
  }

  /** Marca un control inválido y asocia el texto del error (aria-describedby). */
  function marcarCampo(formulario, campo, mensaje, repetidos) {
    var control = formulario.querySelector('[name="' + campo + '"]');
    if (!control) {
      return null;
    }

    repetidos[campo] = (repetidos[campo] || 0) + 1;
    var id = repetidos[campo] > 1 ? 'error-' + campo + '-' + repetidos[campo] : 'error-' + campo;

    var textoError = crear('p', mensaje, 'campo__error');
    textoError.id = id;
    var envoltura = control.closest ? control.closest('.campo') : null;
    if (envoltura) {
      envoltura.appendChild(textoError);
    } else if (control.parentNode) {
      control.parentNode.appendChild(textoError);
    }

    control.setAttribute('aria-invalid', 'true');
    var previo = control.getAttribute('aria-describedby');
    control.setAttribute('aria-describedby', previo ? previo + ' ' + id : id);
    return textoError;
  }

  window.Libreria.ui = {
    crearElemento: function (etiqueta, texto, clase) {
      return crear(etiqueta, texto, clase);
    },

    crearCampo: crearCampo,

    /** Celda de tabla que admite texto o un nodo (por ejemplo, un botón). */
    crearCelda: function (contenido) {
      var celda = document.createElement('td');
      if (contenido instanceof Node) {
        celda.appendChild(contenido);
      } else {
        celda.textContent = aTexto(contenido);
      }
      return celda;
    },

    /**
     * Celda de acciones con botones. Cada acción: { texto, alHacer, clase?, etiqueta? }.
     * Devuelve un nodo listo para usar como celda de crearTabla.
     */
    crearAcciones: function (acciones) {
      var contenedor = document.createElement('div');
      contenedor.className = 'acciones-tabla';
      (acciones || []).forEach(function (accion) {
        var boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'boton ' + (accion.clase || 'boton--secundario') + ' boton--compacto';
        boton.textContent = aTexto(accion.texto);
        if (accion.etiqueta) {
          boton.setAttribute('aria-label', accion.etiqueta);
        }
        if (typeof accion.alHacer === 'function') {
          boton.addEventListener('click', accion.alHacer);
        }
        contenedor.appendChild(boton);
      });
      return contenedor;
    },

    /** Casilla con etiqueta, para filtros de listado. Devuelve el contenedor. */
    crearCasilla: function (id, etiqueta, alCambiar) {
      var contenedor = document.createElement('div');
      contenedor.className = 'casilla';

      var control = document.createElement('input');
      control.type = 'checkbox';
      control.id = id;
      control.name = id;

      var label = document.createElement('label');
      label.setAttribute('for', id);
      label.textContent = aTexto(etiqueta);

      if (typeof alCambiar === 'function') {
        control.addEventListener('change', function () {
          alCambiar(control.checked);
        });
      }

      contenedor.appendChild(control);
      contenedor.appendChild(label);
      return contenedor;
    },

    /** Tabla con encabezados de columna; las celdas aceptan texto o nodos. */
    crearTabla: function (encabezados, filas, opciones) {
      var config = opciones || {};
      var titulos = encabezados || [];
      var contenido = filas || [];

      var contenedor = document.createElement('div');
      contenedor.className = 'tabla-contenedor';

      var tabla = document.createElement('table');
      tabla.className = config.claseTabla ? config.claseTabla : 'tabla';

      if (config.titulo) {
        var leyenda = document.createElement('caption');
        leyenda.textContent = aTexto(config.titulo);
        tabla.appendChild(leyenda);
      }

      var cabecera = document.createElement('thead');
      var filaCabecera = document.createElement('tr');
      titulos.forEach(function (titulo) {
        var celda = crear('th', titulo);
        celda.setAttribute('scope', 'col');
        filaCabecera.appendChild(celda);
      });
      cabecera.appendChild(filaCabecera);
      tabla.appendChild(cabecera);

      var cuerpo = document.createElement('tbody');
      if (contenido.length === 0) {
        if (config.vacia) {
          var filaVacia = document.createElement('tr');
          var celdaVacia = crear('td', config.vacia, 'vacia');
          celdaVacia.setAttribute('colspan', String(titulos.length || 1));
          filaVacia.appendChild(celdaVacia);
          cuerpo.appendChild(filaVacia);
        }
      } else {
        contenido.forEach(function (fila) {
          var filaCuerpo = document.createElement('tr');
          (fila || []).forEach(function (valor) {
            filaCuerpo.appendChild(
              valor instanceof Node ? window.Libreria.ui.crearCelda(valor) : crear('td', valor)
            );
          });
          cuerpo.appendChild(filaCuerpo);
        });
      }
      tabla.appendChild(cuerpo);
      contenedor.appendChild(tabla);
      return contenedor;
    },

    /** Mensaje de resultado: exito, error, aviso, vacio o cargando. */
    mostrarMensaje: function (contenedor, texto, tipo) {
      var clase = 'mensaje';
      if (typeof tipo === 'string' && tipo !== '') {
        clase += ' mensaje--' + tipo;
      }
      var mensaje = crear('p', texto, clase);
      if (contenedor && typeof contenedor.appendChild === 'function') {
        contenedor.appendChild(mensaje);
      }
      return mensaje;
    },

    /** Estado de carga con aria-busy en el contenedor que se está llenando. */
    mostrarCargando: function (contenedor, texto) {
      if (contenedor) {
        contenedor.setAttribute('aria-busy', 'true');
      }
      return window.Libreria.ui.mostrarMensaje(
        contenedor,
        texto || 'Cargando datos desde la API…',
        'cargando'
      );
    },

    /** Quita el estado de carga y libera aria-busy. */
    quitarCargando: function (contenedor) {
      if (!contenedor) {
        return false;
      }
      contenedor.removeAttribute('aria-busy');
      recorrer(contenedor.querySelectorAll('.mensaje--cargando'), function (nodo) {
        if (nodo.parentNode) {
          nodo.parentNode.removeChild(nodo);
        }
      });
      return true;
    },

    /** Inserta la lista de errores; cada uno queda junto a su control. */
    mostrarErrores: function (contenedor, errores, opciones) {
      var config = opciones || {};
      var formulario = config.formulario || null;
      var repetidos = {};

      var lista = document.createElement('ul');
      lista.className = 'lista-errores';

      (errores || []).forEach(function (error) {
        var campo = error && error.campo ? aTexto(error.campo) : '';
        var mensaje = error && error.mensaje !== undefined ? aTexto(error.mensaje) : aTexto(error);
        var item = document.createElement('li');
        item.setAttribute('data-campo', campo);
        item.textContent = mensaje;
        lista.appendChild(item);
        if (formulario && campo !== '') {
          marcarCampo(formulario, campo, mensaje, repetidos);
        }
      });

      if (contenedor && typeof contenedor.appendChild === 'function') {
        contenedor.appendChild(lista);
      }
      return lista;
    },

    /** Borra los errores previos y desmarca los controles. */
    limpiarErrores: function (contenedor, formulario) {
      var ids = [];
      if (formulario) {
        recorrer(formulario.querySelectorAll('.campo__error'), function (nodo) {
          var id = nodo.getAttribute('id');
          if (id) {
            ids.push(id);
          }
          if (nodo.parentNode) {
            nodo.parentNode.removeChild(nodo);
          }
        });
        recorrer(formulario.querySelectorAll('[aria-invalid="true"]'), function (control) {
          control.removeAttribute('aria-invalid');
          var descrito = control.getAttribute('aria-describedby');
          if (!descrito) {
            return;
          }
          var quedan = descrito.split(/\s+/).filter(function (token) {
            return token !== '' && ids.indexOf(token) === -1;
          });
          if (quedan.length > 0) {
            control.setAttribute('aria-describedby', quedan.join(' '));
          } else {
            control.removeAttribute('aria-describedby');
          }
        });
      }
      if (contenedor && typeof contenedor.querySelectorAll === 'function') {
        recorrer(contenedor.querySelectorAll('.lista-errores'), function (nodo) {
          if (nodo.parentNode) {
            nodo.parentNode.removeChild(nodo);
          }
        });
      }
      return true;
    },

    /** Convierte el detalle 422 de FastAPI en errores por campo para el formulario. */
    erroresDeApi: function (resultado) {
      var cuerpo = resultado && resultado.cuerpo;
      var detalle = cuerpo && typeof cuerpo === 'object' ? cuerpo.detail : null;
      if (!Array.isArray(detalle)) {
        return [];
      }
      return detalle.map(function (item) {
        var loc = Array.isArray(item.loc) ? item.loc : [];
        var base = '';
        for (var i = 0; i < loc.length; i += 1) {
          var parte = loc[i];
          if (parte !== 'body' && parte !== 'query' && !/^\d+$/.test(String(parte))) {
            base = String(parte);
            break;
          }
        }
        return {
          campo: CAMPOS_API[base] || base,
          mensaje: aTexto(item.msg || 'Dato inválido.')
        };
      });
    },

    /** Texto legible para mostrar el error que devolvió la API. */
    mensajeDeApi: function (resultado) {
      if (resultado && typeof resultado.error === 'string') {
        return resultado.error;
      }
      return 'Ocurrió un error inesperado al comunicarse con la API.';
    },

    /** Activa o desactiva un control (botones durante el envío). */
    deshabilitar: function (control, valor) {
      if (!control) {
        return false;
      }
      control.disabled = Boolean(valor);
      return true;
    },

    moverFoco: function (elemento) {
      if (elemento && typeof elemento.focus === 'function') {
        elemento.focus();
        return true;
      }
      return false;
    },

    enfocarPrimerError: function (contenedor) {
      if (!contenedor || typeof contenedor.querySelector !== 'function') {
        return false;
      }
      return window.Libreria.ui.moverFoco(contenedor.querySelector('[aria-invalid="true"]'));
    },

    /** Importe con dos decimales, sin símbolo ni separador de miles. */
    formatearMonto: function (monto) {
      var numero = Number(monto);
      if (!Number.isFinite(numero)) {
        return '0.00';
      }
      return numero.toFixed(2);
    },

    /** Fecha dd/mm/aaaa; acepta ISO 8601 del backend o un Date. */
    formatearFecha: function (fecha) {
      if (!fecha) {
        return '';
      }
      var momento = fecha instanceof Date ? fecha : new Date(fecha);
      if (Number.isNaN(momento.getTime())) {
        return '';
      }
      var dia = aTexto(momento.getDate());
      var mes = aTexto(momento.getMonth() + 1);
      if (dia.length < 2) {
        dia = '0' + dia;
      }
      if (mes.length < 2) {
        mes = '0' + mes;
      }
      return dia + '/' + mes + '/' + momento.getFullYear();
    },

    esVacio: function (valor) {
      if (valor === null || valor === undefined) {
        return true;
      }
      if (typeof valor === 'string') {
        return valor.trim() === '';
      }
      if (Array.isArray(valor)) {
        return valor.length === 0;
      }
      return false;
    },

    vaciar: vaciar
  };
}());
