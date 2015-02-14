
$(document).ready(function(){

    var categories = {  1:'ASSAULT', 2:'SEX OFFENSES, FORCIBLE', 3:'ROBBERY',
                        4:'DRUG/NARCOTIC', 5:'DRUNKENNESS', 6:'LIQUOR LAWS', 7:'DISORDERLY CONDUCT',
                        8:'LARCENY/THEFT', 9:'BURGLARY', 10:'STOLEN PROPERTY', 11:'VEHICLE THEFT',
                        12:'PROSTITUTION', 13:'VANDALISM', 14:'ARSON', 15:'WEAPON LAWS'
    };

    var images = {
        'ASSAULT':'http://maps.google.com/mapfiles/kml/paddle/red-square-lv.png',
        'SEX OFFENSES, FORCIBLE':'http://maps.google.com/mapfiles/kml/paddle/red-stars-lv.png',
        'ROBBERY':'http://maps.google.com/mapfiles/kml/paddle/red-circle-lv.png',
        'DRUG/NARCOTIC':'http://maps.google.com/mapfiles/kml/paddle/ylw-blank-lv.png',
        'DRUNKENNESS':'http://maps.google.com/mapfiles/kml/paddle/ylw-square-lv.png',
        'LIQUOR LAWS':'http://maps.google.com/mapfiles/kml/paddle/pause-lv.png',
        'DISORDERLY CONDUCT':'http://maps.google.com/mapfiles/kml/paddle/ylw-square-lv.png',
        'LARCENY/THEFT':'http://maps.google.com/mapfiles/kml/paddle/blu-blank-lv.png',
        'BURGLARY':'http://maps.google.com/mapfiles/kml/paddle/blu-circle-lv.png',
        'STOLEN PROPERTY':'http://maps.google.com/mapfiles/kml/paddle/blu-stars-lv.png',
        'VEHICLE THEFT':'http://maps.google.com/mapfiles/kml/paddle/blu-square-lv.png',
        'PROSTITUTION':'http://maps.google.com/mapfiles/kml/paddle/wht-blank-lv.png',
        'VANDALISM':'http://maps.google.com/mapfiles/kml/paddle/wht-diamond-lv.png',
        'ARSON':'http://maps.google.com/mapfiles/kml/paddle/wht-stars-lv.png',
        'WEAPON LAWS':'http://maps.google.com/mapfiles/kml/paddle/wht-stars-lv.png'
    }

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

    var gradient = [
                'rgba(0, 255, 255, 0)',
                'rgba(0, 255, 255, 1)',
                'rgba(0, 191, 255, 1)',
                'rgba(0, 127, 255, 1)',
                'rgba(0, 63, 255, 1)',
                'rgba(0, 0, 255, 1)',
                'rgba(0, 0, 223, 1)',
                'rgba(0, 0, 191, 1)',
                'rgba(0, 0, 159, 1)',
                'rgba(0, 0, 127, 1)',
                'rgba(63, 0, 91, 1)',
                'rgba(127, 0, 63, 1)',
                'rgba(191, 0, 31, 1)',
                'rgba(255, 0, 0, 1)'
    ];


    // enter your api token here, which can be obtained from https://opendata.socrata.com/login
    //var APP_TOKEN = yourToken;

    //var baseUrl = "https://data.sfgov.org/resource/tmnf-yvry.json?$$app_token=" + APP_TOKEN + "&$limit=50000";

    // for the use of a public api if no app_token is present
    var baseUrl = "https://data.sfgov.org/resource/tmnf-yvry.json?$limit=50000";

    var center = new google.maps.LatLng(37.760947, -122.475288);
    var directionsService = new google.maps.DirectionsService();
    var directionsDisplay;
    var map, heatmap;
    var from, to;
    var pointArray;
    var markers = [];
    var dateFromSlider = '';
    var crimeTypeFromCheckbox = '';

    // create the crime table and populate checkboxes on load
    window.onload = createCategoriesOnLoad();
    window.onload = populateCheckboxesOnLoad();

    // get updated data from api call on refresh click
    $('#refresh').click(function(){
        getApiData();
    });

    /* update checkboxes and parts of query on hide and show events
        and on checkbox change event
    */
    $('#hideall').click(function(){
        $('input[type=checkbox]').each(function(){
            this.checked = false;
        });
        constructCrimeQuery();
    });

    $('#showall').click(function(){
        $('input[type=checkbox]').each(function(){
            this.checked = true;
        });
        constructCrimeQuery();
    });

    $('input[type=checkbox]').change(
        function(){
            constructCrimeQuery();
    });

    $('#about').click(function(){
        $( "#aboutdialog" ).dialog({
            show: {
                effect: "blind",
                duration: 500
            },
            hide: {
                effect: "blind",
                duration: 500
              }
            });
    });

    $('#whyslow').click(function(){
        $( "#whyslowdialog" ).dialog({
            show: {
                effect: "blind",
                duration: 500
            },
            hide: {
                effect: "blind",
                duration: 500
              }
            });
    });

    $('#togglemap').click(function(){
        if (heatmap.getMap()){
            heatmap.setMap(null);
            setAllMap(map);
        }else{
            heatmap.setMap(map);
            setAllMap(null);
        }
        if ($(this).text() === 'Show density map'){
            $(this).text('Show marker map');
        }else{
            $(this).text('Show density map');
        }
    });

    // get information from date slider and update the query to be placed into
    // the api call
    $("#slider").dateRangeSlider({
        bounds: {
            min: new Date(2014, 0, 1),
            max: new Date(2015, 0, 1)
        },
        defaultValues: {min: new Date(2014, 11, 1), max: moment().subtract(15, 'days')},
        scales: [{
            first: function(value){ return value; },
            end: function(value) {return value; },
            next: function(value){
                var next = new Date(value);
                return new Date(next.setMonth(value.getMonth() + 1));
            },
            label: function(value){
                return months[value.getMonth()];
            },
            format: function(tickContainer, tickStart, tickEnd){
                tickContainer.addClass("myCustomClass");
            }
        }]
    });

    $('#slider').on("userValuesChanged",function (e, data) {
        var inputMax = $("#slider").dateRangeSlider("max");
        var inputMin = $("#slider").dateRangeSlider("min");

        inputMax = moment(inputMax).add(1, 'days').format("YYYY-MM-DD");
        inputMin = moment(inputMin).subtract(1, 'days').format("YYYY-MM-DD");
        constructDateQuery(inputMin, inputMax);
    });

    // initialize the map
    function initialize() {
        directionsDisplay = new google.maps.DirectionsRenderer();

        var mapOptions = {
            zoom: 11,
            center: center,
            mapTypeControl: false
        }

        map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

        // Create the search box and link it to the UI element.
        var inputFrom = document.getElementById('pac-input');
        var inputTo = document.getElementById('pac-input2');

        var searchBoxFrom = new google.maps.places.SearchBox(inputFrom);
        var searchBoxTo = new google.maps.places.SearchBox(inputTo);

        /*
            set variables 'to' and 'from' from the input boxes
            and call api data function once the 'to' input box is complete
        */
        google.maps.event.addListener(searchBoxFrom, 'places_changed', function() {
            var places = searchBoxFrom.getPlaces();
            if (places.length == 0) return;
            from = places[0].geometry.location;
        });

        google.maps.event.addListener(searchBoxTo, 'places_changed', function() {
            var places = searchBoxTo.getPlaces();
            if (places.length == 0) return;
            to = places[0].geometry.location;
            getApiData();
        });

        directionsDisplay.setMap(map);
    }

    /*
        Makes a call to the Api at datasf.gov and constructs markers for crime points
        and the heatmap
    */
    function getApiData(){

        if (heatmap) heatmap.setMap(null);
        deleteMarkers();
        var mapData = [];

        calcRoute(function(result){
            var apiQuery = result[0];
            var buffer = result[1];

            if (result[0] != ''){
                $.getJSON(apiQuery, function(rawData){
                    var turf_data = [];
                    // iterate over the json results and push them into a special array to be passed
                    // to the turf library
                    for(var i=0;i<rawData.length;i++){
                        var attributes = { 'a': rawData[i] };
                        var point = turf.point(rawData[i].location.longitude, rawData[i].location.latitude, attributes);
                        turf_data.push(point);
                    };

                    // use turf library to construct a feature collection
                    // and clip the feature collection to the buffer
                    var points_fc = turf.featurecollection(turf_data);
                    var within = turf.within(points_fc, buffer);

                    // iterate over the clipped features and use their data to create map markers
                    for (var i = 0; i < within.features.length; i++)
                    {
                        var object = within.features[i].properties.a;
                        var a = within.features[i].geometry.coordinates;
                        var p = new google.maps.LatLng(a[1], a[0]);
                        var marker = new google.maps.Marker({
                            position: p,
                            map: map,
                            clickable: true,
                            icon: getValueFromChecks(object.category, images),
                            info: object
                        });

                        var infowindow = new InfoBox({
                            disableAutoPan: false,
                            pixelOffset: new google.maps.Size(-116, -130),
                            zIndex: null,
                            boxStyle: { width: "230px" },
                            closeBoxMargin: "8px 2px 1px 1px",
                            closeBoxURL: "http://www.google.com/intl/en_us/mapfiles/close.gif",
                            infoBoxClearance: new google.maps.Size(1, 1)
                        });

                        markers.push(marker);
                        mapData.push(p);

                        // bind infowindows to each marker and open/close them on click
                        google.maps.event.addListener(marker, 'click', function() {
                            infowindow.setContent(htmlElement(this.info));
                            infowindow.open(map, this);
                        });
                    }

                    // set the heatmap
                    pointArray = new google.maps.MVCArray(mapData);
                    heatmap = new google.maps.visualization.HeatmapLayer({
                        data: pointArray,
                        gradient: gradient,
                        radius: 20
                    });
                    // heatmap.setMap(map);
                });
            }
        });
    }

    /* Calculates a route between two points
        and uses coordinates along the route to create a bounding box and a buffer
        around the route. Constructs a callback function into which the coordinates,
        crime types, and dates are passed.
    */
    function calcRoute(callback) {

        var request = {
            origin: from,
            destination: to,
            travelMode: google.maps.TravelMode.WALKING
        };

        directionsService.route(request, function(response, status)
        {
            if (status == google.maps.DirectionsStatus.OK) {

                var routes = response.routes[0];
                var google_coords = [];

                for (var i = 0; i < routes.overview_path.length; i++){
                    var coordinates = routes.overview_path[i];
                    /*
                        A reminder to myself what longitude and latitude is.
                        coordinates.D;  // x, longitude
                        coordinates.k;  // y, latitude
                    */
                    google_coords.push([coordinates.D, coordinates.k]);
                }

                // create a feature collection of line strings for turf library
                var feature_collection = turf.linestring(google_coords);

                // create a buffer using turf library
                var buffer = turf.buffer(feature_collection, 0.25, 'kilometers');

                // create a bounding envelope of the buffer using turf library
                var envelope = turf.envelope(buffer);

                /* get upper left and lower right corners of the bounding box and
                    concatenete them together to be in the following form:
                    maxLat, minLong, minLat, maxLong; e.g., 41.885001, -87.645939, 41.867011, -87.618516
                */
                var first_corner = envelope.geometry.coordinates[0][3].sort(function(a,b){
                    return b - a;
                });

                var second_corner = envelope.geometry.coordinates[0][1].sort(function(a,b){
                    return b - a;
                });

                var flattened = [first_corner, second_corner].reduce(function(a,b){
                    return a.concat(b);
                });

                /*
                    use coordinates of the bounding box to costruct query along with data on
                    crime types from checkboxes and dates from slider to be passed into
                    the callback function
                */
                var query = "within_box(location, " + flattened[0] + ", " +
                    flattened[1] + ", " + flattened[2] + ", " + flattened[3] + ")";

                if (crimeTypeFromCheckbox  != ''){
                    var apiCall = baseUrl + "&$where=" + query + " AND" + crimeTypeFromCheckbox  + dateFromSlider;
                }else{
                    var apiCall = '';
                }

                var arr = [];
                arr.push(apiCall);
                arr.push(buffer);
                callback(arr);
                directionsDisplay.setDirections(response);
            }else{
                alert('Sorry, no walking directions here!');
            }
        });
    }

    /*
        Constructs a popup window for each point with information about the crime type
    */
    function htmlElement(obj){
        return "<div class='tooltips'><span><p>" + obj.category + "</p>" +
            "<table class='tiptable'>" + "<tbody" +
            "<tr>" + "<td>" + "Time:" + "</td>" + "<td>" + obj.time + "</td>" + "</tr>" +
            "<tr>" + "<td>" + "Date: " + "</td>" + "<td>" + moment(obj.date).format("YYYY-MM-DD") + "</td>" + "</tr>" +
            "<tr>" + "<td>" + "Day: " + "</td>" + "<td>" + obj.dayofweek  + "</td>" + "</tr>" +
            "<tr>" + "<td>" + "Incident: " + "</td>" + "<td>" + obj.incidntnum  + "</td>" + "</tr>" +
            "</tbody" + "</table></span></div>"
    }

    // Creates categories of crime to displayed in a table
    function createCategoriesOnLoad(){
        var str = "<tbody>";
        var i = 0;
        for (name in images){
            i += 1;
            var img = images[name];
            str += "<tr><td>" + "<img src='" + img + "'/>";
            str += name + "<label class='checkbox-inline'>" +
                    "<input type='checkbox' id='" + "inlineCheckbox" + i + "' value=" + i +
                    "></label></td></tr>";
        }
        str += "</tbody";
        $('.fixed').append(str);
    };

    // Sets the map on all markers in the array.
    function setAllMap(map) {
        for (var i = 0; i < markers.length; i++) {
            markers[i].setMap(map);
        }
    }

    // Removes the markers from the map, but keeps them in the array.
    function clearMarkers() {
        setAllMap(null);
    }

    // Deletes all markers in the array by removing references to them.
    function deleteMarkers() {
        clearMarkers();
        markers = [];
    }

    // helper: populates checkboxes on load
    function populateCheckboxesOnLoad(){
        $('input[type=checkbox]').each(function(){
            this.checked = true;
        });
        constructCrimeQuery();
    }

    // helper: returns a value from the checkbox matched to the key-value pair
    function getValueFromChecks(k, arr){
        for (key in arr){
            if (k === key) return arr[key];
        }
    }

    // helper: updates string for the query containing crime typess
    function constructCrimeQuery(){
        crimeTypeFromCheckbox = '';
        $('input[type=checkbox]').each(function(){
            if ($(this).is(':checked')) {
                crimeTypeFromCheckbox += " category="+ "'" + getValueFromChecks($(this).val(), categories) + "'" + " OR";
            }
        });
        crimeTypeFromCheckbox = crimeTypeFromCheckbox.substring(0, crimeTypeFromCheckbox.lastIndexOf(" "));
    }

    // helper: updates string for the query containing dates
    function constructDateQuery(inputMin, inputMax){
        dateFromSlider = '';
        dateFromSlider = ' AND date>\'' + inputMin + '\' AND date<\'' + inputMax + '\'';
    }

    google.maps.event.addDomListener(window, 'load', initialize);

});
