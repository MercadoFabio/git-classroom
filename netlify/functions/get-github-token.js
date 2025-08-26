// netlify/functions/get-github-token.js
const axios = require('axios');

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { code } = JSON.parse(event.body);

        if (!code) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Código no proporcionado' }) };
        }
        
        const client_id = process.env.GITHUB_CLIENT_ID;
        const client_secret = process.env.GITHUB_CLIENT_SECRET;

        // ESTA PETICIÓN SE HACE DESDE EL SERVIDOR DE NETLIFY, POR LO QUE NO HAY ERROR DE CORS
        const response = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: client_id,
            client_secret: client_secret,
            code: code,
        }, {
            headers: { 'Accept': 'application/json' }
        });
        
        // Devolvemos los datos (incluyendo el access_token) al frontend
        return {
            statusCode: 200,
            body: JSON.stringify(response.data)
        };

    } catch (error) {
        // Manejo de errores
        const errorData = error.response ? error.response.data : { error: 'Internal Server Error', error_description: error.message };
        console.error("Error en Netlify Function:", errorData);
        return {
            statusCode: error.response ? error.response.status : 500,
            body: JSON.stringify(errorData)
        };
    }
};