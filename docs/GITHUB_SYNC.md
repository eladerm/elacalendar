
# Sincronización con GitHub - ÉLAPIEL

Sigue estos pasos para subir tu código a GitHub y mantenerlo respaldado en la nube de forma segura.

## 1. Crear el Repositorio en GitHub
1. Inicia sesión en [GitHub](https://github.com).
2. Haz clic en el botón **"New"** para crear un nuevo repositorio.
3. Ponle un nombre (ej. `elapiel-sistema`).
4. **IMPORTANTE**: No marques las casillas de "Add a README", "Add .gitignore" o "Choose a license", ya que el proyecto ya tiene estos archivos.
5. Haz clic en **"Create repository"**.

## 2. Vincular tu código local
Abre la terminal en la carpeta raíz de tu proyecto y ejecuta los siguientes comandos:

```bash
# 1. Inicializar el repositorio local
git init

# 2. Agregar todos los archivos (el .gitignore protegerá tus claves)
git add .

# 3. Crear el primer commit
git commit -m "Carga inicial del sistema ÉLAPIEL"

# 4. Cambiar el nombre de la rama a main
git branch -M main

# 5. Conectar con GitHub
# REEMPLAZA la URL con la que te dio GitHub al crear el repo
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git

# 6. Subir el código
git push -u origin main
```

## 3. Cómo subir cambios nuevos
Cada vez que realices una mejora y quieras guardarla en GitHub, usa estos tres comandos:

```bash
git add .
git commit -m "Descripción de lo que mejoraste hoy"
git push
```

## Seguridad de Datos
He incluido un archivo `.gitignore` que evita que el archivo `.env` se suba a GitHub. Tus claves de Firebase y contraseñas de Gmail **nunca deben ser públicas**. Si alguna vez necesitas clonar el proyecto en otra computadora, deberás crear el archivo `.env` manualmente con tus credenciales.
