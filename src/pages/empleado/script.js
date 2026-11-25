let errorTimer = null;

function mostrarError(msg) {
  const errorMsg = document.getElementById('error-msg');
  if (!errorMsg) return alert(msg);

  errorMsg.textContent = msg;
  errorMsg.classList.add('visible');
  errorMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Cancelamos el timer anterior para que un error viejo no oculte uno nuevo
  clearTimeout(errorTimer);
  errorTimer = setTimeout(() => errorMsg.classList.remove('visible'), 4000);
}

// ======================================================
// VALIDACIONES (mismo patrón que Clientes)
// ======================================================

const CAMPOS_EMPLEADO = ['nombre', 'apellido', 'direccion', 'codigo_postal'];

const REGLAS_EMPLEADO = {
  nombre:         val => /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'\- ]{2,50}$/.test(val),
  apellido:       val => /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'\- ]{2,50}$/.test(val),
  direccion:      val => val.length >= 3 && val.length <= 100,
  codigo_postal:  val => /^\d{4,10}$/.test(val)
};

function limpiarMensajeCampo(id) {
  const err = document.getElementById(`err-${id}`);
  const input = document.getElementById(id);
  if (err && input?.dataset.errorDefault) {
    err.textContent = input.dataset.errorDefault;
  }
}

function setError(id, mensaje) {
  const input = document.getElementById(id);
  const err = document.getElementById(`err-${id}`);
  if (!input) return;

  input.classList.remove('valid');
  input.classList.add('error');

  // Re-dispara la animación de sacudida
  input.style.animation = 'none';
  void input.offsetHeight;
  input.style.animation = '';

  if (err) {
    err.textContent = mensaje || input.dataset.errorDefault || err.textContent;
    err.classList.add('visible');
  }
}

function setValid(id) {
  const input = document.getElementById(id);
  const err = document.getElementById(`err-${id}`);
  if (!input) return;

  input.classList.remove('error');
  input.classList.add('valid');

  if (err) {
    limpiarMensajeCampo(id);
    err.classList.remove('visible');
  }
}

function validarCampo(id) {
  const input = document.getElementById(id);
  if (!input) return true;

  const regla = REGLAS_EMPLEADO[id.replace(/^mod-/, '')];
  const valido = !!regla && regla(input.value.trim());

  valido ? setValid(id) : setError(id);
  return valido;
}

function validarFormulario(prefijo = '') {
  let valido = true;
  let primerInvalido = null;

  CAMPOS_EMPLEADO.forEach(campo => {
    const id = `${prefijo}${campo}`;
    if (!document.getElementById(id)) return;

    if (!validarCampo(id)) {
      valido = false;
      if (!primerInvalido) primerInvalido = document.getElementById(id);
    }
  });

  if (primerInvalido) primerInvalido.focus();
  return valido;
}

function inicializarValidaciones(prefijo = '') {
  CAMPOS_EMPLEADO.forEach(campo => {
    const input = document.getElementById(`${prefijo}${campo}`);
    const err = document.getElementById(`err-${prefijo}${campo}`);
    if (!input) return;

    // Guardamos el mensaje original para poder restaurarlo
    if (err && !input.dataset.errorDefault) {
      input.dataset.errorDefault = err.textContent.trim();
    }

    input.addEventListener('blur', () => validarCampo(input.id));
    input.addEventListener('input', () => {
      const errorMsg = document.getElementById('error-msg');
      if (errorMsg) errorMsg.classList.remove('visible');
      if (input.classList.contains('error')) validarCampo(input.id);
    });
  });
}

function valorCampo(prefijo, campo) {
  return (document.getElementById(`${prefijo}${campo}`)?.value || '').trim();
}

// ======================================================
// LISTA DE EMPLEADOS
// ======================================================

if (document.getElementById('contenedor') && document.getElementById('empleados-count')) {

  const contenedor = document.getElementById('contenedor');
  const contador = document.getElementById('empleados-count');
  const btnAdd = document.getElementById('btn-add-empleado');
  const btnHome = document.getElementById('home');

  async function cargarEmpleados() {

    try {

      const empleados = await window.empleadosAPI.getEmpleados();

      contenedor.innerHTML = '';
      contador.textContent = empleados.length;

      empleados.forEach((emp) => {

        const card = document.createElement('div');
        card.className = 'empleado-card';

        card.innerHTML = `
          <div class="empleado-info">
            <strong>${emp.nombre} ${emp.apellido}</strong>
            <span>${emp.direccion || 'Sin dirección'}</span>
            <span class="especialidades-tags">${emp.especialidades || 'Sin especialidades'}</span>
          </div>

          <div class="empleado-acciones">
            <button class="btn-editar" data-id="${emp.id_empleado}">
              Editar
            </button>

            <button class="btn-eliminar" data-id="${emp.id_empleado}">
              Desactivar
            </button>
          </div>
        `;

        contenedor.appendChild(card);

      });

      contenedor.querySelectorAll('.btn-editar').forEach((btn) => {

        btn.addEventListener('click', () => {

          window.location.href = `./modificarEmpleado.html?id=${btn.dataset.id}`;

        });

      });

      contenedor.querySelectorAll('.btn-eliminar').forEach((btn) => {

        btn.addEventListener('click', () => {

          window.location.href = `./eliminarEmpleado.html?id=${btn.dataset.id}`;

        });

      });

    } catch (err) {

      mostrarError('No se pudieron cargar los empleados.');
      console.error(err);

    }

  }

  btnAdd?.addEventListener('click', () => {

    window.location.href = '../usuarios/agregarUsuario.html?origen=empleados';

  });

  btnHome?.addEventListener('click', () => {

    window.location.href = '../../index.html';

  });

  cargarEmpleados();

}

