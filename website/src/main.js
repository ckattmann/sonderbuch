import Dygraph from 'dygraphs';
import 'leaflet';
import 'moment';
//import 'daterangepicker';
//import Vue from 'vue';

import * as tools from './components/misc/tools.js';
import './components/misc/daterangepicker.js';

import './components/misc/daterangepicker.sass';
import 'leaflet/dist/leaflet.css';
import 'dygraphs/dist/dygraph.css';

import bsslogo from './assets/bss_small.png';

import indexhtml from './index.pug';
import './index.sass';

import spinnersass from './components/misc/spinner.sass';

import mapsass from './components/map/map.sass';
import tooltiphtml from './components/map/tooltip.pug';
import tooltipsass from './components/map/tooltip.sass';

import chartcardhtml from './components/chartcard/chartcard.pug';
import chartcardsass from './components/chartcard/chartcard.sass';
import selectLocation from './components/chartcard/selectLocation.pug' ;

import status_html from './components/status/status.pug';
import status_sass from './components/status/status.sass';

var map;
var startTimestamp;
var stopTimestamp;
var coordinates = {lat:48.7300084,lng:9.26214570000002};
var selectedLabel;

window.timers = [];
window.statusTimer = false;
window.mapTimer = false;
var timeout = 500;

$(document).ready(function() {
    $('#link-map').click(function() {
        $('.sidebar-link').removeClass('selected');
        $(this).addClass('selected');
        tools.clearTimers();
        $('#mainarea').empty();
        $('.daterangepicker').remove();
        window.statusTimer = false;
        window.mapTimer = true;
        // console.log(window.timers.length);        

        // Noch in pug umwandeln:
        $('#mainarea').append('<div id="mapdiv"></div>');

        map = new L.map('mapdiv', {center: coordinates, zoom: 20});
        var markers = {};

        // L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {attribution: ''}).addTo(map);
        L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
            maxZoom: 18, 
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attribution">CARTO</a>'
        }).addTo(map);

        function updateTooltip() {
            startTimestamp = Date.now()
            $.ajax({
                type: 'GET',
                cache: false,
                dataType: 'json',
                contentType: 'application/json; charset=UTF-8',
                url: '/api/status',
                success: function(res) {                  
                    let index = 0;
                    for (const markerkey in res.status.grids) {
                        if (res.status.grids.hasOwnProperty(markerkey)) {
                            const markerInfo = res.status.grids[markerkey];
                            if (markerInfo.coordinates.lat != null && markerInfo.coordinates.lat != null ) {
                                let tooltipsMarkerInfo = {};
                                tooltipsMarkerInfo.gridname = markerkey;
                                tooltipsMarkerInfo.measurements = markerInfo.measurements;
                                tooltipsMarkerInfo.coordinates = markerInfo.coordinates;
                                
                                for (const measurement_key in tooltipsMarkerInfo.measurements) {
                                    if (tooltipsMarkerInfo.measurements.hasOwnProperty(measurement_key)) {
                                        let measurement = tooltipsMarkerInfo.measurements[measurement_key];
                                        measurement.name = measurement_key;
                                        for (const key in measurement) {
                                            if (key[0] == 'P' | key[0] == 'U' | key[0] == 'I'){
                                                measurement[key] = tools.customValueFormatter(measurement[key],key,2)
                                            }
                                        }
                                        
                                        var now = Date.now();
                                        let secondsSinceLastStatus = (now - measurement.time) / 1000;
                                        measurement.timeSinceLastStatusText = tools.parseTimeDelta(secondsSinceLastStatus);
                                    }
                                }
                                
                                if (!markers.hasOwnProperty(markerkey)) {
                                    markers[markerkey] = L.circleMarker(L.latLng(tooltipsMarkerInfo.coordinates), {radius: 4, stroke: false, fillOpacity: 1, fillColor: "grey"}).addTo(map);         
                                    markers[markerkey].bindTooltip(tooltiphtml(tooltipsMarkerInfo), {direction: 'right', offset: L.point(10,0), opacity: 0.8, permanent: false, className: 'mapTooltip'});
                                } else {
                                    markers[markerkey].setTooltipContent(tooltiphtml(tooltipsMarkerInfo));
                                }
                            }
                        index ++;
                        }
                    }
                },
                complete: function () {
                    stopTimestamp = Date.now();
                    let currentTimeout = (stopTimestamp - startTimestamp - timeout);
                    if (currentTimeout < 0) {
                        currentTimeout = 0;
                    }
                    if (window.mapTimer == true) {
                        window.timers.push(window.setTimeout(updateTooltip, timeout));
                    }
                },
            });
        }
        updateTooltip();
    });

    $('#link-data').click(function() {
        $('.sidebar-link').removeClass('selected');
        $(this).addClass('selected');
        tools.clearTimers();
        $('#mainarea').empty();
        $('.daterangepicker').remove();
        window.statusTimer = false;
        window.mapTimer = false;
        // console.log(window.timers.length);

        var currentMinDate = 0;
        var currentMaxDate = 0;
        var currentMinY = 0;
        var currentMaxY = 300;

        let currentVisibleData;
    
        var data = {
            values: {
                'Voltage': {id: 'voltage', values: 'U1,U2,U3'},
                'THD': {id: 'thd', values: 'THDU1,THDU2,THDU3'},
                'Real Power': {id: 'P', values: 'P1,P2,P3'},
                'Current': {id: 'current', values: 'I1,I2,I3'},
                'Power Factor': {id: 'PF', values: 'PF1,PF2,PF3'},
                'Apparent Power': {id: 'S', values: 'S1,S2,S3'},
                'Frequency': {id: 'freq', values: 'f'}
            },
            timeIntervals: {
                'All Time': {id: 'alltime', values: 'alltime'},
                'Today': {id: 'today', values: 'today'},
                'This week': {id: 'thisweek', values: 'thisweek'},
                'Last 24h': {id: 'last24h', values: 'last24h'}
            }
        };
        $('#mainarea').append(chartcardhtml(data));
        
        $('#random-timeframe').daterangepicker({
            autoApply: true,
            timePicker: true,
            timePicker24Hour: true,
            timePickerSeconds: true,
            opens: 'left',
            startDate: moment().startOf('hour'),
            endDate: moment().startOf('hour').add(32, 'hour'),
            locale: {
              format: 'DD:MM:YYYY hh:mm:ss'
            },
            buttonClasses: 'button'
        });        

        $('#random-timeframe').on('apply.daterangepicker',function(event,obj) {
            //console.log(obj.endDate.valueOf());
            updateGraph({
                keepY: true,
                timeRange: [obj.startDate.valueOf(), obj.endDate.valueOf()]
            });
        });

        function download(filename, text) {
            var element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
            element.setAttribute('download', filename);
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        }

        $('#downloadButton').click(function (event) {
            download('data.json', JSON.stringify(currentVisibleData));
        })

        // Options for Data Graph
        // ======================

        var g;
        var errorflag = false;
        function updateGraph(updateProps) {
            // Possible keys for updateProps:

            // keepY: Keep Y-Axis Range from previous request: [true, false], default: false
            var keepY = updateProps && updateProps.keepY;
            
            // keepT: Keep X-Axis Range (time) from previous request: [true, false], default: false
            var keepT = updateProps && updateProps.keepT;

            // timeRange: External Start and Stop timestamps in the form [start,stop] (millisecond timestamps), default: get from buttons
            var timeRange = updateProps && updateProps.timeRange;

            $('#basicchart').fadeTo(0.5, 0.5);
            $('.spinner').css('display','block');
            $('.splashmessage').css('display','none');
            $('#downloadButton').prop('disabled', true)
            if (selectedLabel) {
                var selected = $('#select-location')
                selected.val(selectedLabel);
                selectedLabel = undefined;
            }
            var selected = $('#select-location :selected');
            var location_id = selected.val();
            var grid = selected.parent().attr('label');
            var ylabel = $('#values-options .chartoption.selected')[0].innerText;
            var values = $('#values-options .chartoption.selected').data('values');
            if (timeRange) {
                var timeInterval = timeRange;
                currentMinDate = timeRange[0];
                currentMaxDate = timeRange[1];
            }
            else {
                var timeInterval = keepT && !errorflag ? [currentMinDate, currentMaxDate] : $('#timeInterval-options .chartoption.selected').data('timeinterval');
            }
            var input_aggtime = $('#input-aggtime').val();
            if (!/^[0-9]\d*$/.test(input_aggtime)) {
                console.log('input-aggtime error');
            }
            var avrginterval = input_aggtime+$('#select-timeUnit').val();
            var requestDict = {grid: grid, location_id: location_id, values: values, avrgInterval: avrginterval, timeInterval: timeInterval};
            $.ajax({
                type: 'POST',
                dataType: 'json',
                cache: false,
                contentType: 'application/json; charset=UTF-8',
                url: '/api/query',
                data: JSON.stringify(requestDict),
                success: function(res) {
                    let data = res.data;
                    currentVisibleData = res;
                    if (data.length == 0) {
                        $('.spinner').css('display','none');
                        $('.splashmessage').css('display','flex');
                        $('#downloadButton').prop('disabled', true)
                        $('.splashmessage').text('No data to display');
                        g.updateOptions({'file': [], 'labels': res.labels});
                        errorflag = true;
                    }
                    else {  // Successful Request:
                        currentMinDate = data[0][0];
                        currentMaxDate = data[data.length-1][0];
                        for (var i=0;i<data.length;i++) {
                            data[i][0] = new Date(data[i][0]);
                        }
                        let valueRange = keepY && !errorflag ? [currentMinY, currentMaxY] : [null, null];
                        let dateWindow = keepT && !errorflag ? null : [currentMinDate, currentMaxDate];
                        // let csvData = res.labels.join() + '\n' + data.map(function(d){
                        //                                                     d[0] = d[0].getTime();
                        //                                                     return d.join();
                        //                                                 }).join('\n');            
                        if (g) {
                            g.updateOptions({'file': data, 'labels': res.labels, 'valueRange': valueRange, 'dateWindow': dateWindow, 'ylabel' : ylabel});
                        } else {
                            g = new Dygraph(
                                document.getElementById("basicchart"),
                                data,
                                {
                                    gridLinePattern: [4,4],
                                    labelsDiv: "chartlegend",
                                    //labelsSeparateLines: true,
                                    legend: 'always',
                                    labels: res.labels,
                                    valueRange : valueRange,
                                    dateWindow: dateWindow,
                                    colors: ['#F22613', '#26A65B', '#F7CA18'],
                                    strokeWidth: 2,
                                    xlabel : 'Time',
                                    ylabel : ylabel,
                                    animatedZooms: true,
                                    //digitsAfterDecimal : 2,
                                    // showRangeSelector: true,
                                    axes : {
                                        x : {
                                            valueFormatter: function (value) { return moment(value).format('ddd, D.MM.YYYY HH:mm:ss'); },  
                                            ticker: Dygraph.dateTicker,
                                            //axisLabelWidth : 50,
                                        },
                                        y : {
                                            //labelsKMB: true,
                                            valueFormatter: function(value, opts, seriesName, dygraph, row, col) {
                                                return tools.customValueFormatter(value,seriesName,3);
                                            },
                                            axisLabelWidth : 85,
                                            axisLabelFormatter: function (value) {
                                                let seriesName = this.getOption('ylabel');
                                                let dim;
                                                let advalue;
                                                let res;
                                                if (value > 1000 || value < -1000) {
                                                    advalue = value / 1000;
                                                    dim = 'K';
                                                } else if (value < 1 && value > -1) {
                                                    advalue = value * 1000;
                                                    dim = 'm';
                                                } else {
                                                    advalue = value; 
                                                    dim = ''; 
                                                }
                                                if (seriesName == 'Voltage') {
                                                    res = +advalue.toFixed(3)+ ' ' + dim +'V';
                                                }
                                                else if (seriesName == 'THD') {
                                                    res = +value.toFixed(2)+'%';
                                                }
                                                else if (seriesName == 'Current') {
                                                    res = +advalue.toFixed(3)+ ' ' + dim +'A';
                                                }
                                                else if (seriesName == 'Real Power') {
                                                    res = +advalue.toFixed(3)+ ' ' + dim +'W';
                                                }
                                                else if (seriesName == 'Apparent Power') {
                                                    res = +advalue.toFixed(3)+ ' ' + dim +'VA';
                                                }
                                                else if (seriesName == 'Power Factor') {
                                                    res = +value.toFixed(3);
                                                } 
                                                else if (seriesName == 'Frequency') {
                                                    res = +advalue.toFixed(3)+ ' ' + dim +'Hz';
                                                } else {
                                                    res = value.toFixed(2)
                                                }
                                                return res                           
                                            },
                                        },
                                    },
                                    legendFormatter: function (data) {
                                        let dygraph = data.dygraph;
                                        let series = data.series;
                                        let x = data.x;
                                        if (x == null) {
                                            // This happens when there's no selection and {legend: 'always'} is set.
                                            let html = dygraph.getOption('ylabel') + ':';
                                            series.forEach(serie => {
                                                html += '<span class="legendlabel" style="color: ' + serie.color + '">' + serie.dashHTML + serie.labelHTML + '</span>';
                                            });
                                            return html;
                                        } else {
                                            let html = data.xHTML + ':';
                                            series.forEach(serie => {
                                                if (serie.y){
                                                    html += '<span class="legendlabel" style="color: ' + serie.color + '">' + serie.labelHTML + '</span>:<span class="withdata">' + serie.yHTML + '</span>';
                                                } else {
                                                    html += '<span class="legendlabel" style="color: ' + serie.color + '">' + serie.labelHTML + '</span>:<span class="withdata">no data</span>';
                                                }
                                            });
                                            return html;
                                        }
                                    },
                                    yLabelWidth: 20,
                                    yLabelWidth: 20,
                                    // interactionModel: {
                                    //     mousedown: Dygraph.defaultInteractionModel.mousedown,
                                    //     mousemove: Dygraph.defaultInteractionModel.mousemove,
                                    //     mouseup: Dygraph.defaultInteractionModel.mouseup,
                                    //     mouseout: Dygraph.defaultInteractionModel.mouseout,
                                    //     dblclick: Dygraph.defaultInteractionModel.dblClickV3,
                                    //     mousewheel: function (data) {
                                    //         console.log(data)
                                    //     },
                                    // },
                                    zoomCallback: function(minDate, maxDate, yRanges) {
                                        if (minDate != currentMinDate || maxDate != currentMaxDate) {
                                            $('#timeselectbar .chartoption').removeClass('selected');
                                            currentMinDate = minDate;
                                            currentMaxDate = maxDate;
                                        }
                                        currentMinY = yRanges[0][0];
                                        currentMaxY = yRanges[0][1];
                                        // if ((currentMaxY - currentMinY) < 0.02) {
                                        //     let meanValue = (currentMaxY - currentMinY) / 2 + currentMinY;
                                        //     g.updateOptions({valueRange: [meanValue - 0.01, meanValue + 0.01]});
                                        //     currentMinY = meanValue - 0.01;
                                        //     currentMaxY = meanValue + 0.01;
                                        // }
                                    },
                                }
                            );
                        }
                        currentMinY = g.yAxisRange()[0];
                        currentMaxY = g.yAxisRange()[1];
                        // if ((currentMaxY - currentMinY) < 0.02) {
                        //     let meanValue = (currentMaxY - currentMinY) / 2 + currentMinY;
                        //     g.updateOptions({valueRange: [meanValue - 0.01, meanValue + 0.01]});
                        //     currentMinY = meanValue - 0.01;
                        //     currentMaxY = meanValue + 0.01;
                        // } else {
                        //     g.resize();
                        // }
                        g.resize()
                        $('.spinner').css('display','none');
                        $('.splashmessage').css('display','none');
                        $('#downloadButton').prop('disabled', false)
                        $('#basicchart').fadeTo(0.5, 1);
                        errorflag = false;
                    }
                },
                error: function(res) {
                    $('.spinner').css('display','none');
                    $('.splashmessage').css('display','flex');
                    $('#downloadButton').prop('disabled', true)
                    $('.splashmessage').text('No data to display');
                    errorflag = true;
                },
            });
        }

        // Setup the selection at the top
        $.ajax({
            type: 'GET',
            cache: false,
            dataType: 'json',
            contentType: 'application/json; charset=UTF-8',
            url: '/api/status',
            success: function(res) {
                var status = res.status;
                $('.select-location').append(selectLocation(status));
                //$('.select-location').select2();
                updateGraph(false,false);
            }
        });

        $('#timeInterval-options .chartoption').first().addClass('selected');
        $('#container-values .chartoption').first().addClass('selected');

        // Event Listeners
        $('#select-location').change(function() {
            updateGraph({
                keepT: true,
                keepY: true
            });
        });
        $('#timeselectbar .chartoption').click(function(el){
            $(el.currentTarget).siblings().removeClass('selected');
            $(el.currentTarget).addClass('selected');
            if (el.currentTarget.id != 'random-timeframe') {
                updateGraph({
                    keepY: true
                });
            }         
        });
        $('#container-values .chartoption').click(function(el){
            $(el.currentTarget).siblings().removeClass('selected');
            $(el.currentTarget).addClass('selected');
            updateGraph({
                keepT: true
            });
        });
        $('#input-aggtime').change(function() {updateGraph({
            keepY: true,
            keepT: true
        });});
        $('#select-timeUnit').change(function() {updateGraph({
            keepY: true,
            keepT: true
        });});

    });

    $('#link-status').click(function() {
        $('.sidebar-link').removeClass('selected');
        $(this).addClass('selected');
        tools.clearTimers();
        $('#mainarea').empty();
        $('.daterangepicker').remove();
        window.mapTimer = false;
        window.statusTimer = true;
        // console.log(window.timers.length);

        var now;
        // console.log('first ajax');
        $.ajax({
            type: 'GET',
            cache: false,
            dataType: 'json',
            contentType: 'application/json; charset=UTF-8',
            url: '/api/status',
            // data: req,
            success: function(res) {
                var status = res.status;
                now = Date.now();
                let index = 0
                for (var grid in status.grids) {
                    status.grids[grid].id = index;
                    let lat = status.grids[grid].coordinates.lat;
                    let lng = status.grids[grid].coordinates.lng;
                    if (lat && lng) {
                        status.grids[grid].buttonDisabled = false;
                    } else {                     
                        status.grids[grid].buttonDisabled = true;
                    }
                    for (let measurement_key in status.grids[grid].measurements) {
                        for (const key in status.grids[grid].measurements[measurement_key]) {
                            if (key[0] == 'U' | key[0] == 'I'){
                                status.grids[grid].measurements[measurement_key][key] = tools.customValueFormatter(status.grids[grid].measurements[measurement_key][key],key,3)
                            }
                        }
                        let secondsSinceLastStatus = (now - status.grids[grid].measurements[measurement_key].time) / 1000;
                        status.grids[grid].measurements[measurement_key].timeSinceLastStatus = secondsSinceLastStatus;
                        status.grids[grid].measurements[measurement_key].timeSinceLastStatusText = tools.parseTimeDelta(secondsSinceLastStatus);
                    }
                    index++;
                }
                      
                $('#mainarea').append(status_html(status));

                // verify correct input of coordinates and toggle buttons
                let cordsInputs = $('.cordsinput');
                for (let index = 0; index < cordsInputs.length; index++) {
                    const element = cordsInputs[index];
                    element.addEventListener('keyup', function (event) {
                        let partId = element.id.slice(3);
                        let isValidInput = $('#lat' + partId)[0].checkValidity() && $('#lng' + partId)[0].checkValidity(); 
                        if ( isValidInput ) {
                            $('#cordbutton' + partId).prop('disabled', false);
                        } else {                          
                            $('#cordbutton' + partId).prop('disabled', true);
                        }
                    });
                }

                // send GPS Coordinates to server
                $('.cordsbutton').click(function(event){
                    let requestDict = {};
                    let partID = event.target.id.slice('cordbutton'.length);

                    requestDict.db = $('#gridname'+partID)[0].innerText;
                    requestDict.lat = parseFloat($('#lat'+partID)[0].value);
                    requestDict.lng = parseFloat($('#lng'+partID)[0].value);
                    // console.log('POST cords');
                    $.ajax({
                        type: 'POST',
                        cache: false,
                        dataType: 'json',
                        contentType: 'application/json; charset=UTF-8',
                        url: '/api/update',
                        data: JSON.stringify(requestDict),
                        success: function(res) {
                            $('#gotocordsbutton' + partID).prop('disabled', false);
                        },
                    });
                });
            },
            complete: function (res) {
                // refresh data
                function refreshStatusInfo() {
                    // console.log('should be 0 after change page: ' + window.timers.length);
                    $.ajax({
                        type: 'GET',
                        cache: false,
                        dataType: 'json',
                        contentType: 'application/json; charset=UTF-8',
                        url: '/api/status',
                        success: function(res) {
                            // console.log(res);
                            
                            now = Date.now();
                            let grids = res.status.grids;
                            for (const gridname in grids) {
                                if (grids.hasOwnProperty(gridname)) {
                                    let measurements = grids[gridname].measurements;
                                    for (const location in measurements){
                                        if (measurements.hasOwnProperty(location)) {
                                            let location_id = location.replace(/\s/g, '')+'-'+gridname.replace(/\s/g, '');
                                            let loc_el = $('#'+location_id).children();                                          
                                            for (let index = 1; index < loc_el.length; index++) {
                                                const element = loc_el[index];
                                                if (element.classList[1].slice(0,-1) == 'U' | element.classList[1].slice(0,-1) == 'I') {
                                                    element.innerText = tools.customValueFormatter(measurements[location][element.classList[1]],element.classList[1],3);
                                                } else {
                                                    element.innerText = tools.parseTimeDelta((now - measurements[location].time) / 1000) + ' ago';
                                                } 
                                            }
                                        }
                                    }
                                    
                                }
                            }
                        },
                        complete: function (res) {                    
                            stopTimestamp = Date.now();
                            let currentTimeout = (stopTimestamp - startTimestamp - timeout);
                            if (currentTimeout < 0) {
                                currentTimeout = 0;
                            }
                            if (window.statusTimer == true) {
                                window.timers.push(window.setTimeout(refreshStatusInfo, timeout));
                            }                          
                        },
                    });
                }
                refreshStatusInfo();

                $('.gotocordsbutton').click(function(event){
                    let partID = event.target.id.slice('gotocordsbutton'.length);
                    coordinates.lat = parseFloat($('#lat'+partID)[0].value);
                    coordinates.lng = parseFloat($('#lng'+partID)[0].value);
                    $('#link-map').click()                    
                });

                $('.gridrow').click(function(event){
                    selectedLabel = event.currentTarget.childNodes[0].innerText;
                    $('#link-data').click()
                });

            },
        });
    });

    $('#link-data').click();

    $('#link-title').click(function () {
        $('#link-data').click();
    });

});
