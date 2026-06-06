const url = 'http://router.project-osrm.org/table/v1/driving/90.4125,23.8103;90.3976,23.725?sources=0';
fetch(url).then(r => r.json()).then(data => console.log(data.distances));