// ======================================================
// MODIFICAR EMPLEADO
// ======================================================

if (document.getElementById('form-modificar-empleado')) {

  const form = document.getElementById('form-modificar-empleado');
  const checkboxesContenedor = document.getElementById('mod-especialidades-checkboxes');
  const btnVolver = document.getElementById('btn-volver-lista');
  const btnEliminar = document.getElementById('btn-eliminar-empleado');
  const btnGuardar = form.querySelector('button[type="submit"]');

  const params = new URLSearchParams(window.location.search);
  const idEmpleado = params.get('id');
  const idNumerico = Number(idEmpleado);

  let idValido =
    idEmpleado !== null &&
    String(idEmpleado).trim() !== '' &&
    Number.isInteger(idNumerico) &&
    idNumerico > 0;

  function deshabilitarFormulario() {
    idValido = false;
    form.querySelectorAll('input, button').forEach((el) => {
      el.disabled = true;
    });
  }

  function obtenerDatosEmpleado() {
    return {
      nombre: valorCampo('mod-', 'nombre'),
      apellido: valorCampo('mod-', 'apellido'),
      direccion: valorCampo('mod-', 'direccion'),
      codigo_postal: valorCampo('mod-', 'codigo_postal')
    };
  }

  function marcarCheckboxes(especialidades, seleccionadas) {

    checkboxesContenedor.innerHTML = '';

    especialidades.forEach((esp) => {

      const marcado = seleccionadas.some(
        (s) => Number(s.id_especialidad) === esp.id_especialidad
      );

      const label = document.createElement('label');

      label.className = 'checkbox-item';

      label.innerHTML = `
        <input type="checkbox" value="${esp.id_especialidad}" ${marcado ? 'checked' : ''}>
        ${esp.titulo}
      `;

      checkboxesContenedor.appendChild(label);

    });

  }

  async function cargarDatos() {

    if (!idValido) return;

    try {

      const [empleado, especialidades] = await Promise.all([
        window.empleadosAPI.getEmpleadoById(idNumerico),
        window.especialidadesAPI.getEspecialidades()
      ]);

      if (!empleado) {
        mostrarError('No se encontró el empleado.');
        deshabilitarFormulario();
        return;
      }

      document.getElementById('mod-nombre').value = empleado.nombre || '';
      document.getElementById('mod-apellido').value = empleado.apellido || '';
      document.getElementById('mod-direccion').value = empleado.direccion || '';
      document.getElementById('mod-codigo_postal').value = empleado.codigo_postal || '';

      marcarCheckboxes(especialidades, empleado.especialidades || []);

    } catch (err) {

      mostrarError('No se pudieron cargar los datos del empleado.');
      console.error(err);
      deshabilitarFormulario();

    }

  }

  if (!idValido) {
    mostrarError('No se especificó un empleado válido para modificar.');
    deshabilitarFormulario();
  }

  inicializarValidaciones('mod-');

  form.addEventListener('submit', async (e) => {

    e.preventDefault();

    if (!idValido) return;

    // Validación de formato de todos los campos
    if (!validarFormulario('mod-')) {
      mostrarError('Revisá los campos marcados.');
      return;
    }

    const datos = obtenerDatosEmpleado();

    const especialidades = Array.from(
      checkboxesContenedor.querySelectorAll('input[type="checkbox"]:checked')
    ).map(cb => Number(cb.value));

    const textoBoton = btnGuardar?.textContent;
    if (btnGuardar) {
      btnGuardar.disabled = true;
      btnGuardar.textContent = 'Guardando...';
    }

    try {

      const resultado = await window.empleadosAPI.updateEmpleado(idNumerico, {
        ...datos,
        especialidades
      });

      if (!resultado || resultado.changes === 0) {
        mostrarError('El empleado ya no existe. Volvé a la lista e intentá de nuevo.');
        return;
      }

      window.location.href = './empleados.html';

    } catch (err) {

      mostrarError('No se pudieron guardar los cambios.');
      console.error(err);

    } finally {

      if (btnGuardar) {
        btnGuardar.disabled = false;
        btnGuardar.textContent = textoBoton;
      }

    }

  });

  if (btnEliminar) {

    btnEliminar.addEventListener('click', () => {

      if (!idValido) {
        mostrarError('No se encontró el empleado para desactivar.');
        return;
      }

      window.location.href = `./eliminarEmpleado.html?id=${idNumerico}`;

    });

  }

  if (btnVolver) {

    btnVolver.addEventListener('click', () => {

      window.location.href = './empleados.html';

    });

  }

  cargarDatos();

}

// ======================================================
// ELIMINAR EMPLEADO
// ======================================================

if (document.getElementById('btn-confirmar-eliminar')) {

  const btnConfirmar = document.getElementById('btn-confirmar-eliminar');
  const params = new URLSearchParams(window.location.search);
  const idEmpleado = params.get('id');
  const idNumerico = Number(idEmpleado);
  const idValido =
    idEmpleado !== null &&
    String(idEmpleado).trim() !== '' &&
    Number.isInteger(idNumerico) &&
    idNumerico > 0;

  if (!idValido) {
    mostrarError('No se encontró el empleado a desactivar.');
    btnConfirmar.disabled = true;
  }

  btnConfirmar.addEventListener('click', async () => {

    if (!idValido) return;

    const textoBoton = btnConfirmar.textContent;
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = 'Desactivando...';

    try {

      await window.empleadosAPI.deleteEmpleado(idNumerico);

      window.location.href = './empleados.html';

    } catch (err) {

      mostrarError('No se pudo desactivar el empleado.');
      console.error(err);
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = textoBoton;

    }

  });

  document.getElementById('btn-cancelar-eliminar')?.addEventListener('click', () => {

    window.location.href = './empleados.html';

  });

}
