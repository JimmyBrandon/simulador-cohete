"""Modelo del cohete y métodos Euler, Heun, RK4 y solución analítica.

El modelo supone movimiento vertical, masa y empuje constantes, gravedad
constante y resistencia lineal proporcional a la velocidad.
"""

from __future__ import annotations

import math
from typing import Any


DEFAULT_PARAMETERS: dict[str, float] = {
    "mass": 1000.0,
    "thrust": 15000.0,
    "gravity": 9.81,
    "drag": 100.0,
    "initial_velocity": 0.0,
    "initial_altitude": 0.0,
    "final_time": 20.0,
    "step_size": 2.0,
    "velocity_tolerance": 0.5,
    "altitude_tolerance": 5.0,
}

MAX_STEPS = 1000


class SimulationError(ValueError):
    """Error de validación o de estabilidad numérica comunicable al usuario."""


def _read_number(parameters: dict[str, Any], name: str) -> float:
    if name not in parameters:
        raise SimulationError(f"Falta el parámetro «{name}».")
    try:
        value = float(parameters[name])
    except (TypeError, ValueError):
        raise SimulationError(f"El valor de «{name}» debe ser numérico.") from None
    if not math.isfinite(value):
        raise SimulationError(f"El valor de «{name}» debe ser un número finito.")
    return value


def normalize_parameters(raw: dict[str, Any]) -> dict[str, float]:
    """Convierte y valida entradas antes de iniciar los cálculos."""
    values = {name: _read_number(raw, name) for name in DEFAULT_PARAMETERS}

    if not 1e-6 <= values["mass"] <= 1e9:
        raise SimulationError("La masa debe ser mayor que cero y no superar 1 000 000 000 kg.")
    if not 0 <= values["thrust"] <= 1e12:
        raise SimulationError("El empuje debe estar entre 0 y 1 000 000 000 000 N.")
    if not 0 <= values["gravity"] <= 1e4:
        raise SimulationError("La gravedad debe estar entre 0 y 10 000 m/s².")
    if not 0 <= values["drag"] <= 1e12:
        raise SimulationError("La resistencia lineal debe ser igual o mayor que cero.")
    if abs(values["initial_velocity"]) > 1e7:
        raise SimulationError("La velocidad inicial debe estar entre −10 000 000 y 10 000 000 m/s.")
    if abs(values["initial_altitude"]) > 1e9:
        raise SimulationError("La altura inicial debe estar entre −1 000 000 000 y 1 000 000 000 m.")
    if not 0 < values["final_time"] <= 1e4:
        raise SimulationError("El tiempo final debe ser mayor que cero y no superar 10 000 s.")
    if not 0 < values["step_size"] <= 1e4:
        raise SimulationError("El paso debe ser mayor que cero y no superar 10 000 s.")
    if values["step_size"] > values["final_time"]:
        raise SimulationError("El paso no puede ser mayor que el tiempo final.")
    for name, label in (
        ("velocity_tolerance", "El error máximo de velocidad"),
        ("altitude_tolerance", "El error máximo de altura"),
    ):
        if not 0 <= values[name] <= 1e9:
            raise SimulationError(f"{label} debe ser igual o mayor que cero.")

    ratio = values["final_time"] / values["step_size"]
    if not math.isfinite(ratio) or ratio > MAX_STEPS:
        raise SimulationError(
            f"La simulación supera el límite de {MAX_STEPS} pasos. Aumenta el paso de integración."
        )
    return values


def _time_grid(final_time: float, requested_step: float) -> tuple[list[float], list[float]]:
    """Crea una cuadrícula y acorta el último intervalo para llegar a T exacto."""
    count = max(1, math.ceil(final_time / requested_step))
    times = [0.0]
    intervals: list[float] = []
    for index in range(count):
        current = times[-1]
        remaining = final_time - current
        interval = remaining if index == count - 1 else min(requested_step, remaining)
        if interval <= 0:
            break
        intervals.append(interval)
        times.append(final_time if index == count - 1 else current + interval)
    return times, intervals


def _derivative(velocity: float, acceleration: float, damping: float) -> float:
    """dv/dt = (T/m - g) - (k/m)v."""
    return acceleration - damping * velocity


