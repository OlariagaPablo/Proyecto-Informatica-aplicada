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

  // ---------- Validaciones del formulario de alta ----------
  const CAMPOS_USUARIO = ['email', 'password', 'rol'];
  const CAMPOS_EMPLEADO = ['nombre', 'apellido', 'direccion', 'codigo_postal'];

  const REGLAS_USUARIO = {
    email:    val => val.length <= 254 && /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(val),
    password: val => val.length >= 6 && val.length <= 64 && /\S/.test(val),
    rol:      val => val === 'administrador' || val === 'empleado'
  };

  const REGLAS_EMPLEADO = {
    nombre:        val => /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'\- ]{2,50}$/.test(val),
    apellido:      val => /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'\- ]{2,50}$/.test(val),
    direccion:     val => val.length >= 3 && val.length <= 100,
    codigo_postal: val => /^\d{4,10}$/.test(val)
  };

  function setError(id, mensaje) {
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

  function setValid(id) {
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

  function valorCampo(id) {
    return (document.getElementById(id)?.value || '').trim();
  }

  function validarCampo(id, reglas) {
    const input = document.getElementById(id);
    if (!input) return true;

    // La contraseña se valida sin recortar: los espacios forman parte del valor.
    const valor = id === 'password' ? input.value : input.value.trim();
    const valido = reglas[id](valor);
    valido ? setValid(id) : setError(id);
    return valido;
  }

  // Devuelve el primer campo inválido (o null si todos son válidos).
  function validarCampos(campos, reglas) {
    let primerInvalido = null;

    campos.forEach(campo => {
      if (!validarCampo(campo, reglas) && !primerInvalido) {
        primerInvalido = document.getElementById(campo);
      }
    });

    return primerInvalido;
  }

  function limpiarErrores(campos) {
    campos.forEach(campo => {
      const input = document.getElementById(campo);
      const err = document.getElementById(`err-${campo}`);
      if (!input) return;

      input.classList.remove('error', 'valid');
      if (err) {
        if (input.dataset.errorDefault) err.textContent = input.dataset.errorDefault;
        err.classList.remove('visible');
      }
    });
  }

  function inicializarValidaciones(campos, reglas) {
    campos.forEach(campo => {
      const input = document.getElementById(campo);
      const err = document.getElementById(`err-${campo}`);
      if (!input) return;

      if (err && !input.dataset.errorDefault) {
        input.dataset.errorDefault = err.textContent.trim();
      }

      const evento = input.tagName === 'SELECT' ? 'change' : 'input';

      input.addEventListener('blur', () => validarCampo(campo, reglas));
      input.addEventListener(evento, () => {
        if (input.classList.contains('error')) validarCampo(campo, reglas);
      });
    });
  }

  // Quita el prefijo que agrega Electron a los errores de IPC.
  function mensajeDeError(error) {
    const mensaje = error?.message || '';
    return mensaje.split('Error: ').pop() || 'No se pudo crear el usuario.';
  }

  async function emailYaRegistrado(email) {
    try {
      const usuarios = await window.usuariosAPI.getUsuarios();
      const normalizado = email.trim().toLowerCase();
      return usuarios.some(
        u => String(u.email || '').trim().toLowerCase() === normalizado
      );
    } catch (error) {
      // Si la consulta falla, el UNIQUE del backend sigue siendo la red de seguridad.
      console.error('No se pudo verificar el email duplicado:', error);
      return false;
    }
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
  let altaEnCurso = false;

  async function createUsuario() {
    if (altaEnCurso) return;

    const errorDiv = document.getElementById('error-msg');
    if (errorDiv) errorDiv.style.display = 'none';

    const rol = document.getElementById('rol').value;
    const invalidoUsuario = validarCampos(CAMPOS_USUARIO, REGLAS_USUARIO);
    const invalidoEmpleado = rol === 'empleado'
      ? validarCampos(CAMPOS_EMPLEADO, REGLAS_EMPLEADO)
      : null;

    if (invalidoUsuario || invalidoEmpleado) {
      (invalidoUsuario || invalidoEmpleado).focus();
      mostrarError('Revisá los campos marcados en rojo.');
      return;
    }

    const email = valorCampo('email').toLowerCase();
    const password = document.getElementById('password').value;

    const usuario = { email, password, rol };

    // Si es empleado agregamos los datos adicionales
    if (rol === "empleado") {
      usuario.nombre = valorCampo("nombre");
      usuario.apellido = valorCampo("apellido");
      usuario.direccion = valorCampo("direccion");
      usuario.codigo_postal = valorCampo("codigo_postal");

      usuario.especialidades = Array.from(
        document.querySelectorAll(
          "#especialidades-checkboxes input[type='checkbox']:checked"
        )
      ).map(cb => Number(cb.value));
    }

    const btnGuardar = document.querySelector('#form-agregar-usuario button[type="submit"]');
    const textoBoton = btnGuardar?.textContent;

    function setGuardando(activo) {
      if (!btnGuardar) return;
      btnGuardar.disabled = activo;
      btnGuardar.textContent = activo ? 'Guardando...' : textoBoton;
    }

    setGuardando(true);
    altaEnCurso = true;

    try {
      if (await emailYaRegistrado(email)) {
        setError('email', 'Ya existe un usuario con este email.');
        document.getElementById('email')?.focus();
        mostrarError('Ya existe un usuario con este email.');
        return;
      }

      await window.usuariosAPI.addUsuario(usuario);
      volverAlOrigen();
    } catch (error) {
      console.error(error);
      const mensaje = mensajeDeError(error);

      if (/UNIQUE constraint failed: Usuarios\.email/i.test(mensaje) ||
          /Ya existe un usuario con este email/i.test(mensaje)) {
        setError('email', 'Ya existe un usuario con este email.');
        document.getElementById('email')?.focus();
        mostrarError('Ya existe un usuario con este email.');
      } else {
        mostrarError(mensaje);
      }
    } finally {
      altaEnCurso = false;
      setGuardando(false);
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

  inicializarValidaciones(CAMPOS_USUARIO, REGLAS_USUARIO);
  inicializarValidaciones(CAMPOS_EMPLEADO, REGLAS_EMPLEADO);

  rol.addEventListener("change", async () => {

    const errorDiv = document.getElementById('error-msg');
    if (errorDiv) errorDiv.style.display = 'none';

    if (rol.value === "empleado") {

      datosEmpleado.classList.add("activo");
      await cargarEspecialidades();

    } else {

      datosEmpleado.classList.remove("activo");
      limpiarErrores(CAMPOS_EMPLEADO);

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