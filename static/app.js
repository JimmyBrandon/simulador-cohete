(() => {
  "use strict";

  const form = document.querySelector("#simulator-form");
  const calculateButton = document.querySelector("#calculate-button");
  const formError = document.querySelector("#form-error");
  const numberFormat = new Intl.NumberFormat("es-BO", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  });
  const preciseFormat = new Intl.NumberFormat("es-BO", {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0,
  });

  const methods = [
    { key: "euler", name: "Euler", color: "#ed8a3b" },
    { key: "heun", name: "Heun", color: "#4b9ce2" },
    { key: "rk4", name: "RK4", color: "#31a890" },
    { key: "exact", name: "Analítica", color: "#a3adbb", dash: "7 6" },
  ];
  const scenarios = JSON.parse(document.querySelector("#scenario-data").textContent);

  let latestData = null;
  let selectedIndex = 0;
  let playbackTimer = null;
  const chartVisibility = { velocity: {}, altitude: {} };
  methods.forEach((method) => {
    chartVisibility.velocity[method.key] = true;
    chartVisibility.altitude[method.key] = true;
  });

  function fmt(value, precise = false) {
    if (!Number.isFinite(value)) return "—";
    return (precise ? preciseFormat : numberFormat).format(value);
  }

  function addSvgElement(parent, tag, attributes = {}, text = null) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    if (text !== null) element.textContent = text;
    parent.appendChild(element);
    return element;
  }

  function chartPath(rows, methodKey, variable, width, height, bounds) {
    const left = 66;
    const right = 18;
    const top = 16;
    const bottom = 42;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const firstTime = rows[0].time;
    const lastTime = rows[rows.length - 1].time;
    const timeRange = lastTime - firstTime || 1;
    const valueRange = bounds.max - bounds.min || 1;
    const points = rows.map((row) => {
      const x = left + ((row.time - firstTime) / timeRange) * plotWidth;
      const y = top + ((bounds.max - row[`${methodKey}_${variable}`]) / valueRange) * plotHeight;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    return points.join(" ");
  }

  function drawChart(target, rows, variable, label, visibility) {
    target.replaceChildren();
    if (!rows || rows.length === 0) return;

    const width = 760;
    const height = 292;
    const left = 66;
    const right = 18;
    const top = 16;
    const bottom = 42;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const values = rows.flatMap((row) => methods.map((method) => row[`${method.key}_${variable}`]));
    let min = Math.min(0, ...values);
    let max = Math.max(0, ...values);
    if (min === max) {
      min -= 1;
      max += 1;
    } else {
      const padding = (max - min) * 0.08;
      min -= padding;
      max += padding;
    }
    const bounds = { min, max };
    const svg = addSvgElement(target, "svg", {
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label": `${label}: comparación de Euler, Heun, RK4 y la solución analítica`,
      preserveAspectRatio: "xMidYMid meet",
    });
    addSvgElement(svg, "title", {}, `${label} del cohete en el tiempo`);

    for (let tick = 0; tick <= 4; tick += 1) {
      const fraction = tick / 4;
      const y = top + fraction * plotHeight;
      const value = max - fraction * (max - min);
      addSvgElement(svg, "line", { x1: left, x2: width - right, y1: y, y2: y, class: "chart-gridline" });
      addSvgElement(svg, "text", { x: left - 10, y: y + 4, class: "chart-tick chart-y-tick", "text-anchor": "end" }, fmt(value));
    }

    for (let tick = 0; tick <= 4; tick += 1) {
      const fraction = tick / 4;
      const x = left + fraction * plotWidth;
      const time = rows[0].time + fraction * (rows[rows.length - 1].time - rows[0].time);
      addSvgElement(svg, "line", { x1: x, x2: x, y1: top, y2: height - bottom, class: "chart-gridline chart-gridline-vertical" });
      addSvgElement(svg, "text", { x, y: height - bottom + 19, class: "chart-tick", "text-anchor": "middle" }, fmt(time));
    }

    addSvgElement(svg, "text", { x: width / 2, y: height - 3, class: "chart-axis-label", "text-anchor": "middle" }, "Tiempo (s)");
    const axisLabel = addSvgElement(svg, "text", {
      x: 15,
      y: height / 2,
      class: "chart-axis-label chart-axis-vertical",
      "text-anchor": "middle",
      transform: `rotate(-90 15 ${height / 2})`,
    }, label);
    axisLabel.setAttribute("aria-hidden", "true");

    methods.forEach((method) => {
      if (!visibility[method.key]) return;
      addSvgElement(svg, "polyline", {
        points: chartPath(rows, method.key, variable, width, height, bounds),
        fill: "none",
        stroke: method.color,
        "stroke-width": method.key === "exact" ? 2.2 : 2.7,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        ...(method.dash ? { "stroke-dasharray": method.dash } : {}),
        class: "chart-series",
      });
    });

    const selectedRow = rows[Math.min(selectedIndex, rows.length - 1)];
    const selectedX = left + ((selectedRow.time - rows[0].time) / (rows[rows.length - 1].time - rows[0].time || 1)) * plotWidth;
    addSvgElement(svg, "line", {
      x1: selectedX, x2: selectedX, y1: top, y2: height - bottom, class: "chart-cursor",
    });
    methods.forEach((method) => {
      if (!visibility[method.key]) return;
      const value = selectedRow[`${method.key}_${variable}`];
      const y = top + ((bounds.max - value) / (bounds.max - bounds.min || 1)) * plotHeight;
      addSvgElement(svg, "circle", {
        cx: selectedX, cy: y, r: method.key === "exact" ? 3.5 : 4,
        fill: method.color, stroke: "#fff", "stroke-width": 1.8, class: "chart-cursor-point",
      });
    });
  }

  function makeLegend(container, chartName) {
    container.replaceChildren();
    methods.forEach((method) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "legend-button";
      button.setAttribute("aria-pressed", String(chartVisibility[chartName][method.key]));
      button.addEventListener("click", () => {
        chartVisibility[chartName][method.key] = !chartVisibility[chartName][method.key];
        button.setAttribute("aria-pressed", String(chartVisibility[chartName][method.key]));
        const variable = chartName === "velocity" ? "v" : "y";
        drawChart(
          document.querySelector(chartName === "velocity" ? "#velocity-chart" : "#altitude-chart"),
          latestData.rows,
          variable,
          chartName === "velocity" ? "Velocidad (m/s)" : "Altura (m)",
          chartVisibility[chartName],
        );
      });
      const swatch = document.createElement("span");
      swatch.className = `legend-swatch${method.dash ? " legend-swatch-dashed" : ""}`;
      swatch.style.setProperty("--swatch-color", method.color);
      const label = document.createElement("span");
      label.textContent = method.name;
      button.append(swatch, label);
      container.appendChild(button);
    });
  }

  function createCell(row, text, className = "") {
    const cell = document.createElement("td");
    cell.textContent = text;
    if (className) cell.className = className;
    row.appendChild(cell);
  }

  function fillTable(target, rows, variable) {
    const fragment = document.createDocumentFragment();
    rows.forEach((dataRow, index) => {
      const row = document.createElement("tr");
      if (index === rows.length - 1) row.className = "final-row";
      createCell(row, fmt(dataRow.time, true));
      createCell(row, fmt(dataRow[`exact_${variable}`], true), "exact-cell");
      ["euler", "heun", "rk4"].forEach((method) => {
        createCell(row, fmt(dataRow[`${method}_${variable}`], true));
        createCell(
          row,
          fmt(Math.abs(dataRow[`${method}_${variable}`] - dataRow[`exact_${variable}`]), true),
          "error-cell",
        );
      });
      fragment.appendChild(row);
    });
    target.replaceChildren(fragment);
  }

  function fillSummaryTable(target, data) {
    const fragment = document.createDocumentFragment();
    ["exact", "euler", "heun", "rk4"].forEach((methodKey) => {
      const method = methods.find((item) => item.key === methodKey);
      const metric = data.metrics[methodKey];
      const row = document.createElement("tr");
      if (methodKey === "exact") row.className = "summary-exact-row";
      createCell(row, method.name, `summary-method summary-${methodKey}`);
      createCell(row, `${fmt(metric.velocity, true)} m/s`);
      createCell(row, fmt(metric.velocity_error, true), "error-cell");
      createCell(row, `${fmt(metric.altitude, true)} m`);
      createCell(row, fmt(metric.altitude_error, true), "error-cell");
      const status = methodKey === "exact" ? "REFERENCIA" : metric.meets_tolerance ? "CUMPLE" : "REVISAR";
      createCell(row, status, metric.meets_tolerance ? "summary-status status-pass" : "summary-status status-fail");
      fragment.appendChild(row);
    });
    target.replaceChildren(fragment);
  }

  function updateMetrics(data) {
    const exact = data.metrics.exact;
    const euler = data.metrics.euler;
    const rk4 = data.metrics.rk4;
    document.querySelector("#metric-velocity").textContent = fmt(exact.velocity);
    document.querySelector("#metric-altitude").textContent = fmt(exact.altitude);
    document.querySelector("#metric-euler-v").textContent = `${fmt(euler.velocity)} m/s`;
    document.querySelector("#metric-rk4-v").textContent = `${fmt(rk4.velocity)} m/s`;
    document.querySelector("#metric-euler-y").textContent = `${fmt(euler.altitude)} m`;
    document.querySelector("#metric-rk4-y").textContent = `${fmt(rk4.altitude)} m`;
    document.querySelector("#metric-error-v").textContent = fmt(euler.velocity_error);
    document.querySelector("#metric-error-y").textContent = fmt(euler.altitude_error);
    document.querySelector("#step-count").textContent = `${data.step_count} ${data.step_count === 1 ? "intervalo" : "intervalos"}`;

    const eulerStatus = document.querySelector("#euler-status");
    eulerStatus.textContent = euler.meets_tolerance ? "CUMPLE" : "NO CUMPLE";
    eulerStatus.classList.toggle("status-pass", euler.meets_tolerance);
    eulerStatus.classList.toggle("status-fail", !euler.meets_tolerance);

    const passing = ["euler", "heun", "rk4"].filter((method) => data.metrics[method].meets_tolerance);
    const message = document.querySelector("#precision-message");
    const tag = document.querySelector("#precision-tag");
    const banner = document.querySelector("#precision-banner");
    if (passing.length === 3) {
      message.textContent = "Los tres métodos numéricos cumplen los límites configurados al final del intervalo.";
      tag.textContent = "PRECISIÓN OK";
      banner.classList.add("banner-pass");
      banner.classList.remove("banner-fail");
    } else if (passing.length > 0) {
      message.textContent = `Cumplen: ${passing.map((key) => key.toUpperCase()).join(", ")}. Euler ${data.metrics.euler.meets_tolerance ? "cumple" : "aún supera"} uno o más límites.`;
      tag.textContent = "COMPARACIÓN";
      banner.classList.remove("banner-pass", "banner-fail");
    } else {
      message.textContent = "Ningún método numérico cumple ambos límites; reduce el paso y vuelve a calcular.";
      tag.textContent = "AJUSTAR PASO";
      banner.classList.add("banner-fail");
      banner.classList.remove("banner-pass");
    }

    const velocityDifference = euler.velocity - exact.velocity;
    const altitudeDifference = euler.altitude - exact.altitude;
    const direction = (difference) => (Math.abs(difference) < 1e-10 ? "coincide con" : difference > 0 ? "sobreestima" : "subestima");
    const conclusion = document.querySelector("#conclusion-live-text");
    conclusion.textContent = `Con h = ${fmt(data.parameters.step_size)} s, Euler ${direction(velocityDifference)} la velocidad en ${fmt(Math.abs(velocityDifference))} m/s y ${direction(altitudeDifference)} la altura en ${fmt(Math.abs(altitudeDifference))} m frente a la solución analítica.`;
    document.querySelector("#conclusion-error-text").textContent =
      `Euler ${euler.meets_tolerance ? "cumple" : "no cumple"} los límites configurados de ${fmt(data.tolerances.velocity)} m/s para velocidad y ${fmt(data.tolerances.altitude)} m para altura, con ${data.step_count} intervalos.`;

    const velocityRelative = Math.abs(exact.velocity) > 1e-12 ? (euler.velocity_error / Math.abs(exact.velocity)) * 100 : null;
    const altitudeRelative = Math.abs(exact.altitude) > 1e-12 ? (euler.altitude_error / Math.abs(exact.altitude)) * 100 : null;
    document.querySelector("#analysis-reading").textContent =
      `Con h = ${fmt(data.parameters.step_size)} s, el error absoluto de Euler es ${fmt(euler.velocity_error)} m/s en velocidad y ${fmt(euler.altitude_error)} m en altura.`;
    document.querySelector("#analysis-velocity-error").textContent = `${fmt(euler.velocity_error, true)} m/s`;
    document.querySelector("#analysis-velocity-detail").textContent = velocityRelative === null
      ? `Euler ${fmt(euler.velocity, true)} · exacta ${fmt(exact.velocity, true)} · porcentaje no definido si el valor exacto es 0.`
      : `Euler ${fmt(euler.velocity, true)} · exacta ${fmt(exact.velocity, true)} · error relativo ${fmt(velocityRelative, true)}%.`;
    document.querySelector("#analysis-altitude-error").textContent = `${fmt(euler.altitude_error, true)} m`;
    document.querySelector("#analysis-altitude-detail").textContent = altitudeRelative === null
      ? `Euler ${fmt(euler.altitude, true)} · exacta ${fmt(exact.altitude, true)} · porcentaje no definido si el valor exacto es 0.`
      : `Euler ${fmt(euler.altitude, true)} · exacta ${fmt(exact.altitude, true)} · error relativo ${fmt(altitudeRelative, true)}%.`;
  }

  function updateFlight() {
    if (!latestData || !latestData.rows.length) return;
    const slider = document.querySelector("#flight-slider");
    const methodKey = document.querySelector("#flight-method").value;
    selectedIndex = Math.min(Math.max(selectedIndex, 0), latestData.rows.length - 1);
    slider.max = String(latestData.rows.length - 1);
    slider.value = String(selectedIndex);

    const row = latestData.rows[selectedIndex];
    const method = methods.find((item) => item.key === methodKey);
    const velocity = row[`${methodKey}_v`];
    const altitude = row[`${methodKey}_y`];
    const velocityError = Math.abs(velocity - row.exact_v);
    const altitudeError = Math.abs(altitude - row.exact_y);

    document.querySelector("#flight-method-label").textContent = method.name.toUpperCase();
    document.querySelector("#flight-time").textContent = `t = ${fmt(row.time, true)} s`;
    document.querySelector("#timeline-current").textContent = `${fmt(row.time, true)} s`;
    document.querySelector("#timeline-start").textContent = `${fmt(latestData.rows[0].time)} s`;
    document.querySelector("#timeline-end").textContent = `${fmt(latestData.rows[latestData.rows.length - 1].time)} s`;
    document.querySelector("#flight-velocity").innerHTML = `${fmt(velocity, true)} <small>m/s</small>`;
    document.querySelector("#flight-altitude").innerHTML = `${fmt(altitude, true)} <small>m</small>`;
    document.querySelector("#flight-error").innerHTML = `${fmt(velocityError, true)} / ${fmt(altitudeError, true)} <small>m/s · m</small>`;
    document.querySelector("#stage-altitude").textContent = `${fmt(altitude, true)} m`;

    const altitudes = latestData.rows.map((point) => point[`${methodKey}_y`]);
    const low = Math.min(...altitudes);
    const high = Math.max(...altitudes);
    const progress = high === low ? 0.5 : (altitude - low) / (high - low);
    const boundedProgress = Math.min(1, Math.max(0, progress));
    document.querySelector("#rocket-marker").style.bottom = `${8 + boundedProgress * 62}%`;
    document.querySelector("#stage-progress").style.height = `${Math.max(3, boundedProgress * 68)}%`;

    drawChart(document.querySelector("#velocity-chart"), latestData.rows, "v", "Velocidad (m/s)", chartVisibility.velocity);
    drawChart(document.querySelector("#altitude-chart"), latestData.rows, "y", "Altura (m)", chartVisibility.altitude);
  }

  function render(data) {
    latestData = data;
    selectedIndex = 0;
    updateMetrics(data);
    fillSummaryTable(document.querySelector("#summary-table"), data);
    fillTable(document.querySelector("#velocity-table"), data.rows, "v");
    fillTable(document.querySelector("#altitude-table"), data.rows, "y");
    makeLegend(document.querySelector("#velocity-legend"), "velocity");
    makeLegend(document.querySelector("#altitude-legend"), "altitude");
    document.querySelectorAll("[data-step-preset]").forEach((button) => {
      const isActive = Number(button.dataset.stepPreset) === data.parameters.step_size;
      button.classList.toggle("active", isActive);
    });
    updateFlight();
  }

  function stopPlayback() {
    if (playbackTimer !== null) {
      window.clearInterval(playbackTimer);
      playbackTimer = null;
    }
    const button = document.querySelector("#play-flight");
    button.setAttribute("aria-pressed", "false");
    button.innerHTML = '<span aria-hidden="true">▶</span> Reproducir';
  }

  function togglePlayback() {
    const button = document.querySelector("#play-flight");
    if (playbackTimer !== null) {
      stopPlayback();
      return;
    }
    if (selectedIndex >= latestData.rows.length - 1) {
      selectedIndex = 0;
      updateFlight();
    }
    button.setAttribute("aria-pressed", "true");
    button.innerHTML = '<span aria-hidden="true">Ⅱ</span> Pausar';
    playbackTimer = window.setInterval(() => {
      if (selectedIndex >= latestData.rows.length - 1) {
        stopPlayback();
        return;
      }
      selectedIndex += 1;
      updateFlight();
    }, Math.max(60, Math.min(260, 900 / Math.max(1, latestData.step_count / 20))));
  }

  async function runSimulation(event) {
    event.preventDefault();
    stopPlayback();
    formError.hidden = true;
    formError.textContent = "";
    if (!form.reportValidity()) return;

    const payload = Object.fromEntries(new FormData(form).entries());
    calculateButton.disabled = true;
    calculateButton.querySelector("span:first-child").textContent = "Calculando…";
    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo calcular la simulación.");
      render(result);
    } catch (error) {
      formError.textContent = error.message || "Ocurrió un error al conectar con el servidor.";
      formError.hidden = false;
      formError.focus?.();
    } finally {
      calculateButton.disabled = false;
      calculateButton.querySelector("span:first-child").textContent = "Calcular simulación";
    }
  }

  function downloadCsv() {
    if (!latestData) return;
    const headers = [
      "Tiempo (s)",
      "Velocidad exacta (m/s)", "Velocidad Euler (m/s)", "Error Euler velocidad (m/s)",
      "Velocidad Heun (m/s)", "Error Heun velocidad (m/s)", "Velocidad RK4 (m/s)", "Error RK4 velocidad (m/s)",
      "Altura exacta (m)", "Altura Euler (m)", "Error Euler altura (m)",
      "Altura Heun (m)", "Error Heun altura (m)", "Altura RK4 (m)", "Error RK4 altura (m)",
    ];
    const toLocaleDecimal = (value) => String(value).replace(".", ",");
    const lines = [headers.join(";")];
    latestData.rows.forEach((row) => {
      const values = [
        row.time,
        row.exact_v, row.euler_v, Math.abs(row.euler_v - row.exact_v),
        row.heun_v, Math.abs(row.heun_v - row.exact_v), row.rk4_v, Math.abs(row.rk4_v - row.exact_v),
        row.exact_y, row.euler_y, Math.abs(row.euler_y - row.exact_y),
        row.heun_y, Math.abs(row.heun_y - row.exact_y), row.rk4_y, Math.abs(row.rk4_y - row.exact_y),
      ];
      lines.push(values.map(toLocaleDecimal).join(";"));
    });
    const blob = new Blob(["\ufeff", lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "simulacion_cohete.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  form.addEventListener("submit", runSimulation);
  form.addEventListener("reset", () => {
    formError.hidden = true;
    document.querySelectorAll(".scenario-button").forEach((button) => button.classList.remove("active"));
    window.setTimeout(() => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })), 0);
  });
  document.querySelector("#download-csv").addEventListener("click", downloadCsv);

  document.querySelectorAll(".scenario-button").forEach((button) => {
    button.addEventListener("click", () => {
      const scenario = scenarios.find((item) => item.id === button.dataset.scenario);
      if (!scenario) return;
      Object.entries(scenario.parameters).forEach(([name, value]) => {
        if (form.elements[name]) form.elements[name].value = value;
      });
      document.querySelectorAll(".scenario-button").forEach((item) => item.classList.toggle("active", item === button));
      form.requestSubmit();
    });
  });

  document.querySelectorAll("[data-step-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      form.elements.step_size.value = button.dataset.stepPreset;
      form.requestSubmit();
    });
  });
  document.querySelector("#flight-slider").addEventListener("input", (event) => {
    selectedIndex = Number(event.currentTarget.value);
    updateFlight();
  });
  document.querySelector("#flight-method").addEventListener("change", updateFlight);
  document.querySelector("#play-flight").addEventListener("click", togglePlayback);

  const initialPayload = JSON.parse(document.querySelector("#initial-data").textContent);
  render(initialPayload);
})();
