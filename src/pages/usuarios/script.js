  // src/pages/usuarios/script.js
  //
  // Un solo script para las 3 pantallas del módulo, mismo patrón que
  // usa Clientes en su script.js (branching por pathname).

  // ---------- Guarda de acceso: solo Administrador entra a este módulo ----------
  async function protegerAccesoAdministrador() {
    try {
      const usuario = await window.authAPI.getCurrentUser();
      if (!usuario || usuario.rol !== 'administrador') {
        alert('Esta sección es solo para administradores.');
        window.location.href = '../../index.html';
      }
    } catch (error) {
      console.error('Error verificando sesión:', error);
      window.location.href = '../usuarios/login.html';
    }
  }

  // ---------- Origen del alta (empleados) ----------
  function esOrigenEmpleados() {
    return new URLSearchParams(window.location.search).get('origen') === 'empleados';
  }

  function volverAlOrigen() {
    window.location.href = esOrigenEmpleados()
      ? '../empleado/empleados.html'
      : 'usuarios.html';
  }

  // ---------- Navegación general ----------
  document.getElementById('home')?.addEventListener('click', () => {
    window.location.href = '../../index.html';
  });

  document.getElementById('btn-add-usuario')?.addEventListener('click', () => {
    window.location.href = 'agregarUsuario.html';
  });

  document.getElementById('btn-volver-lista')?.addEventListener('click', () => {
    window.location.href = 'usuarios.html';
  });

  document.getElementById('btn-cancelar')?.addEventListener('click', volverAlOrigen);

  document.getElementById('btn-cancelar-eliminar')?.addEventListener('click', () => {
    window.history.back();
  });

  // ---------- Soporte de errores (mismo patrón que Clientes) ----------
  function mostrarError(mensaje) {
    const errorDiv = document.getElementById('error-msg');
    if (errorDiv) {
      errorDiv.textContent = mensaje;
      errorDiv.style.display = 'flex';
      errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      alert(mensaje);
    }
  }

  // ---------- Validaciones de los datos del empleado ----------
  const CAMPOS_EMPLEADO = ['nombre', 'apellido', 'direccion', 'codigo_postal'];

  const REGLAS_EMPLEADO = {
    nombre:        val => /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'\- ]{2,50}$/.test(val),
    apellido:      val => /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'\- ]{2,50}$/.test(val),
    direccion:     val => val.length >= 3 && val.length <= 100,
    codigo_postal: val => /^\d{4,10}$/.test(val)
  };

  function setErrorEmpleado(id, mensaje) {
    const input = document.getElementById(id);
    const err = document.getElementById(`err-${id}`);
    if (!input) return;

    input.classList.remove('valid');
    input.classList.add('error');

    input.style.animation = 'none';
    void input.offsetHeight;
    input.style.animation = '';

    if (err) {
      err.textContent = mensaje || input.dataset.errorDefault || err.textContent;
      err.classList.add('visible');
    }
  }

  function setValidEmpleado(id) {
    const input = document.getElementById(id);
    const err = document.getElementById(`err-${id}`);
    if (!input) return;

    input.classList.remove('error');
    input.classList.add('valid');

    if (err) {
      if (input.dataset.errorDefault) err.textContent = input.dataset.errorDefault;
      err.classList.remove('visible');
    }
  }

  function validarCampoEmpleado(id) {
    const input = document.getElementById(id);
    if (!input) return true;

    const valido = REGLAS_EMPLEADO[id](input.value.trim());
    valido ? setValidEmpleado(id) : setErrorEmpleado(id);
    return valido;
  }

  function validarFormularioEmpleado() {
    let valido = true;
    let primerInvalido = null;

    CAMPOS_EMPLEADO.forEach(campo => {
      if (!validarCampoEmpleado(campo)) {
        valido = false;
        if (!primerInvalido) primerInvalido = document.getElementById(campo);
      }
    });

    if (primerInvalido) primerInvalido.focus();
    return valido;
  }

  function limpiarErroresEmpleado() {
    CAMPOS_EMPLEADO.forEach(campo => {
      document.getElementById(campo)?.classList.remove('error', 'valid');
      document.getElementById(`err-${campo}`)?.classList.remove('visible');
    });
  }

  function inicializarValidacionesEmpleado() {
    CAMPOS_EMPLEADO.forEach(campo => {
      const input = document.getElementById(campo);
      const err = document.getElementById(`err-${campo}`);
      if (!input) return;

      if (err && !input.dataset.errorDefault) {
        input.dataset.errorDefault = err.textContent.trim();
      }

      input.addEventListener('blur', () => validarCampoEmpleado(campo));
      input.addEventListener('input', () => {
        if (input.classList.contains('error')) validarCampoEmpleado(campo);
      });
    });
  }

  function valorCampoEmpleado(campo) {
    return (document.getElementById(campo)?.value || '').trim();
  }

  // ---------- Listado ----------
  async function cargarUsuarios() {
    const contenedor = document.getElementById('contenedor');
    if (!contenedor) return;

    let usuarios = [];
    try {
      usuarios = await window.usuariosAPI.getUsuarios();
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      mostrarError(error.message || 'No se pudieron cargar los usuarios.');
      return;
    }

    const contador = document.getElementById('usuarios-count');
    if (contador) contador.textContent = usuarios.length;

    contenedor.innerHTML = '';

    let fila;
    usuarios.forEach((usuario, index) => {
      if (index % 2 === 0) {
        fila = document.createElement('div');
        fila.className = 'usuarios-fila';
        contenedor.appendChild(fila);
      }

      const card = document.createElement('div');
      card.className = 'usuario-item';
      card.id = usuario.id_usuario;

      card.innerHTML = `
        <div class="usuario-info">
          <h2 class="usuario-nombre">${usuario.email}</h2>
          <p class="usuario-rol">${usuario.rol}</p>
          ${usuario.activo ? '' : '<p class="usuario-inactivo">Desactivado</p>'}
        </div>
        <div class="usuario-actions">
          <button class="btn-cancelar btn-desactivar" value="${usuario.id_usuario}" ${usuario.activo ? '' : 'disabled'}>
            Desactivar
          </button>
        </div>
      `;

      fila.appendChild(card);
    });

    document.querySelectorAll('.btn-desactivar').forEach((boton) => {
      boton.addEventListener('click', (e) => {
        const id = e.currentTarget.value;
        window.location.href = `eliminarUsuario.html?id=${id}`;
      });
    });
  }

  // ---------- Alta ----------
  async function createUsuario() {
    const errorDiv = document.getElementById('error-msg');
    if (errorDiv) errorDiv.style.display = 'none';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rol = document.getElementById('rol').value;

    if (!email || !password || !rol) {
      mostrarError("Todos los campos son obligatorios.");
      return;
    }

    const usuario = {
      email,
      password,
      rol
    };

    // Si es empleado agregamos y validamos los datos adicionales
    if (rol === "empleado") {

      if (!validarFormularioEmpleado()) {
        mostrarError("Revisá los datos del empleado marcados en rojo.");
        return;
      }

      usuario.nombre = valorCampoEmpleado("nombre");
      usuario.apellido = valorCampoEmpleado("apellido");
      usuario.direccion = valorCampoEmpleado("direccion");
      usuario.codigo_postal = valorCampoEmpleado("codigo_postal");

      usuario.especialidades = Array.from(
        document.querySelectorAll(
          "#especialidades-checkboxes input[type='checkbox']:checked"
        )
      ).map(cb => Number(cb.value));
    }

    const btnGuardar = document.querySelector('#form-agregar-usuario button[type="submit"]');
    const textoBoton = btnGuardar?.textContent;

    if (btnGuardar) {
      btnGuardar.disabled = true;
      btnGuardar.textContent = 'Guardando...';
    }

    try {
      await window.usuariosAPI.addUsuario(usuario);
      volverAlOrigen();
    } catch (error) {
      console.error(error);
      mostrarError(error.message || "No se pudo crear el usuario.");
    } finally {
      if (btnGuardar) {
        btnGuardar.disabled = false;
        btnGuardar.textContent = textoBoton;
      }
    }
  }

  async function cargarEspecialidades() {

  const contenedor = document.getElementById("especialidades-checkboxes");

  if (!contenedor) return;

  try {

    const especialidades = await window.especialidadesAPI.getEspecialidades();

    contenedor.innerHTML = "";

    especialidades.forEach((esp) => {

      const label = document.createElement("label");
      label.className = "checkbox-item";

      label.innerHTML = `
        <input type="checkbox" value="${esp.id_especialidad}">
        <span>${esp.titulo}</span>
      `;

      contenedor.appendChild(label);

    });

  } catch (error) {
    console.error(error);
    mostrarError("No se pudieron cargar las especialidades.");
  }

}

  function initFormAgregar() {

  const form = document.getElementById("form-agregar-usuario");
  const rol = document.getElementById("rol");
  const datosEmpleado = document.getElementById("datos-empleado");

  if (!form || !rol || !datosEmpleado) return;

  inicializarValidacionesEmpleado();

  rol.addEventListener("change", async () => {

    if (rol.value === "empleado") {

      datosEmpleado.classList.add("activo");
      await cargarEspecialidades();

    } else {

      datosEmpleado.classList.remove("activo");
      limpiarErroresEmpleado();

    }

  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await createUsuario();
  });
}
  // ---------- Baja (lógica: activo = 0) ----------
  function initFormEliminar() {
    const form = document.getElementById('form-eliminar-usuario');
    if (!form) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!id) {
        alert('No se encontró el usuario a desactivar.');
        return;
      }
      try {
        await window.usuariosAPI.deleteUsuario(id);
        window.location.href = 'usuarios.html';
      } catch (error) {
        console.error('Error al desactivar usuario:', error);
        alert(error.message || 'No se pudo desactivar el usuario.');
      }
    });
    
  }

  // ---------- Inicialización ----------
  document.addEventListener('DOMContentLoaded', async () => {
    await protegerAccesoAdministrador();

    const pathname = window.location.pathname;

    if (pathname.includes('usuarios.html')) {
      await cargarUsuarios();
    }

    if (pathname.includes('agregarUsuario.html')) {
      initFormAgregar();
    }

    if (pathname.includes('eliminarUsuario.html')) {
      initFormEliminar();
    }
  });