// Rendering data
function clearLayerManager() {
  // First check if this layer is already on the map
  var keys = Object.keys(layerManager);
  keys.forEach(function(key) {
    if (key != 'choropleth') {
      $('#'+key.slice(0, key.length-4)).removeClass('selected')
      layerManager[key].forEach(function (ea) {
      // Remove each addition to the map
      mainMap.removeLayer(ea);
      });

      // Remove the layer entirely from the reference JSON
      delete layerManager[key]
    }


    //Remove the GeoJson Layer Too
    var geoJsonLayer = layerManager['choropleth'];
    if (geoJsonLayer) {
      $('#' + geoJsonLayer.targetCol).removeClass('selected')
      mainMap.removeLayer(geoJsonLayer);
      mainMap.removeControl(legend)
      layerManager['choropleth'] = null;
    }
  });
}

function processCSV(data) {
  var allTextLines = data.split(/\r\n|\n/);
  var headers = allTextLines[0].split(',');
  var lines = [];

  for (var i=1; i < allTextLines.length; i++) {
    var data = allTextLines[i].split(',');
    if (data.length == headers.length) {

      // Create an object for each row
      var tarr = {};
      for (var j = 0; j < headers.length; j++) {
        var h = headers[j].replace(/"/g, '');
        var v = data[j].replace(/"/g, '');
        tarr[h] = v;
      }

      // Push each JSON to a list
      lines.push(tarr);
    }
  }
  return lines;
}

function styleCircle(fileName, line){
  var circleStyleLookup = {
    'all_test_points.csv': {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.25,
        radius: 800        
    },
    'three_d_centers.csv': {
        color: 'blue',
        fillColor: 'blue',
        fillOpacity: 0.25,
        radius: 800  
    },
    'ten_d_centers.csv': {
        color: 'orange',
        fillColor: 'orange',
        fillOpacity: 0.25,
        radius: 800  
    },
    'dropoff_d_centers.csv': {
        color: 'green',
        fillColor: 'green',
        fillOpacity: 0.25,
        radius: 800  
    }

}
  // At some point we may have a crosswalk that lies outside
  // this function
  return circleStyleLookup[fileName]
};

function populateMapWithPoints(fileName) {
  //Indicate the Layer is Selected
  $('#'+fileName.slice(0, fileName.length-4)).toggleClass('selected')
  $.ajax({
    type: 'GET',
    url: `data/${fileName}`,
    dataType: 'text',
    success: function(data) {
      // First check if this layer is already on the map
      var keys = Object.keys(layerManager);
      var pos = keys.indexOf(fileName);

      // If it is, then go ahead and iterate through
      // each item and remove it
      if (pos > -1) {
        layerManager[fileName].forEach(function (ea) {
          // Remove each addition to the map
          mainMap.removeLayer(ea);
        });

        // Then remove that key
        delete layerManager[fileName]
      }

      if (pos === -1 ) {
        // Now override all the old items in the list (or create a 
        // fresh list entirely)
        layerManager[fileName] = [];
        
        processCSV(data).forEach(function(line) {
          // Add a new circle shape to the map
          var loc = [line.lat, line.lon]
          var style = styleCircle(fileName, line);
          var circle = L.circle(loc, style).addTo(mainMap);

          // As well as to our layer management object
          layerManager[fileName].push(circle);
        });

    }
    }
  });
}

// TODO: This code is totally not legible and needs to be refactored
//       asap - can't a simple lookup dictionary work here?
function getColor(d , classify) {
  // Function takes in d - a specific value and classify - a list of break points
  // We then pick the appropriate color relating the break points
  // var colorObject = {
  //   8 : 'rgb(222,235,247)',
  //   7 : 'rgb(198,219,239)',
  //   6 : 'rgb(158,202,225)',
  //   5 : 'rgb(107,174,214)',
  //   4 : 'rgb(66,146,198)',
  //   3 : 'rgb(33,113,181)',
  //   2 : 'rgb(8,81,156)',
  //   1 : 'rgb(8,48,107)',
  //   0 : 'white'};

  var colorObject = {
          0: '#ffffcc',
          1: '#a1dab4',
          2: '#41b6c4',
          3: '#2c7fb8',
          4: '#253494'
  }

  var result =  d >= classify[4]  ? colorObject[4] :
                d >= classify[3]  ? colorObject[3] :
                d >= classify[2]  ? colorObject[2] :
                d >= classify[1]  ? colorObject[1] :
             colorObject[0] 

  return result;
}

// Helps in getting colors for the maps
function chloroQuantile(data, breaks, useJenks=false){
  var sorted = data.sort(function(a, b) {
    return (a - b);
  });

  var quants = [];
  if (useJenks) {
    quants = ss.jenks(sorted, breaks);
    var lastindex = (quants.length - 1);
    // TODO: @mdgis this seems hacky let's see if we 
    // can revisit this and improve it
    quants[lastindex] += .00000001;
    return quants
  } else {
    // Doing Quantile Instead
    // TODO: @mdgis it would help to add more comments
    var p = .99999999/k;
  
    for (var i=1; i < (breaks + 1); i++) {
      var qVal = ss.quantile(sorted, p*i);
  
      // TODO: @mdgis it would help to add more comments, it seems like there's
      //       a lot of adjusting going on that is circumventing the underlying
      //       problem
      if (i === breaks) {
        var adjustment = .0000001;
        qVal = qVal + adjustment;
      }
      quants.push(qVal);
    }
  
    return quants;
  }
}

function populateMapWithChoropleth(fieldName) {
  // Controls for Adding Selection Indicator to the Button
  if (layerManager['choropleth'] != null ) {
    if (layerManager['choropleth']['targetCol'] != fieldName) {
        $('#'+layerManager['choropleth']['targetCol']).toggleClass('selected')
  }
}
  $('#'+fieldName).toggleClass('selected')

  var loc = 'data/indicator_files/' + fieldName + '.csv';
  // We need to create a local variable of fieldName to keep and
  // be able to access in the success callback function
  var targetCol = fieldName;

  $.ajax({
    type: 'GET',
    url: loc,
    dataType: 'text',
    success: function(data) {
      var geoJsonLayer = layerManager['choropleth'];

      // If there is a chloropleth present, make sure to remove the
      // one that is currently on the map
      if (geoJsonLayer) {
        mainMap.removeLayer(geoJsonLayer);
        mainMap.removeControl(legend)
        layerManager['choropleth'] = null

        // Exit out early if we are clicking on the same
        // item twice in a row
        if (geoJsonLayer.targetCol == targetCol) {
          return null;
        }
      }

      // Generate all the variables that will be used
      // in the following functions that are bound to the
      // chloropleth layer
      var allVals = []
      var geoIdLookup = {}
      processCSV(data).forEach(function(line) {
        var targetField = Number(line[targetCol]);
        var geoId = Number(line['GEOID']);

        allVals.push(targetField);
        geoIdLookup[geoId] = targetField;
      });

      // Get the Jenks breaks
      var dataQuants = chloroQuantile(allVals, 4, useJenks=true);
      console.log(dataQuants)
      // Leaflet Styling and Things
      function generateLeafletStyle(feature) {
        var geoId = Number(feature.properties['GEOID']);
        var val = Number(geoIdLookup[geoId]);
        var qColor = getColor(val, dataQuants);
        return {
          fillColor: qColor,
          weight: 1,
          opacity: .25,
          color: 'black',
          fillOpacity: .75

        }
      }

      function highlightFeature(e) {
        var layer = e.target;

        layer.setStyle({
          weight: 2,
          color: 'yellow',
          dashArray: '',
          fillOpacity: 0.75
        });

        var browserOk = (!L.Browser.ie &&
                         !L.Browser.opera &&
                         !L.Browser.edge)
        if (browserOk) {
          layer.bringToFront();
        }
      }

      function resetHighlight(e) {
        var layer = e.target;

        layer.setStyle({
            weight: 1,
            color: 'black',
            dashArray: '',
            fillOpacity: 0.75
        });
      }

      function whenClicked(e) {
        // TODO Create a Popup
        console.log(e.target)
      }


      legend.onAdd = function (map) {
        console.log('in on add legend')
        var div = L.DomUtil.create('div', 'info legend'),
           labels = [];
        var limits = dataQuants;
        console.log(limits)

        if (limits[0] == limits[1]) { 
          console.log('is less')
          limits[0] = 0.0
        }
        console.log(limits)
        limits = limits.map(function(l) {return l==null ? 0: l});

        // // loop through our density intervals and generate a label with a colored square for each interval
        for (var i = 0; i < limits.length; i++) {
            div.innerHTML +=  '<i style="background:' + getColor(limits[i],limits) + '"></i> '
            if (i == limits.length -1) {
                div.innerHTML += limits[i].toFixed(3) +'+'
            } else {
                div.innerHTML += limits[i].toFixed(3)+' &ndash; '+limits[i+1].toFixed(3)

            }
            div.innerHTML+= '<br>';
        }

        return div;
    };


      function onEachFeature (feature, layer) {
        layer.on({
          mouseover: highlightFeature,
          mouseout: resetHighlight,
          click: whenClicked
        });
      }

      // Add the polygon layers
      var options = {
        style: generateLeafletStyle,
        onEachFeature: onEachFeature
      };

      geoJsonLayer = L.geoJson(tracts, options);
      geoJsonLayer.addTo(mainMap);

      geoJsonLayer.targetCol = targetCol;
      layerManager['choropleth'] = geoJsonLayer;
      legend.addTo(mainMap);

      //Bring Circles to Front if They Are Present
      Object.keys(layerManager).forEach(function(layer) {
        if (layer != 'choropleth') {
          layerManager[layer].forEach(function(d) {d.bringToFront()})
        }
      })
      

    }
  });
}
