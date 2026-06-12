# Respirar

Aplicacion web estatica para medir ciclos simples de respiracion:

- inhalacion configurable, por defecto 3 segundos
- exhalacion configurable, por defecto 6 segundos
- indicador circular tipo torta que se consume durante cada fase

## Uso local

Abrir `index.html` en el navegador o servir la carpeta con:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Luego entrar a:

```text
http://localhost:8000
```

## GitHub Pages

1. Subir estos archivos a un repositorio de GitHub.
2. Ir a `Settings > Pages`.
3. En `Build and deployment`, elegir `Deploy from a branch`.
4. Seleccionar la rama principal y la carpeta raiz.
5. Guardar los cambios.

GitHub Pages publicara directamente esta app porque no requiere build.