def _integrate(
    method: str,
    times: list[float],
    intervals: list[float],
    initial_velocity: float,
    initial_altitude: float,
    acceleration: float,
    damping: float,
) -> list[tuple[float, float]]:
    """Integra simultáneamente v' = a - beta*v y y' = v."""
    velocity = initial_velocity
    altitude = initial_altitude
    values = [(velocity, altitude)]

    for index, step in enumerate(intervals):
        if method == "euler":
            # Euler explícito: ambas derivadas se evalúan al inicio del intervalo.
            next_velocity = velocity + step * _derivative(velocity, acceleration, damping)
            next_altitude = altitude + step * velocity
        elif method == "heun":
            # Predictor de Euler y corrección trapezoidal (método del punto medio mejorado).
            slope_v_1 = _derivative(velocity, acceleration, damping)
            predicted_velocity = velocity + step * slope_v_1
            slope_v_2 = _derivative(predicted_velocity, acceleration, damping)
            next_velocity = velocity + step * (slope_v_1 + slope_v_2) / 2.0
            next_altitude = altitude + step * (velocity + predicted_velocity) / 2.0
        else:  # RK4
            k1_v = _derivative(velocity, acceleration, damping)
            k1_y = velocity

            k2_v = _derivative(velocity + step * k1_v / 2.0, acceleration, damping)
            k2_y = velocity + step * k1_v / 2.0

            k3_v = _derivative(velocity + step * k2_v / 2.0, acceleration, damping)
            k3_y = velocity + step * k2_v / 2.0

            k4_v = _derivative(velocity + step * k3_v, acceleration, damping)
            k4_y = velocity + step * k3_v

            next_velocity = velocity + step * (k1_v + 2 * k2_v + 2 * k3_v + k4_v) / 6.0
            next_altitude = altitude + step * (k1_y + 2 * k2_y + 2 * k3_y + k4_y) / 6.0

        if not math.isfinite(next_velocity) or not math.isfinite(next_altitude):
            raise SimulationError(
                f"{method.upper()} divergió numéricamente cerca de t = {times[index + 1]:g} s. "
                "Prueba con un paso menor o con parámetros menos extremos."
            )
        velocity, altitude = next_velocity, next_altitude
        values.append((velocity, altitude))

    return values


def _exact_solution(
    time: float,
    initial_velocity: float,
    initial_altitude: float,
    acceleration: float,
    damping: float,
) -> tuple[float, float]:
    """Solución cerrada del sistema, con el caso límite de resistencia cero."""
    if time == 0:
        return initial_velocity, initial_altitude
    if damping == 0:
        velocity = initial_velocity + acceleration * time
        altitude = initial_altitude + initial_velocity * time + 0.5 * acceleration * time**2
        return velocity, altitude

    scaled_time = damping * time
    if abs(scaled_time) < 1e-4:
        # Series avoid cancellation in (1-exp(-x))/x when drag is tiny.
        factor = 1 - scaled_time / 2 + scaled_time**2 / 6 - scaled_time**3 / 24 + scaled_time**4 / 120
        phi = time * factor
        psi = time**2 * (
            0.5 - scaled_time / 6 + scaled_time**2 / 24 - scaled_time**3 / 120 + scaled_time**4 / 720
        )
        one_minus_decay = scaled_time * factor
    else:
        one_minus_decay = -math.expm1(-scaled_time)
        phi = one_minus_decay / damping
        psi = (time - phi) / damping
    velocity = initial_velocity * (1 - one_minus_decay) + acceleration * phi
    altitude = initial_altitude + initial_velocity * phi + acceleration * psi
    return velocity, altitude


def simulate(raw_parameters: dict[str, Any]) -> dict[str, Any]:
    """Calcula las cuatro soluciones y devuelve filas, series y métricas."""
    parameters = normalize_parameters(raw_parameters)
    acceleration = parameters["thrust"] / parameters["mass"] - parameters["gravity"]
    damping = parameters["drag"] / parameters["mass"]
    times, intervals = _time_grid(parameters["final_time"], parameters["step_size"])

    numerical = {
        method: _integrate(
            method,
            times,
            intervals,
            parameters["initial_velocity"],
            parameters["initial_altitude"],
            acceleration,
            damping,
        )
        for method in ("euler", "heun", "rk4")
    }
    exact = [
        _exact_solution(
            time,
            parameters["initial_velocity"],
            parameters["initial_altitude"],
            acceleration,
            damping,
        )
        for time in times
    ]

    rows: list[dict[str, float]] = []
    for index, time in enumerate(times):
        row: dict[str, float] = {"time": time, "exact_v": exact[index][0], "exact_y": exact[index][1]}
        for method in ("euler", "heun", "rk4"):
            row[f"{method}_v"] = numerical[method][index][0]
            row[f"{method}_y"] = numerical[method][index][1]
        rows.append(row)

    last = rows[-1]
    metrics: dict[str, dict[str, float | bool]] = {
        "exact": {
            "velocity": last["exact_v"],
            "altitude": last["exact_y"],
            "velocity_error": 0.0,
            "altitude_error": 0.0,
            "meets_tolerance": True,
        }
    }
    for method in ("euler", "heun", "rk4"):
        velocity_error = abs(last[f"{method}_v"] - last["exact_v"])
        altitude_error = abs(last[f"{method}_y"] - last["exact_y"])
        metrics[method] = {
            "velocity": last[f"{method}_v"],
            "altitude": last[f"{method}_y"],
            "velocity_error": velocity_error,
            "altitude_error": altitude_error,
            "meets_tolerance": (
                velocity_error <= parameters["velocity_tolerance"]
                and altitude_error <= parameters["altitude_tolerance"]
            ),
        }

    return {
        "parameters": parameters,
        "step_count": len(intervals),
        "rows": rows,
        "metrics": metrics,
        "tolerances": {
            "velocity": parameters["velocity_tolerance"],
            "altitude": parameters["altitude_tolerance"],
        },
    }
