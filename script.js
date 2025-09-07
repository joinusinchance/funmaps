const chartCtx = document.getElementById('elevationChart').getContext('2d');
const summaryDiv = document.getElementById('summary');
const unitSelect = document.getElementById('unitSelect');
const downloadBtn = document.getElementById('downloadBtn');
const map = L.map('map').setView([0, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let rawTracks = [];

const elevationChart = new Chart(chartCtx, {
  type: 'line',
  data: { datasets: [] },
  options: {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Elevation Profile' }
    },
    scales: {
      x: { title: { display: true, text: 'Distance' } },
      y: { title: { display: true, text: 'Elevation' } }
    }
  }
});

document.getElementById('gpxFiles').addEventListener('change', handleFiles);
unitSelect.addEventListener('change', () => {
  updateChart();
  updateSummary();
});
downloadBtn.addEventListener('click', () => {
  const csv = generateCSV(rawTracks, unitSelect.value);
  downloadCSV(csv);
});

function handleFiles(event) {
  const files = event.target.files;
  rawTracks = [];
  elevationChart.data.datasets = [];
  summaryDiv.innerHTML = '';
  map.eachLayer(layer => {
    if (layer instanceof L.Polyline) map.removeLayer(layer);
  });

  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = () => {
      const parser = new DOMParser();
      const xml = parser.parseFromString(reader.result, 'application/xml');
      const trkpts = xml.getElementsByTagName('trkpt');

      if (!trkpts.length) return;

      let points = [];
      let totalDistance = 0;
      let prevLat = null, prevLon = null;

      for (let i = 0; i < trkpts.length; i++) {
        const lat = parseFloat(trkpts[i].getAttribute('lat'));
        const lon = parseFloat(trkpts[i].getAttribute('lon'));
        const eleTag = trkpts[i].getElementsByTagName('ele')[0];
        if (!eleTag) continue;
        const ele = parseFloat(eleTag.textContent);

        let dist = 0;
        if (prevLat !== null && prevLon !== null) {
          dist = haversine(prevLat, prevLon, lat, lon);
          totalDistance += dist;
        }

        points.push({ dist: totalDistance, ele, lat, lon });
        prevLat = lat;
        prevLon = lon;
      }

      const elevationGain = calculateElevationGain(points);
      const color = getRandomColor();
      rawTracks.push({ name: file.name, points, totalDistance, elevationGain, color });

      updateChart();
      updateMap();
    };
    reader.readAsText(file);
  });
}

function updateChart() {
  if (!rawTracks.length) return;

  const unit = unitSelect.value;
  elevationChart.data.datasets = [];

  rawTracks.forEach(track => {
    if (!Array.isArray(track.points) || track.points.length === 0) return;
  
  const converted = track.points.map(p => ({
    x: parseFloat(unit === 'imperial' ? (p.dist * 0.621371).toFixed(2) : p.dist.toFixed(2)),
    y: parseFloat(unit === 'imperial' ? (p.ele * 3.28084).toFixed(0) : p.ele.toFixed(0))
  }));

    elevationChart.data.datasets.push({
      label: track.name,
      data: converted,
      borderColor: track.color,
      backgroundColor: track.color,
      fill: false,
      tension: 0.1, // smooth line
      pointRadius: 0 // hide points for cleaner look
    });
  });


  elevationChart.options.scales.x.title.text = unit === 'imperial' ? 'Distance (mi)' : 'Distance (km)';
  elevationChart.options.scales.y.title.text = unit === 'imperial' ? 'Elevation (ft)' : 'Elevation (m)';
  elevationChart.update();
  updateSummary();
}

function updateMap() {
  map.eachLayer(layer => {
    if (layer instanceof L.Polyline) map.removeLayer(layer);
  });

  let allBounds = [];

  rawTracks.forEach(track => {
    if (!Array.isArray(track.points)) return;

    const latlngs = track.points.map(p => [p.lat, p.lon]);
    const polyline = L.polyline(latlngs, {
      color: track.color,
      weight: 3,
      opacity: 0.8
    }).addTo(map);
    allBounds.push(polyline.getBounds());
  });

  if (allBounds.length > 0) {
    const combinedBounds = allBounds.reduce((acc, b) => acc.extend(b), allBounds[0]);
    map.fitBounds(combinedBounds);
  }
}

function updateSummary() {
  const unit = unitSelect.value;
  summaryDiv.innerHTML = '';
  rawTracks.forEach(track => {
    const dist = unit === 'imperial'
      ? (track.totalDistance * 0.621371).toFixed(2) + ' mi'
      : track.totalDistance.toFixed(2) + ' km';
    const gain = unit === 'imperial'
      ? (track.elevationGain * 3.28084).toFixed(0) + ' ft'
      : track.elevationGain.toFixed(0) + ' m';
    summaryDiv.innerHTML += `<p><strong>${track.name}</strong>: ${dist}, Elevation Gain: ${gain}</p>`;
  });
}

function calculateElevationGain(points) {
  let gain = 0;
  for (let i = 1; i < points.length; i++) {
    const delta = points[i].ele - points[i - 1].ele;
    if (delta > 0) gain += delta;
  }
  return gain;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function getRandomColor() {
  return `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`;
}

function generateCSV(tracks, unit) {
  const rows = [['Track Name', `Distance (${unit === 'imperial' ? 'mi' : 'km'})`, `Elevation Gain (${unit === 'imperial' ? 'ft' : 'm'})`]];
  tracks.forEach(track => {
    const dist = unit === 'imperial'
      ? (track.totalDistance * 0.621371).toFixed(2)
      : track.totalDistance.toFixed(2);
    const gain = unit === 'imperial'
      ? (track.elevationGain * 3.28084).toFixed(0)
      : track.elevationGain.toFixed(0);
    rows.push([track.name, dist, gain]);
  });
  return rows.map(row => row.join(',')).join('\n');
}

function downloadCSV(content, filename = 'gpx_summary.csv') {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
