function getToken() {
        const token = sessionStorage.getItem('github_token'); // Usa 'github_token' o la clave que hayas definido en tu login
        if (!token) {
            console.error("Token no encontrado en sessionStorage. Redirigiendo a login.");
            window.location.replace('/login.html'); // O la ruta a tu página de login
            return null; // Devuelve null para detener la ejecución actual
        }
        return token;
    }