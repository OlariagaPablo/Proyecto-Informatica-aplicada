// script.js - Funcionalidades de la vista Clientes (lista, agregar, modificar, eliminar)


// ---------- Navegación General ----------

// Botón "home" -> vuelve al index
document.getElementById("home")?.addEventListener("click", () => {
  window.location.href = "../../index.html";
});

// Botón "+ Agregar" -> va a agregarCliente.html
document.getElementById("btn-add-cliente")?.addEventListener("click", () => {
  window.location.href = "agregarCliente.html";
});

// Botón "Cancelar" en agregarCliente.html -> vuelve a la lista
document.getElementById("btn-cancelar")?.addEventListener("click", () => {
  window.location.href = "cliente.html";
});

// ---------- Funciones Backend ----------

async function getClientes() {
  try {
    return await window.api.getClientes();
  } catch (error) {
    console.error("Error al obtener clientes:", error);
    return [];
  }
}

async function getClienteById(id) {
  try {
    return await window.api.getClienteById(id);
  } catch (error) {
    console.error("Error al obtener cliente por ID:", error);
    return null;
  }
}

// ---------- Funciones de Soporte ----------

function mostrarError(mensaje) {
  const errorDiv = document.getElementById("mensaje-error-duplicado");
  if (errorDiv) {
    errorDiv.textContent = mensaje;
    errorDiv.classList.add('error-notification');
    errorDiv.style.display = 'flex';
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function limpiarError() {
  const errorDiv = document.getElementById("mensaje-error-duplicado");
  if (errorDiv) {
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
  }
}

// ---------- Validaciones ----------

// Campos del cliente, en el orden en que aparecen en el formulario
const CAMPOS_CLIENTE = [
  'nombre',
  'apellido',
  'documento',
  'direccion',
  'telefono',
  'email',
  'codigo_postal'
];

// Reglas de validación por campo (los valores llegan ya recortados con trim)
const REGLAS = {
  nombre:         val => /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'\- ]{2,50}$/.test(val),
  apellido:       val => /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'\- ]{2,50}$/.test(val),
  documento:      val => /^\d{7,8}$/.test(val),
  direccion:      val => val.length >= 3 && val.length <= 100,
  telefono:       val => /^\+?\d{7,15}$/.test(val),
  email:          val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
  codigo_postal:  val => /^\d{4,10}$/.test(val)
};

// Etiquetas legibles para los mensajes de duplicado
const ETIQUETAS_CAMPOS = {
  documento: 'documento',
  telefono: 'teléfono',
  email: 'correo electrónico'
};

function limpiarMensajeCampo(id) {
  const err = document.getElementById(`err-${id}`);
  if (!err) return;
  const input = document.getElementById(id);
  if (input?.dataset.errorDefault) {
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

  const regla = REGLAS[id.replace(/^mod-/, '')];
  const valido = !!regla && regla(input.value.trim());

  valido ? setValid(id) : setError(id);
  return valido;
}

// Valida todos los campos del formulario visible. `prefijo` es "" para agregar
// y "mod-" para modificar.
function validarFormulario(prefijo = '') {
  let valido = true;
  let primerInvalido = null;

  CAMPOS_CLIENTE.forEach(campo => {
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
  CAMPOS_CLIENTE.forEach(campo => {
    const input = document.getElementById(`${prefijo}${campo}`);
    const err = document.getElementById(`err-${prefijo}${campo}`);
    if (!input) return;

    // Guardamos el mensaje original para poder restaurarlo
    if (err && !input.dataset.errorDefault) {
      input.dataset.errorDefault = err.textContent.trim();
    }

    input.addEventListener('blur', () => validarCampo(input.id));
    input.addEventListener('input', () => {
      limpiarError();
      if (input.classList.contains('error')) validarCampo(input.id);
    });
  });
}

function valorCampo(prefijo, campo) {
  return (document.getElementById(`${prefijo}${campo}`)?.value || '').trim();
}

function obtenerDatosCliente(prefijo = '') {
  return {
    nombre: valorCampo(prefijo, 'nombre'),
    apellido: valorCampo(prefijo, 'apellido'),
    documento: valorCampo(prefijo, 'documento'),
    direccion: valorCampo(prefijo, 'direccion'),
    telefono: valorCampo(prefijo, 'telefono'),
    email: valorCampo(prefijo, 'email').toLowerCase(),
    codigo_postal: valorCampo(prefijo, 'codigo_postal')
  };
}

function marcarCampoDuplicado(campo, prefijo = '') {
  const etiqueta = ETIQUETAS_CAMPOS[campo] || campo;
  mostrarError(`Ya existe un cliente con el mismo ${etiqueta}.`);

  const id = `${prefijo}${campo}`;
  const input = document.getElementById(id);
  if (input) {
    setError(id, `Ya existe un cliente con este ${etiqueta}.`);
    input.focus();
  }
}

function campoDesdeErrorSqlite(error) {
  const mensaje = String(error?.message || '');
  if (mensaje.includes('Cliente.documento')) return 'documento';
  if (mensaje.includes('Cliente.email')) return 'email';
  return null;
}

function manejarErrorGuardado(error, prefijo, accion) {
  console.error(`Error al ${accion} cliente:`, error);

  const campoDuplicado = campoDesdeErrorSqlite(error);
  if (campoDuplicado) {
    marcarCampoDuplicado(campoDuplicado, prefijo);
    return;
  }

  mostrarError(`No se pudo ${accion} el cliente. Intentá de nuevo.`);
}

async function validarExistenciaCliente(cliente, idExcluir = null) {
  try {
    const lista = await window.api.getClientes();
    const normalizar = valor => String(valor ?? '').trim().toLowerCase();

    // Al modificar, el propio cliente no cuenta como duplicado
    const otros = lista.filter(c => Number(c.id_cliente) !== Number(idExcluir));

    for (const campo of ['documento', 'telefono', 'email']) {
      const valor = normalizar(cliente[campo]);
      // Los campos opcionales vacíos no pueden considerarse duplicados
      if (!valor) continue;

      if (otros.some(c => normalizar(c[campo]) === valor)) {
        return campo;
      }
    }

    return false;
  } catch (error) {
    console.error("Error al validar existencia del cliente:", error);
    return false;
  }
}

// ---------- CLIENTE: Listado ----------

async function cargarClientes() {
  const contenedor = document.getElementById("contenedor");
  if (!contenedor) return;

  const clientes = await getClientes();
  actualizarClientesCount(clientes.length);

  contenedor.innerHTML = "";

  let fila;
  clientes.forEach((cliente, index) => {
    if (index % 2 === 0) {
      fila = document.createElement("div");
      fila.className = "clientes-fila";
      contenedor.appendChild(fila);
    }

    const card = document.createElement("div");
    card.className = "cliente-item";
    card.id = cliente.id_cliente;

    card.innerHTML = `
      <div class="cliente-info">
        <h2 class="cliente-nombre">${cliente.nombre} ${cliente.apellido || ""}</h2>
        <p class="cliente-email">${cliente.email || ""}</p>
        <p class="cliente-telefono">${cliente.telefono || ""}</p>
        <p class="cliente-direccion">${cliente.direccion || ""}</p>
      </div>
      <button class="btn-editar" value="${cliente.id_cliente}">
        <img src="../../public/icons/content-modified.svg" alt="Editar">
      </button>
    `;

    fila.appendChild(card);
  });

  obtenerIdCliente();
}

function actualizarClientesCount(cantidad) {
  const contador = document.getElementById("clientes-count");
  if (contador) contador.textContent = cantidad;
}

function obtenerIdCliente() {
  const botones = document.querySelectorAll(".btn-editar");
  botones.forEach(boton => {
    boton.addEventListener("click", (e) => {
      const id = e.currentTarget.value;
      window.api.logToMain(`Navigating to modificarCliente.html with id=${id}`);
      window.location.href = `modificarCliente.html?id=${id}`;
    });
  });
}

// ---------- CLIENTE: Agregar ----------

async function createCliente() {
  limpiarError();

  // 1) Validación de formato de todos los campos
  if (!validarFormulario()) return;

  const nuevoCliente = obtenerDatosCliente();

  // 2) Validación de duplicados
  const campoDuplicado = await validarExistenciaCliente(nuevoCliente);
  if (campoDuplicado) {
    marcarCampoDuplicado(campoDuplicado);
    return;
  }

  try {
    await window.api.addCliente(nuevoCliente);
    window.location.href = "cliente.html";
  } catch (error) {
    manejarErrorGuardado(error, '', 'guardar');
  }
}

function initFormSubmit() {
  const form = document.getElementById("form-agregar-cliente");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    createCliente();
  });
}

// ---------- CLIENTE: Modificar ----------

async function updateCliente() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) {
    mostrarError("No se encontró el cliente a modificar.");
    return;
  }

  limpiarError();

  // 1) Validación de formato de todos los campos
  if (!validarFormulario('mod-')) return;

  const clienteActualizado = obtenerDatosCliente('mod-');

  // 2) Validación de duplicados, excluyendo el propio cliente
  const campoDuplicado = await validarExistenciaCliente(clienteActualizado, id);
  if (campoDuplicado) {
    marcarCampoDuplicado(campoDuplicado, 'mod-');
    return;
  }

  try {
    await window.api.updateCliente(id, clienteActualizado);
    window.location.href = "cliente.html";
  } catch (error) {
    manejarErrorGuardado(error, 'mod-', 'actualizar');
  }
}

async function obtenerClientePorId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) throw new Error("ID no proporcionado en la URL");

  return await getClienteById(id);
}

