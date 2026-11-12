"""Plantilla para pegar en el archivo WSGI de la pestaña Web de PythonAnywhere.

Reemplaza USUARIO por el nombre de tu cuenta y confirma que la carpeta del
proyecto coincide con la ubicación donde descomprimiste el ZIP.
"""

import sys

project_path = "/home/USUARIO/simulador_cohete"
if project_path not in sys.path:
    sys.path.insert(0, project_path)

from app import app as application  # noqa: E402
