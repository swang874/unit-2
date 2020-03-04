// Scriptsheet by Shujin Wang, 2020
//declare vars globally so all functions have access
var map;
var minValue;

//Step 1: Create map
function createMap(){
    //create the map
    map = L.map('mapid', {
        center: [0, 0],
        zoom: 2
    });

    //add OSM base tilelayer
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);

    //call getData function
    getData();
};

function calcMinValue(data){
    //create empty array to store all data values
    var allValues = [];

    //loop through each airport
    for(var airport of data.features){
        //loop through each year
        for(var year = 2006; year <= 2018; year+=2){
            //get passenger traffic for current year
            var value = airport.properties[String(year)];
            //add value to array
            allValues.push(value);
        }
    }

    //get minimum value of our array
    var minValue = Math.min(...allValues)

    return minValue;
}

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //constant factor adjusts symbol sizes evenly
    var minRadius = 5;

    //Flannery Appearance Compensation formula
    var radius = 1.0083 * Math.pow(attValue/minValue,0.5715) * minRadius

    return radius;
};

//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes){
    //Step 4: Determine which attribute to visualize with proportional symbols
    //STEP 4: assign the current attribute based on the first index of the attributes array
    var attribute = attributes[0];
    //check
    console.log(attribute);

    //create marker options
    var options = {
        fillColor: "#ff7800",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    //Step 5: For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Step 6: Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

    //build popup content string starting with airport
    var popupContent = "<p><b>Airport:</b> " + feature.properties.Airport + "</p>";
    //add formatted attribute to popup content string
    popupContent += "<p><b>Passenger Traffic in " + attribute + ":</b> " + feature.properties[attribute] + "</p>";

    //bind the popup to the circle marker
    layer.bindPopup(popupContent, {
        offset: new L.Point(0,-options.radius)
    });

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

//Step 3: Add circle markers for point features to the map
function createPropSymbols(data, attributes){
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
};

//STEP 1: create new sequence controls
function createSequenceControls(attributes){
    //create range input element (slider)
    $('#panel').append('<input class="range-slider" type="range">');
    //set slider attributes
    $('.range-slider').attr({
        max: 6,
        min: 0,
        value: 0,
        step: 1
    });

    //STEP 2: create step buttons
    $('#panel').append('<button class="step" id="reverse">Reverse</button>');
    $('#panel').append('<button class="step" id="forward">Forward</button>');
    //replace button content with images
    $('#reverse').html('<img src="img/reverse.png">');
    $('#forward').html('<img src="img/forward.png">');

    //STEP 5: click listener for buttons
    $('.step').click(function(){
        //get the old index value
        var index = $('.range-slider').val();

        //STEP 6: increment or decrement depending on button clicked
        if ($(this).attr('id') == 'forward'){
            index++;
            //STEP 7: if past the last attribute, wrap around to first attribute
            index = index > 6 ? 0 : index;
        } else if ($(this).attr('id') == 'reverse'){
            index--;
            //STEP 7: if past the first attribute, wrap around to last attribute
            index = index < 0 ? 6 : index;
        };

        //Step 8: update slider
        $('.range-slider').val(index);

        //STEP 9: pass new attribute to update symbols
        updatePropSymbols(attributes[index]);
    });

    //STEP 5: input listener for slider
    $('.range-slider').on('input', function(){
        //STEP 6: get the new index value
        var index = $(this).val();
        console.log(index);

        //STEP 9: pass new attribute to update symbols
        updatePropSymbols(attributes[index]);
    });
};

//STEP 10: resize proportional symbols according to new attribute values
function updatePropSymbols(attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            //update the layer style and popup
            //access feature properties
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            //add airport to popup content string
            var popupContent = "<p><b>Airport:</b> " + props.Airport + "</p>";

            //add formatted attribute to panel content string
            popupContent += "<p><b>Passenger Traffic in " + attribute + ":</b> " + props[attribute] + "</p>";

            //update popup content
            popup = layer.getPopup();
            popup.setContent(popupContent).update();
        };
    });
};

//STEP 3: build an attributes array from the data
function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with population values
        if (attribute != 'ID' && attribute != 'Airport'){
            attributes.push(attribute);
        };
    };

    //check result
    console.log(attributes);

    return attributes;
};

//Step 2: Import GeoJSON data
function getData(){
    //load the data
    $.getJSON("data/Airports.geojson", function(response){
        //create an attributes array
        var attributes = processData(response);

        //calculate minimum data value
        minValue = calcMinValue(response);
        //add proportional symbols and UI elements
        createPropSymbols(response, attributes);
        createSequenceControls(attributes);
    });
};

$(document).ready(createMap);
