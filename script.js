let scene = 1;
let currentRange = "full";

function clearScene4Toggles() {
  document.getElementById("show-close").checked = false;
  document.getElementById("show-bands").checked = false;
  document.getElementById("show-volatility").checked = false;
}

function updateButtons() {
  const backBtn = document.getElementById("back");
  const nextBtn = document.getElementById("next");

  backBtn.classList.remove("disabled");
  nextBtn.classList.remove("disabled");

  if (scene === 1) backBtn.classList.add("disabled");
  if (scene === 4) nextBtn.classList.add("disabled");
}

function getSceneData(sceneValue, data) {
  if (sceneValue === 3) {
    return data.filter(d => d.date >= new Date("2020-03-15") && d.date <= new Date("2020-03-31"));
  }

  if (sceneValue === 4) {
    if (currentRange === "march") {
      return data.filter(d => d.date >= new Date("2020-03-01") && d.date <= new Date("2020-03-31"));
    }
    if (currentRange === "late-march") {
      return data.filter(d => d.date >= new Date("2020-03-15") && d.date <= new Date("2020-03-31"));
    }
  }

  return data;
}

function drawScene(sceneValue, data) {
  d3.select("#chart").selectAll("*").remove();

  const w = 1200;
  const h = 650;
  const margin = { top: 60, right: 60, bottom: 60, left: 80 };
  const sceneData = getSceneData(sceneValue, data);

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", w)
    .attr("height", h);

  const x = d3.scaleTime()
    .domain(d3.extent(sceneData, d => d.date))
    .range([margin.left, w - margin.right]);

  const yClose = d3.scaleLinear()
    .domain([d3.min(sceneData, d => d.lower), d3.max(sceneData, d => d.upper)])
    .range([h - margin.bottom, margin.top]);

  const yVol = d3.scaleLinear()
    .domain(d3.extent(sceneData, d => d.SD20))
    .range([h - margin.bottom, margin.top]);

  const drawClose = (xScale = x, yScale = yClose) => {
    const line = d3.line().x(d => xScale(d.date)).y(d => yScale(d.close));
    svg.append("path")
      .datum(sceneData)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 3)
      .attr("d", line);
  };

  const drawVol = (xScale = x) => {
    const line = d3.line().x(d => xScale(d.date)).y(d => yVol(d.SD20));
    svg.append("path")
      .datum(sceneData)
      .attr("fill", "none")
      .attr("stroke", "orange")
      .attr("stroke-width", 3)
      .attr("d", line);
  };

  const drawBands = (xScale = x, yScale = yClose) => {
    const lineMA20 = d3.line().x(d => xScale(d.date)).y(d => yScale(d.MA20));
    const lineUpper = d3.line().x(d => xScale(d.date)).y(d => yScale(d.upper));
    const lineLower = d3.line().x(d => xScale(d.date)).y(d => yScale(d.lower));

    svg.append("path")
      .datum(sceneData)
      .attr("fill", "none")
      .attr("stroke", "lightgreen")
      .attr("stroke-width", 3)
      .attr("d", lineMA20);

    svg.append("path")
      .datum(sceneData)
      .attr("fill", "rgba(255,0,0,0.20)")
      .attr("stroke", "none")
      .attr("pointer-events", "none")
      .attr("d", d3.area()
        .x(d => xScale(d.date))
        .y0(d => yScale(d.lower))
        .y1(d => yScale(d.upper)));

    svg.append("path")
      .datum(sceneData)
      .attr("fill", "none")
      .attr("stroke", "darkred")
      .attr("stroke-width", 4)
      .attr("d", lineUpper);

    svg.append("path")
      .datum(sceneData)
      .attr("fill", "none")
      .attr("stroke", "maroon")
      .attr("stroke-width", 4)
      .attr("stroke-dasharray", "6 6")
      .attr("d", lineLower);
  };

  if (sceneValue === 1) {
    drawClose();
  }

  if (sceneValue === 2) {
    drawClose();
    drawVol();
  }

  if (sceneValue === 3) {
    drawClose();
    drawBands();
  }

  if (sceneValue === 4) {
    if (document.getElementById("show-close").checked) drawClose();
    if (document.getElementById("show-bands").checked) drawBands();
    if (document.getElementById("show-volatility").checked) drawVol();

    const zoom = d3.zoom()
      .scaleExtent([1, 20])
      .translateExtent([[0, 0], [w, h]])
      .extent([[0, 0], [w, h]])
      .on("zoom", function(event) {
        const newX = event.transform.rescaleX(x);

        const visibleData = sceneData.filter(d => {
          const px = newX(d.date);
          return px >= margin.left && px <= w - margin.right;
        });

        const newY = d3.scaleLinear()
          .domain([d3.min(visibleData, d => d.lower), d3.max(visibleData, d => d.upper)])
          .range([h - margin.bottom, margin.top]);

        svg.selectAll("*").remove();

        if (document.getElementById("show-close").checked) drawClose(newX, newY);
        if (document.getElementById("show-bands").checked) drawBands(newX, newY);
        if (document.getElementById("show-volatility").checked) drawVol(newX);

        svg.append("g")
          .attr("transform", `translate(0,${h - margin.bottom})`)
          .call(d3.axisBottom(newX));

        svg.append("g")
          .attr("transform", `translate(${margin.left},0)`)
          .call(d3.axisLeft(newY));
      });

    svg.call(zoom);
  }

  svg.append("g")
    .attr("transform", `translate(0,${h - margin.bottom})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(yClose));

  const tooltip = d3.select("#tooltip");
  const bisectDate = d3.bisector(d => d.date).left;

  const hoverCircle = svg.append("circle")
    .attr("r", 6)
    .attr("class", "tooltip-circle")
    .style("display", "none");

  const hoverCircleVol = svg.append("circle")
    .attr("r", 6)
    .attr("class", "tooltip-circle")
    .style("fill", "orange")
    .style("display", "none");

  svg.append("rect")
    .attr("width", w)
    .attr("height", h)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .on("mousemove", function(event) {
      const mouseX = d3.pointer(event)[0];
      const mouseY = d3.pointer(event)[1];
      const xDate = x.invert(mouseX);
      const i = bisectDate(sceneData, xDate);
      const d = sceneData[i];
      if (!d) return;

      let hoveredColor = "steelblue";
      let hoveredY = yClose(d.close);

      if (sceneValue >= 2) {
        const distClose = Math.abs(yClose(d.close) - mouseY);
        const distVol = Math.abs(yVol(d.SD20) - mouseY);

        if (distVol < distClose) {
          hoveredColor = "orange";
          hoveredY = yVol(d.SD20);
          hoverCircleVol.style("display", "").attr("cx", x(d.date)).attr("cy", hoveredY);
          hoverCircle.style("display", "none");
        } else {
          hoverCircle.style("display", "").attr("cx", x(d.date)).attr("cy", hoveredY);
          hoverCircleVol.style("display", "none");
        }
      } else {
        hoverCircle.style("display", "").attr("cx", x(d.date)).attr("cy", hoveredY);
      }

      let html = "<strong>" + d.date.toLocaleDateString() + "</strong><br>Close: " + d.close.toFixed(2);
      if (sceneValue >= 2) html += "<br>SD20: " + d.SD20.toFixed(2);
      if (sceneValue === 3 || sceneValue === 4) html += "<br>Upper: " + d.upper.toFixed(2) + "<br>Lower: " + d.lower.toFixed(2);

      tooltip
        .style("display", "block")
        .style("border-left", "6px solid " + hoveredColor)
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 20) + "px")
        .html(html);
    })
    .on("mouseout", function() {
      hoverCircle.style("display", "none");
      hoverCircleVol.style("display", "none");
      tooltip.style("display", "none");
    });

  if (sceneValue === 3) {
    document.getElementById("bb-button").style.display = "inline-block";
  } else {
    document.getElementById("bb-button").style.display = "none";
    document.getElementById("bb-info").style.display = "none";
  }

  document.getElementById("explore-controls").style.display = sceneValue === 4 ? "block" : "none";

  updateButtons();

  document.getElementById("summary1").style.display = sceneValue === 1 ? "block" : "none";
  document.getElementById("summary2").style.display = sceneValue === 2 ? "block" : "none";
  document.getElementById("summary3").style.display = sceneValue === 3 ? "block" : "none";
  document.getElementById("summary4").style.display = sceneValue === 4 ? "block" : "none";

  document.getElementById("annotation1").style.display = sceneValue === 1 ? "block" : "none";
  document.getElementById("annotation2").style.display = sceneValue === 2 ? "block" : "none";
  document.getElementById("annotation3").style.display = sceneValue === 3 ? "block" : "none";
  document.getElementById("annotation4").style.display = sceneValue === 4 ? "block" : "none";
}

d3.csv("AAPL.csv").then(function(data) {
  const parseDate = d3.timeParse("%Y-%m-%d");

  data.forEach(function(d) {
    d.date = parseDate(d.Date);
    d.close = +d["Close(t)"];
    d.SD20 = +d.SD20;
    d.MA20 = +d.MA20;
    d.upper = d.MA20 + (2 * d.SD20);
    d.lower = d.MA20 - (2 * d.SD20);
  });

  window.globalData = data;
  drawScene(scene, data);
});

document.getElementById("next").onclick = () => {
  if (scene < 4) {
    scene++;
    if (scene === 4) clearScene4Toggles();
    drawScene(scene, window.globalData);
  }
};

document.getElementById("back").onclick = () => {
  if (scene > 1) {
    scene--;
    if (scene === 4) clearScene4Toggles();
    drawScene(scene, window.globalData);
  }
};

document.getElementById("bb-button").onclick = () => {
  const box = document.getElementById("bb-info");
  box.style.display = box.style.display === "none" ? "block" : "none";
};

document.getElementById("time-range").onchange = () => {
  currentRange = document.getElementById("time-range").value;
  if (scene === 4) drawScene(4, window.globalData);
};

document.getElementById("show-close").onchange = () => {
  if (scene === 4) drawScene(4, window.globalData);
};

document.getElementById("show-bands").onchange = () => {
  if (scene === 4) drawScene(4, window.globalData);
};

document.getElementById("show-volatility").onchange = () => {
  if (scene === 4) drawScene(4, window.globalData);
};

document.getElementById("reset-view").onclick = () => {
  clearScene4Toggles();
  drawScene(4, window.globalData);
};
