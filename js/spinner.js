/**
 * Muestra el spinner superpuesto en la pantalla.
 * Elimina la clase `hidden` del elemento con el ID `spinner-overlay`,
 * haciendo visible el spinner para indicar que una operación está en curso.
 */
function showSpinner() {
    document.getElementById('spinner-overlay').classList.remove('hidden');
}

/**
 * Oculta el spinner superpuesto en la pantalla.
 * Agrega la clase `hidden` al elemento con el ID `spinner-overlay`,
 * ocultando el spinner para indicar que la operación ha finalizado.
 */
function hideSpinner() {
    document.getElementById('spinner-overlay').classList.add('hidden');
}