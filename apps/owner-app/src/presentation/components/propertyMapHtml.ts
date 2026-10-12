import { mapPoint, type MapPoint } from "../../domain/propertyLocation";

export function propertyMapHtml(initial: MapPoint | null) {
  const point = mapPoint(initial);
  const center = point ?? { latitude: -2.5, longitude: 118 };
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<style>html,body,#map{height:100%;margin:0;background:#f3f1ee}#pin{position:absolute;z-index:500;left:50%;top:50%;width:24px;height:24px;background:#F58A00;border:3px solid white;border-radius:50% 50% 50% 0;transform:translate(-50%,-100%) rotate(-45deg);box-shadow:0 1px 5px #555;pointer-events:none}.leaflet-control-attribution{font-size:11px}</style>
</head><body><div id="map"></div><div id="pin" aria-hidden="true"></div>
<script>
function send(value){var data=JSON.stringify(value);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(data);else window.parent.postMessage(data,'*');}
window.addEventListener('error',function(){send({type:'error'});});
var timeout=setTimeout(function(){send({type:'error'});},20000);
</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js" onerror="send({type:'error'})"></script>
<script>
if(typeof L!=='undefined'){
 var map=L.map('map',{maxBounds:[[-85,-180],[85,180]],maxBoundsViscosity:1}).setView([${center.latitude},${center.longitude}],${point ? 17 : 5});
 var tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
  minZoom:3,maxZoom:19,noWrap:true,keepBuffer:0,
  attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
 });
 tiles.on('tileload',function(){clearTimeout(timeout);send({type:'ready'});});
 tiles.on('tileerror',function(){send({type:'error'});});
 tiles.addTo(map);
 function point(){var c=map.getCenter();send({type:'point',latitude:c.lat,longitude:c.lng});}
 map.on('movestart zoomstart',function(){send({type:'moving'});});
 map.on('moveend',point);
 map.on('click',function(e){map.setView(e.latlng,map.getZoom(),{animate:false});point();});
}
</script></body></html>`;
}
