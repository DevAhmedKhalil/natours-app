/* eslint-disable */

// console.log('Hello from the clint side :D');
// const locations = JSON.parse(document.getElementById('map').dataset.locations);
// console.log(locations);

export const displayMap = locations => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoiLWFobWVka2hhbGlsIiwiYSI6ImNsczBxdWdqMjAzaG4ybnF4YXlncWgwMG4ifQ.zPwez_r8qgcgpOGQu9vFXg';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/-ahmedkhalil/cls0spmzg00m501qs46labknr',
    scrollZoom: false
    // center: [-118.113491, 34.111745],
    // zoom: 10
    // interactive: false
  });
  const bounds = new mapboxgl.LngLatBounds();
  locations.forEach(loc => {
    // Create marker
    const el = document.createElement('div');
    el.className = 'marker';
    // Add marker to map
    new mapboxgl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat(loc.coordinates)
      .addTo(map);
    // Adding popup
    new mapboxgl.Popup({ offset: 30 })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);
    // Extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });
  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 200
    }
  });
};