function rellenarFormulario(cliente) {
  if (!cliente) return;
  document.getElementById("mod-nombre").value = cliente.nombre || "";
  document.getElementById("mod-apellido").value = cliente.apellido || "";
  document.getElementById("mod-documento").value = cliente.documento || "";
  document.getElementById("mod-telefono").value = cliente.telefono || "";
  document.getElementById("mod-email").value = cliente.email || "";
  document.getElementById("mod-direccion").value = cliente.direccion || "";
  document.getElementById("mod-codigo_postal").value = cliente.codigo_postal || "";
}

function initFormSubmitModificar() {
  const form = document.getElementById("form-modificar-cliente");

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    updateCliente();
  });

  document.getElementById("btn-eliminar")?.addEventListener("click", (e) => {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) {
      window.location.href = `eliminarCliente.html?id=${id}`;
    } else {
      alert("No se encontró el cliente para eliminar.");
    }
  });
}

// ---------- CLIENTE: Eliminar ----------

// ---------------------------- INICIALIZACIÓN ----------------------------

document.addEventListener("DOMContentLoaded", async () => {
  const pathname = window.location.pathname;

  if (pathname.includes("cliente.html")) {
    await cargarClientes();
    console.log("En cliente.html");
  }

  if (pathname.includes("agregarCliente.html")) {
    console.log("En agregarCliente.html");
    inicializarValidaciones();
    initFormSubmit();
  }

  if (pathname.includes("modificarCliente.html")) {
    console.log("En modificarCliente.html");
    const cliente = await obtenerClientePorId();
    if (cliente) rellenarFormulario(cliente);
    inicializarValidaciones('mod-');
    initFormSubmitModificar();
  }

  if (pathname.includes("eliminarCliente.html")) {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    document.getElementById("btn-cancelar")?.addEventListener("click", () => {
      window.history.back();
    });

    const form = document.getElementById("form-eliminar-cliente");
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await window.api.deleteCliente(id);
        console.log("Cliente eliminado correctamente");
        window.location.href = "cliente.html";
      } catch (error) {
        console.error("Error al eliminar cliente:", error);
        alert("No se pudo eliminar el cliente.");
      }
    });
  }
});
