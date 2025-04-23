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
