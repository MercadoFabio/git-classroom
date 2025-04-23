# GitHub Classroom Helper

GitHub Classroom Helper es una aplicación web diseñada para facilitar la gestión de asignaciones, entregas y calificaciones en GitHub Classroom. Proporciona una interfaz intuitiva para que los docentes puedan visualizar y analizar el desempeño de los estudiantes de manera eficiente.

## Características

- **Gestión de Assignments**: Permite listar y crear asignaciones en un classroom de GitHub.
- **Visualización de Entregas y Notas**: Muestra las entregas realizadas por los estudiantes, junto con sus calificaciones, en una tabla paginada y filtrable.
- **Resumen de Notas**: Genera un resumen detallado del desempeño de los estudiantes, incluyendo el porcentaje de entregas realizadas y el promedio de calificaciones.
- **Exportación a CSV**: Descarga los datos del resumen de notas en un archivo CSV para análisis externo.

## Tecnologías Utilizadas

- **Frontend**: HTML, CSS (TailwindCSS), JavaScript.
- **API**: GitHub REST API v3.
- **Framework SPA**: Implementación ligera de navegación de una sola página (SPA).

## Requisitos

- **Navegador Moderno**: Compatible con navegadores que soporten ES6+.
- **Token de GitHub**: Se requiere un token de acceso personal con permisos para GitHub Classroom.

## Instalación

1. Clona este repositorio:
   ```bash
   git clone https://github.com/MercadoFabio/git-classroom.git
   cd git-classroom
   ```

2. Abre el archivo `index.html` en tu navegador.

## Uso

1. **Crear Assignments**:
    - Navega a la sección "Crear Assignments".
    - Ingresa tu token de GitHub y selecciona un classroom.
    - Crea nuevas asignaciones para los estudiantes.

2. **Ver Notas y Entregas**:
    - Navega a la sección "Ver Notas y Entregas".
    - Ingresa tu token de GitHub, selecciona un classroom y una asignación.
    - Visualiza las entregas y calificaciones en una tabla paginada.

3. **Resumen de Notas**:
    - Navega a la sección "Resumen de Entregas".
    - Ingresa tu token de GitHub y selecciona un classroom.
    - Filtra los datos y descarga el resumen en formato CSV.


## Cómo Obtener un Token de GitHub

Para utilizar la aplicación, necesitas un token de acceso personal de GitHub con los permisos adecuados. Sigue estos pasos para generarlo:

1. **Inicia sesión en GitHub**:
   - Ve a [GitHub](https://github.com) e inicia sesión con tu cuenta.

2. **Accede a la configuración de tu cuenta**:
   - Haz clic en tu foto de perfil en la esquina superior derecha.
   - Selecciona **Settings** (Configuración).

3. **Navega a la sección de tokens**:
   - En el menú lateral izquierdo, selecciona **Developer settings**.
   - Luego, haz clic en **Personal access tokens** y selecciona **Tokens (classic)**.

4. **Genera un nuevo token**:
   - Haz clic en el botón **Generate new token**.
   - Si estás utilizando autenticación de dos factores (2FA), se te pedirá que ingreses un código de verificación.

5. **Configura el token**:
   - Asigna un nombre descriptivo al token (por ejemplo, "GitHub Classroom Helper").
   - Establece una fecha de expiración para el token según tus necesidades.
   - En la sección **Scopes**, selecciona los permisos necesarios:
      - `read:org` (para acceder a los classrooms).
      - `repo` (para acceder a los repositorios de los estudiantes).
      - `read:user` (para leer información básica del usuario).

6. **Genera y guarda el token**:
   - Haz clic en **Generate token**.
   - Copia el token generado y guárdalo en un lugar seguro. **No podrás verlo nuevamente después de cerrar esta página.**

7. **Usa el token en la aplicación**:
   - Ingresa el token en los campos correspondientes de la aplicación para autenticarte y acceder a los datos de GitHub Classroom.

**Nota**: Nunca compartas tu token públicamente ni lo incluyas en repositorios de código. Si crees que tu token ha sido comprometido, revócalo desde la misma sección de configuración.