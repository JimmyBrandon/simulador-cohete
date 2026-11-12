"""Aplicación web didáctica para comparar métodos numéricos de ascenso vertical."""

import json
from pathlib import Path

from flask import Flask, jsonify, render_template, request

from model import DEFAULT_PARAMETERS, SimulationError, simulate


app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024
PROJECT_DIR = Path(__file__).resolve().parent

with (PROJECT_DIR / "data" / "escenarios.json").open(encoding="utf-8") as scenario_file:
    SCENARIO_DEFINITIONS = json.load(scenario_file)

SCENARIOS = [
    {
        **scenario,
        "parameters": {**DEFAULT_PARAMETERS, **scenario.get("parameters", {})},
    }
    for scenario in SCENARIO_DEFINITIONS
]


@app.get("/")
def index():
    """Muestra la simulación de ejemplo descrita en la actividad."""
    initial_payload = simulate(DEFAULT_PARAMETERS)
    return render_template(
        "index.html",
        defaults=DEFAULT_PARAMETERS,
        initial_payload=initial_payload,
        scenarios=SCENARIOS,
    )


@app.post("/api/simulate")
def api_simulate():
    """Valida los parámetros y devuelve las series para tablas y gráficas."""
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "No se recibieron parámetros válidos."}), 400

    try:
        result = simulate(payload)
    except SimulationError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(result)


@app.get("/health")
def health():
    """Endpoint sencillo para comprobar que el servicio responde."""
    return jsonify({"status": "ok", "app": "Simulador de cohete"})


if __name__ == "__main__":
    # Solo para desarrollo local. PythonAnywhere importa `app` mediante WSGI.
    app.run(host="127.0.0.1", port=5000, debug=True)
