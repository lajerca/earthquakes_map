$(document).ready(function() {
    var map = L.map('map').setView([45.5, 12], 2);

    L.tileLayer(
        'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw',
        {
            maxZoom: 18,
            attribution:
                'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
                '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
            id: 'mapbox.streets',
        }
    ).addTo(map);

    var blackIcon = L.icon({
        iconUrl: 'map-marker.svg',
        iconSize: [64, 74],
        iconanchor: [32, 74],
        popupAnchor: [0, -50],
    });
    var redIcon = L.icon({
        iconUrl: 'map-marker-red.svg',
        iconSize: [64, 74],
        iconanchor: [32, 74],
        popupAnchor: [0, -50],
    });

    var popup = L.popup();

    function onMapClick(e) {
        popup
            .setLatLng(e.latlng)
            .setContent('You clicked the map at ' + e.latlng.toString())
            .openOn(map);
    }

    var options = { units: 'kilometers' };
    map.on('mousemove', function(e) {
        console.log('e', e);
        var from = turf.point([e.latlng.lat, e.latlng.lng]);
        markers.forEach(function(marker) {
            var to = turf.point([marker.getLatLng().lat, marker.getLatLng().lng]);
            var distance = turf.distance(from, to, options);
            if (distance < 10) {
                marker.setIcon(redIcon);
            } else {
                marker.setIcon(blackIcon);
            }
        });
    });
    $('#current_center').text(map.getCenter().lat + ' , ' + map.getCenter().lng);
    map.on('moveend', function(e) {
        $('#current_center').text(map.getCenter().lat + ' , ' + map.getCenter().lng);
        //$('#map_current_center').html(map.getCenter().lat + ' , ' + map.getCenter().lng);
    });

    var filters = {
        text: '',
        range: [],
    };

    var allEarthquakes = false;

    fetch('./all_earthquakes.json', {
        method: 'GET',
    })
        .then(response => response.json())
        .then(json => {
            //						console.log('all earthquakes', json);
            var min = 0;
            var max = 0;
            allEarthquakes = L.geoJSON(json, {
                style: function(feature) {
                    return {
                        fillOpacity: 0.2,
                        color: 'black',
                        weight: 0.1,
                    };
                },
                pointToLayer: function(geoJsonPoint, latlng) {
                    if (geoJsonPoint.properties.mag < min || min === 0) {
                        min = geoJsonPoint.properties.mag;
                    }
                    if (geoJsonPoint.properties.mag > max) {
                        max = geoJsonPoint.properties.mag;
                    }

                    var html = '';
                    var arrayOfProps = ['mag', 'title', 'place', 'time'];
                    arrayOfProps.forEach(function(prop) {
                        html += '<strong>' + prop + '</strong>: ' + geoJsonPoint.properties[prop] + '<br/>';
                    });
                    return L.circle(latlng, 50000 * geoJsonPoint.properties.mag).bindPopup(html);
                },
            }).addTo(map);

            console.log(this);

            ///// FILTER  MAGNITUDE
            filters.range = [min, max];
            var slider = document.getElementById('slider');

            noUiSlider
                .create(slider, {
                    start: [min, max],
                    connect: true,
                    tooltips: true,
                    range: {
                        min: min,
                        max: max,
                    },
                })
                .on('slide', function(e) {
                    //console.log(e);

                    filters.range = [parseFloat(e[0]), parseFloat(e[1])];
                    allEarthquakes.eachLayer(function(layer) {
                        filterGeoJSON(layer);
                    });
                });

            //map.fitBounds(earthquakesJSON.getBounds(), { padding: [10, 10] });
        })
        .catch(error => console.log(error.message));

    ////// FILTER TEXT

    $(document).on('keyup', '#search', function(e) {
        filters.text = e.target.value;

        //console.log( 'e', userInput)
        allEarthquakes.eachLayer(function(layer) {
            console.log('eachLayer', layer);

            filterGeoJSON(layer);
        });
    });

    function filterGeoJSON(layer) {
        var numberOfTrue = 0;
        if (layer.feature.properties.title.toLowerCase().indexOf(filters.text.toLowerCase()) > -1) {
            numberOfTrue += 1;
        }
        if (
            layer.feature.properties.mag >= filters.range[0] &&
            layer.feature.properties.mag <= filters.range[1]
        ) {
            numberOfTrue += 1;
        }
        if (numberOfTrue === 2) {
            layer.addTo(map);
        } else {
            map.removeLayer(layer);
        }
    }
});