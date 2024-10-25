// Ganti dengan token akses Anda
const YOUR_TOKEN_ID = 'pk.eyJ1Ijoicmlza2kwMSIsImEiOiJjbGV3OHNqbW4wOTNuM3JtbmZsbWthN2o0In0.oHdktl5pZgBUNelGETOlmg'; // Masukkan token akses Anda
const YOUR_USERNAME = 'riski01'; // Nama pengguna Mapbox Anda

// List dataset
const datasets = [
    { id: 'cm20r8gga2sl81nny0pxyi3uf', name: 'Makam' },
    { id: 'cm20r53a02sv91un2i55ifzby', name: 'Pagar Makam' },
    // Tambahkan lebih banyak dataset sesuai kebutuhan
];

// Array warna untuk layer berdasarkan indeks
const colors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF', '#FFB833'];

// Token akses Mapbox
mapboxgl.accessToken = YOUR_TOKEN_ID;

// Membuat peta
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [111.883110, -7.150975],
    zoom: 10
});

// Fungsi untuk menambahkan dataset ke peta
function addDatasetToMap(datasetId, layerGroupId, index) {
    const datasetUrl = `https://api.mapbox.com/datasets/v1/${YOUR_USERNAME}/${datasetId}/features?access_token=${YOUR_TOKEN_ID}`;

    fetch(datasetUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const layerGroup = document.createElement('div');
            layerGroup.className = 'layer-item';

            // Membuat header folder untuk kategori
            const folderHeader = document.createElement('div');
            folderHeader.className = `folder-header header-dataset${index + 1}`; // Ganti warna sesuai ID
            folderHeader.innerHTML = `Layer ${layerGroupId} <i class="fas fa-caret-down"></i>`;

            // Menangani klik pada header untuk fold/unfold
            folderHeader.addEventListener('click', function () {
                const folderContent = folderHeader.nextElementSibling;
                folderContent.style.display = folderContent.style.display === 'none' ? 'block' : 'none';
            });

            layerGroup.appendChild(folderHeader); // Tambahkan header folder ke layer group

            // Membuat konten folder untuk checkbox
            const folderContent = document.createElement('div');
            folderContent.className = 'folder-content';
            folderContent.style.display = 'none'; // Tersembunyi secara default

            data.features.forEach((feature, index) => {
                const name = feature.properties.Nama; // Pastikan ada properti 'name'
                const layerId = `${layerGroupId}-layer-${index}`; // Layer ID unik

                // Menentukan tipe layer berdasarkan geometri
                let geojsonData = {
                    type: 'FeatureCollection',
                    features: [feature]
                };

                // Menggunakan warna berdasarkan indeks dataset
                const layerColor = colors[index % colors.length]; // Memilih warna berdasarkan indeks

                if (feature.geometry.type === 'Point') {
                    map.addLayer({
                        id: layerId,
                        type: 'circle',
                        source: {
                            type: 'geojson',
                            data: geojsonData
                        },
                        paint: {
                            'circle-color': layerColor,
                            'circle-radius': 6
                        }
                    });
                } else if (feature.geometry.type === 'LineString') {
                    map.addLayer({
                        id: layerId,
                        type: 'line',
						minzoom: 18,
                        source: {
                            type: 'geojson',
                            data: geojsonData
                        },
                        paint: {
                            'line-color': layerColor,
                            'line-width': 2
                        }
                    });
                } else if (feature.geometry.type === 'Polygon') {
                    map.addLayer({
                        id: layerId,
                        type: 'fill',
                        source: {
                            type: 'geojson',
                            data: geojsonData
                        },
                        paint: {
                            'fill-color': layerColor,
                            'fill-opacity': 0.5
                        }
                    });
                }

                // Populasi nested list dengan nama
                const listItem = document.createElement('div');
                listItem.className = 'list-group-item';
                listItem.innerHTML = `<input type="checkbox" id="${layerId}" checked /> <label for="${layerId}">${name}</label>`;

                // Menangani klik pada checkbox untuk toggle visibilitas layer
                listItem.querySelector('input').addEventListener('change', (e) => {
                    const visibility = e.target.checked ? 'visible' : 'none';
                    map.setLayoutProperty(layerId, 'visibility', visibility);
                });

                // Menangani klik pada label untuk melakukan zoom ke titik
                listItem.querySelector('label').addEventListener('click', (event) => {
                    event.preventDefault(); // Mencegah tindakan default
                    event.stopPropagation(); // Mencegah event bubbling
                    flyToFeature(feature); // Memanggil fungsi untuk fly to feature
                });

                folderContent.appendChild(listItem); // Tambahkan item ke konten folder
            });

            layerGroup.appendChild(folderContent); // Tambahkan konten folder ke layer group
            document.getElementById('layerList').appendChild(layerGroup); // Tambahkan layer group ke sidebar
        })
        .catch(err => console.error('Error fetching the dataset:', err));
}

// Fungsi untuk melakukan fly ke titik dari feature
function flyToFeature(feature) {
    let coordinates;

    if (feature.geometry.type === 'Point') {
        coordinates = feature.geometry.coordinates;
        map.flyTo({
            center: coordinates,
            zoom: 18, // Ubah zoom untuk Point
            essential: true // Agar animasi zoom tidak diabaikan
        });
    } else if (feature.geometry.type === 'LineString') {
        coordinates = getLineMidpoint(feature.geometry.coordinates);
        map.flyTo({
            center: coordinates,
            zoom: 18, // Ubah zoom untuk LineString
            essential: true
        });
    } else if (feature.geometry.type === 'Polygon') {
        coordinates = getPolygonCentroid(feature.geometry.coordinates[0]);
        map.flyTo({
            center: coordinates,
            zoom: 18, // Ubah zoom untuk Polygon
            essential: true
        });
    }
}

// Fungsi untuk mendapatkan titik tengah dari garis
function getLineMidpoint(coords) {
    const midIndex = Math.floor(coords.length / 2);
    return coords[midIndex];
}

// Fungsi untuk mendapatkan centroid dari poligon
function getPolygonCentroid(polygon) {
    const n = polygon.length;
    let x = 0;
    let y = 0;

    polygon.forEach(coord => {
        x += coord[0];
        y += coord[1];
    });

    return [x / n, y / n];
}

// Memanggil fungsi untuk menambahkan dataset ke peta
datasets.forEach((dataset, index) => {
    addDatasetToMap(dataset.id, dataset.name, index);
});
