//Scriptsheet by Shujin Wang, 2020
//declare vars globally so all functions have access
var map;
var dataStats = {};

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

function calcStats(data){
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

    //get min, max, mean stats for our array
    dataStats.min = Math.min(...allValues);
    dataStats.max = Math.max(...allValues);

    //calculate mean
    var sum = allValues.reduce(function(a, b){
        return a+b;
    });
    dataStats.mean = sum/allValues.length;
};

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //constant factor adjusts symbol sizes evenly
    var minRadius = 5;

    //Flannery Appearance Compensation formula
    var radius = 1.0083 * Math.pow(attValue/dataStats.min,0.5715) * minRadius

    return radius;
};

//PopupContent constructor function
function PopupContent(properties, attribute){
    this.properties = properties;
    this.attribute = attribute;
    this.passenger = this.properties[attribute];

    //add airport and formatted attribute to popup content string
    this.formatted = "<p><b>Airport:</b> " + this.properties.Airport + "</p><p><b>Passenger Traffic in " + this.attribute + ":</b> " + this.passenger + "</p>";
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

    //create new popup content
    var popupContent = new PopupContent(feature.properties, attribute)

    //bind the popup to the circle marker
    layer.bindPopup(popupContent.formatted, {
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
    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function(){
            //create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');

            ///create range input element (slider)
            $(container).append('<input class="range-slider" type="range">');

            //STEP 2: create step buttons
            $(container).append('<button class="step" id="reverse">Reverse</button>');
            $(container).append('<button class="step" id="forward">Forward</button>');

            //disable any mouse event listeners for the container
            L.DomEvent.disableClickPropagation(container);

            return container;
        }
    });

    map.addControl(new SequenceControl());

    //set slider attributes
    $('.range-slider').attr({
        max: 6,
        min: 0,
        value: 0,
        step: 1
    });

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

//function to create the legend
function createLegend(attributes){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function () {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

            //add temporal legend div to container
            $(container).append('<div id="temporal-legend">')

            //step 1: start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="160px" height="60px">';

            //array of circle names to base loop on
            var circles = ["max", "mean", "min"];

            //step 2: loop to add each circle and text to svg string
            for (var i=0; i<circles.length; i++){
                //step 3: assign the r and cy attributes
                var radius = calcPropRadius(dataStats[circles[i]]);
                var cy = 59 - radius;

                //circle string
                svg += '<circle class="legend-circle" id="' + circles[i] + '" r="' + radius + '"cy="' + cy + '" fill="#F47821" fill-opacity="0.8" stroke="#000000" cx="30"/>';

                //evenly space out labels
                var textY = i * 20 + 20;

                //text string
                svg += '<text id="' + circles[i] + '-text" x="65" y="' + textY + '">' + Math.round(dataStats[circles[i]]*100)/100 + '</text>';
            };

            //close svg string
            svg += "</svg>";

            //add attribute legend svg to container
            $(container).append(svg);

            return container;
        }
    });

    map.addControl(new LegendControl());
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

            var popupContent = new PopupContent(props, attribute);

            //update popup content
            popup = layer.getPopup();
            popup.setContent(popupContent.formatted).update();
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

        //calling our renames function
        calcStats(response);
        //add proportional symbols and UI elements
        createPropSymbols(response, attributes);
        createSequenceControls(attributes);
        createLegend(attributes);
    });
};

$(document).ready(createMap);
