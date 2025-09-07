<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GPX Elevation & Map Viewer</title>
  <link rel="stylesheet" href="style.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</head>
<body>
  <h2>📍 GPX Elevation & Map Viewer</h2>

  <label for="unitSelect">Units:</label>
  <select id="unitSelect">
    <option value="metric" selected>Metric (km/m)</option>
    <option value="imperial">Imperial (mi/ft)</option>
  </select>

  <input type="file" multiple accept=".gpx" id="gpxFiles" />

  <canvas id="elevationChart"></canvas>
  <div id="map"></div>
  <div class="summary" id="summary"></div>

  <button id="downloadBtn">⬇️ Download Summary as CSV</button>

  <script src="script.js"></script>
</body>
</html>
