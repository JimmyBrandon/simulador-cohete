# Simulador didáctico de lanzamiento vertical

## Guía de instalación y uso

Esta aplicación web acompaña el trabajo de Métodos Numéricos sobre el método de Euler. Permite cambiar los parámetros de un cohete ficticio y comparar Euler, Heun, Runge–Kutta de cuarto orden (RK4) y la solución analítica del modelo.

> **Alcance:** es una simulación educativa de movimiento vertical con masa, empuje, gravedad y resistencia lineal constantes. No representa un lanzamiento real ni es una herramienta de ingeniería aeroespacial.

## Qué puede hacer la aplicación

- Presentar el contexto, el planteamiento del desafío, la explicación paso a paso de Euler y las conclusiones antes y después del simulador.
- Cambiar masa, empuje, gravedad, resistencia lineal, condiciones iniciales, tiempo y paso de cálculo.
- Cargar escenarios de ejemplo, modificar el paso rápidamente o ajustar todos los valores a mano.
- Comparar velocidad y altura con cuatro métodos y consultar sus errores respecto a la solución analítica.
- Revisar antes de las conclusiones el error absoluto, el error relativo y una tabla de precisión para varios tamaños de paso.
- Recorrer el vuelo con una línea de tiempo, reproducir una animación sencilla y cambiar el método mostrado.
- Ocultar o mostrar métodos en las gráficas, revisar las tablas y descargar los resultados en CSV.
- Verificar si cada método satisface los límites de error definidos para la actividad.
- Cerrar con respuestas breves y en primera persona a las cinco preguntas de reflexión.

La app no guarda los parámetros ni los resultados y no usa una base de datos. Después de instalar Flask, los cálculos y las gráficas funcionan localmente sin servicios externos.

## Requisitos

- Windows 10/11, macOS o Linux.
- Python 3.10 o superior.
- Conexión a internet durante la primera instalación, para descargar Flask.
- Un navegador moderno con JavaScript habilitado.

## Instalación y ejecución en Windows

### Opción sencilla: archivo de inicio

1. Descomprime el ZIP en una carpeta donde tengas permiso para guardar archivos.
2. Abre la carpeta `simulador_cohete`.
3. Haz doble clic en **`INICIAR.bat`**. En el primer inicio prepara un entorno aislado e instala Flask; puede tardar un momento.
4. Cuando la ventana indique que el servidor está activo, abre **<http://127.0.0.1:5000>** en el navegador.
5. Mantén abierta la ventana negra mientras uses la app. Para detener el servidor, vuelve a ella y presiona **Ctrl+C**.

### Opción manual: PowerShell

Abre PowerShell dentro de `simulador_cohete` y ejecuta:

