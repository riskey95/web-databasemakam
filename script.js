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

// Fungsi untuk mengubah warna fitur yang diklik
function changeFeatureColor(layerId, featureId, newColor) {
    const filter = ['==', '$id', featureId]; // Filter berdasarkan ID fitur
    map.setPaintProperty(layerId, 'line-color', [
        'case',
        filter, newColor, // Jika fitur cocok, ubah warnanya menjadi 'newColor'
        map.getPaintProperty(layerId, 'line-color') // Jika tidak, gunakan warna asli
    ]);
}

// Fungsi untuk menampilkan popup
function showPopup(coordinates, properties, geometry, layerId, featureId) {
    let content;

    // Cek tipe fitur
    if (geometry.type === 'LineString') {
        // Jika fitur adalah LineString, tampilkan nama dan keterangan
        content = `
            <h6>${properties.Nama}</h6>
            <p>Keterangan: ${properties.Keterangan}<br/>Panjang: ${properties.Panjang} m</p>
        `;
    } else if (geometry.type === 'Point') {
        // Jika fitur adalah Point, tampilkan hanya nama
        content = `<h6>${properties.Nama}</h6>`;
    }

    // Buat popup baru
    new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(content)
        .addTo(map);

    // Ubah warna fitur yang diklik
    const newColor = '#FF0000'; // Warna baru yang diinginkan
    changeFeatureColor(layerId, featureId, newColor);
}

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
            const featuresByName = {};

            // Mengelompokkan fitur berdasarkan properti "Nama"
            data.features.forEach(feature => {
                const name = feature.properties.Nama; // Pastikan ada properti 'Nama'

                if (!featuresByName[name]) {
                    featuresByName[name] = [];
                }
                featuresByName[name].push(feature);
            });

            // Membuat folder layer untuk dataset
            const layerGroup = document.createElement('div');
            layerGroup.className = 'layer-item';

            // Membuat header folder untuk kategori
            const folderHeader = document.createElement('div');
            folderHeader.className = `folder-header header-dataset${index + 1}`; // Ganti warna sesuai ID
            folderHeader.innerHTML = `${layerGroupId} <i class="fas fa-caret-down"></i>`;

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

            Object.keys(featuresByName).forEach((name, idx) => {
                const features = featuresByName[name]; // Gabungan fitur yang memiliki properti 'Nama' sama
                const layerId = `${layerGroupId}-layer-${idx}`; // Layer ID unik
                const geojsonData = {
                    type: 'FeatureCollection',
                    features: features
                };

                // Menggunakan warna berdasarkan indeks dataset
                const layerColor = colors[idx % colors.length];

                // Menentukan tipe layer berdasarkan geometri fitur pertama
                const geometryType = features[0].geometry.type;

                if (geometryType === 'Point') {
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
                } else if (geometryType === 'LineString') {
                    map.addLayer({
                        id: layerId,
                        type: 'line',
                        minzoom: 17,
                        source: {
                            type: 'geojson',
                            data: geojsonData
                        },
                        'layout': {
                            'line-cap': 'round',  // Atur bentuk ujung garis
                            'line-join': 'round'  // Mengatur bentuk sambungan garis
                        },
                        paint: {
                            'line-color': [
                                'match', ['get', 'Keterangan'],
                                'Tidak Berpagar', 'red',
                                'Dinding Bangunan Lain', 'yellow',
                                'Pagar', 'green',
                                layerColor
                            ],
                            'line-width': 5
                        }
                    });
                } else if (geometryType === 'Polygon') {
                    map.addLayer({
                        id: layerId,
                        type: 'fill',
                        minzoom: 17,
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

                // Tambahkan event listener untuk klik pada fitur
                map.on('click', layerId, function(e) {
                    const coordinates = e.lngLat;
                    const properties = e.features[0].properties;
                    const geometry = e.features[0].geometry;
                    const featureId = e.features[0].id; // Ambil ID fitur
                    showPopup(coordinates, properties, geometry, layerId, featureId); // Tambahkan ID fitur ke fungsi popup
                });

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
                    event.preventDefault();
                    event.stopPropagation();
                    flyToFeature(features[0]); // Fly to the first feature in the group
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
            zoom: 18,
            essential: true
        });
    } else if (feature.geometry.type === 'LineString') {
        coordinates = getLineMidpoint(feature.geometry.coordinates);
        map.flyTo({
            center: coordinates,
            zoom: 18,
            essential: true
        });
    } else if (feature.geometry.type === 'Polygon') {
        coordinates = getPolygonCentroid(feature.geometry.coordinates[0]);
        map.flyTo({
            center: coordinates,
            zoom: 18,
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