```powershell
py -3 --version
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

La primera línea permite confirmar la versión de Python. Si indica una versión anterior a 3.10, instala una versión reciente de Python y vuelve a abrir PowerShell. Después de iniciar el servidor, visita <http://127.0.0.1:5000>. Detén la ejecución con **Ctrl+C**.

La app escucha en `127.0.0.1`, que es la propia computadora. Para que otra persona acceda desde internet se necesita desplegarla en un servidor, por ejemplo PythonAnywhere.

## Instalación en macOS o Linux

Abre Terminal dentro de `simulador_cohete` y ejecuta:

```bash
python3 --version
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python app.py
```

Visita <http://127.0.0.1:5000>. Detén el servidor con **Ctrl+C**.

## Uso para la actividad

1. Al abrir la página aparece el escenario base del ejercicio.
2. Prueba los botones de escenarios y observa cómo cambian los resultados.
3. Pulsa un paso rápido (2, 1, 0,5 o 0,25 s) o ingresa otro valor en los campos. La app calcula el intervalo final aunque el paso no divida exactamente el tiempo total.
4. En **Recorrido del cohete**, selecciona Euler, Heun, RK4 o la solución analítica. Usa el control de tiempo o **Reproducir/Pausar** para explorar los valores durante el vuelo.
5. Usa las leyendas bajo las gráficas para mostrar u ocultar cada método.
6. Compara la tabla de resumen final y las iteraciones. **Descargar CSV** guarda los datos para abrirlos en Excel u otra hoja de cálculo.

Con los valores iniciales del documento, Euler con paso de 2 s calcula aproximadamente 46,3273 m/s y 574,7272 m a los 20 s. La solución analítica da aproximadamente 44,8761 m/s y 589,2390 m. RK4 ofrece una comparación numérica de orden superior para este mismo modelo.

## Publicación opcional en PythonAnywhere

Para obtener una URL pública se necesita una cuenta de PythonAnywhere. Su [guía oficial de Flask](https://help.pythonanywhere.com/pages/Flask/) explica la configuración mediante la pestaña **Web** y WSGI. Estos son los pasos resumidos:

1. Sube `Simulador_Cohete_Euler.zip` a tu directorio personal en PythonAnywhere y descomprímelo allí.
2. En una consola **Bash** de la cuenta, entra en la carpeta y crea el entorno. Elige una versión disponible en tu cuenta; usa la misma versión al crear la web:

   ```bash
   cd ~/simulador_cohete
   mkvirtualenv simulador-cohete --python=python3.13
   pip install -r requirements.txt
   ```

   Si Python 3.13 no está disponible, cambia `python3.13` por una versión ofrecida en PythonAnywhere.

3. En la pestaña **Web**, crea una app con **Manual configuration** y selecciona esa misma versión de Python. En **Virtualenv**, indica `/home/USUARIO/.virtualenvs/simulador-cohete`.
4. Abre el archivo WSGI desde esa pestaña y reemplaza su contenido por el de `deploy/pythonanywhere_wsgi.py`. Sustituye `USUARIO` por el nombre de tu cuenta. Si la carpeta se encuentra en otra ruta, actualiza `project_path`.
5. Guarda, pulsa **Reload** y abre el dominio que PythonAnywhere muestra para la web.

## Estructura del proyecto

```text
simulador_cohete/
├── app.py                         # Aplicación Flask y rutas
├── model.py                       # Modelo, métodos numéricos y solución exacta
├── wsgi.py                        # Punto de entrada WSGI
├── INICIAR.bat                    # Inicio local sencillo en Windows
├── requirements.txt               # Dependencias Python
├── data/
│   └── escenarios.json            # Escenarios didácticos precargados
├── deploy/
│   └── pythonanywhere_wsgi.py     # Plantilla WSGI para publicación
├── static/
│   ├── app.js                     # Interactividad, tablas y gráficas
│   └── style.css                  # Diseño adaptable
├── templates/
│   └── index.html                 # Interfaz web
├── .gitignore
└── README.md                      # Esta guía
```

## Solución de problemas

- **`py` no se reconoce:** instala Python 3.10 o superior y habilita el lanzador de Python durante la instalación.
- **No se puede instalar Flask:** confirma que hay conexión a internet durante la primera instalación y vuelve a ejecutar `INICIAR.bat`.
- **El puerto 5000 está ocupado:** cierra la otra app que lo usa y vuelve a iniciar el simulador.
- **La página no carga:** verifica que la ventana del servidor siga abierta y que el navegador use `http://127.0.0.1:5000`.
- **El navegador muestra un error al calcular:** comprueba que los valores sean finitos, que la masa y el paso sean positivos y que la simulación no exceda 1 000 intervalos.
- **Error en PythonAnywhere:** revisa la ruta `project_path`, el nombre de usuario, la versión de Python y el archivo de errores disponible en la pestaña **Web**.

## Modelo y limitaciones

El sistema resuelto es

\[
v' = \frac{T}{m} - g - \frac{k}{m}v, \qquad y'=v.
\]

Euler usa la velocidad del inicio de cada intervalo para actualizar la altura, según la fórmula de la actividad: \(y_{n+1}=y_n+h v_n\). El modelo mantiene constantes la masa, el empuje, la gravedad y el coeficiente de resistencia. No incluye consumo de combustible, etapas, cambios de empuje, densidad del aire, viento ni movimiento horizontal.
