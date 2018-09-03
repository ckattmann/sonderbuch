import Dygraph from 'dygraphs';
//import Dygraph.dateString_ from 'dygraphs';
import 'leaflet';
import 'moment';
import 'daterangepicker';
//import Vue from 'vue';

import daterangepickecss from '../node_modules/daterangepicker/daterangepicker.css'
import leafletcss from '../node_modules/leaflet/dist/leaflet.css'
import dygraphcss from '../node_modules/dygraphs/dist/dygraph.css'

import bsslogo from './assets/bss_small.png';

import icons from './assets/Icon-font-7-stroke-PIXEDEN-v-1.2.0/pe-icon-7-stroke/css/pe-icon-7-stroke.css';
import iconshelper from './assets/Icon-font-7-stroke-PIXEDEN-v-1.2.0/pe-icon-7-stroke/css/helper.css';

import indexhtml from './index.pug';
import indexsass from './index.sass';

import spinnersass from './components/misc/spinner.sass';

import mapsass from './components/map/map.sass';
import tooltiphtml from './components/map/tooltip.pug';
import tooltipsass from './components/map/tooltip.sass';

import chartcardhtml from './components/chartcard/chartcard.pug';
import chartcardsass from './components/chartcard/chartcard.sass';
import selectLocation from './components/chartcard/selectLocation.pug' ;

import firstviewhtml from './components/firstview/firstview.pug';
import firstviewsass from './components/firstview/firstview.sass';

import secondviewhtml from './components/secondview/secondview.pug';

import view_simple_html from './components/dataview-simple/dataview-simple.pug';
import view_simple_sass from './components/dataview-simple/dataview-simple.sass';

import status_html from './components/status/status.pug';
import status_sass from './components/status/status.sass';
import location_line_html from './components/status/location_line.pug';


function colormap(i) {
    var r, g;
    if (i <= 50) {
        // green to yellow
        r = Math.floor(255 * (i / 50));
        g = 255;
    } else {
        // yellow to red
        r = 255;
        g = Math.floor(155 * ((50 - (i-1) % 50) / 50));
    }
    return 'rgb(' + r + ',' + g + ',0)';
}

function parseTimeDelta(seconds) {
    var text = '- s';

    if (seconds <= 60) {
        text = seconds.toFixed(1) + ' s';
    }
    else if (seconds > 24 * 3600) {
        text = Math.round(seconds / (24*3600)) + ' d';
    }
    else if (seconds > 3600) {
        text = Math.round(seconds / 3600) + ' h';
    }
    else if (seconds > 60) {
        text = Math.round(seconds / 60) + ' min';
    }
    return text;
}

function barChartPlotter(e) {
    var ctx = e.drawingContext;
    var points = e.points;
    var y_bottom = e.dygraph.toDomYCoord(0);

    ctx.fillStyle = e.color;

    // Find the minimum separation between x-values.
    // This determines the bar width.
    var min_sep = Infinity;
    for (var i = 1; i < points.length; i++) {
      var sep = points[i].canvasx - points[i - 1].canvasx;
      if (sep < min_sep) min_sep = sep;
    }
    var bar_width = Math.floor(2.0 / 3 * min_sep);

    // Do the actual plotting.
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      var center_x = p.canvasx;

      ctx.fillRect(center_x - bar_width / 2, p.canvasy,
          bar_width, y_bottom - p.canvasy);

      ctx.strokeRect(center_x - bar_width / 2, p.canvasy,
          bar_width, y_bottom - p.canvasy);
    }
}

var map;
var startTimestamp;
var stopTimestamp;

var timers = [];
function clearTimers() {
    for (var i = timers.length-1; i>=0; i--) {
        clearTimeout(timers[i]);
    }
    timers = [];
}

$(document).ready(function() {
    $('#link-map').click(function() {
        $('.sidebar-link').removeClass('selected');
        $(this).addClass('selected');
        clearTimers();
        $('#mainarea').empty();

        // Noch in pug umwandeln:
        $('#mainarea').append('<div id="mapdiv"></div>');

        map = new L.map('mapdiv', {center: {lat:48.7300084,lng:9.26214570000002}, zoom: 20});
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
                dataType: 'json',
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
                                        
                                        var now = Date.now();
                                        measurement.timeSinceLastStatus = (now - measurement.time) / 1000;
                                        if (parseFloat(measurement.THDU1) > 99) {
                                            measurement.THDU1 = '0';
                                        }
                                        if (parseFloat(measurement.THDU2) > 99) {
                                            measurement.THDU2 = '0';
                                        }
                                        if (parseFloat(measurement.THDU3) > 99) {
                                            measurement.THDU3 = '0';
                                        }
                                        var secondsSinceLastStatus = (now - measurement.time) / 1000;
                                        measurement.timeSinceLastStatus = secondsSinceLastStatus;
                                        tooltipsMarkerInfo.timeSinceLastStatusText = parseTimeDelta(secondsSinceLastStatus);
    
                                        //$('.U1').css('color',colormap(Math.abs(parseFloat(measurement.U1) - 230) / 23 * 100));
                                        //$('.U2').css('color',colormap(Math.abs(parseFloat(measurement.U2) - 230) / 23 * 100));
                                        //$('.U3').css('color',colormap(Math.abs(parseFloat(measurement.U3) - 230) / 23 * 100));
                                        //$('.thd1').css('color',colormap(parseFloat(measurement.THDU1) / 8 * 100));
                                        //$('.thd2').css('color',colormap(parseFloat(measurement.THDU2) / 8 * 100));
                                        //$('.thd3').css('color',colormap(parseFloat(measurement.THDU3) / 8 * 100));
                                        //marker.setStyle({'fillColor': colormap(Math.abs(parseFloat(measurement.U3) - 230) / 23 * 100)});
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
                    // stopTimestamp = Date.now();
                    // let timedelta;
                    // if ((1000 - (stopTimestamp - startTimestamp)) < 0) {
                    //     timedelta = 0;
                    //     updateTooltip();
                    // } else {
                    //     timedelta = 1000 - (stopTimestamp - startTimestamp);
                    //     timers.push(setTimeout(updateTooltip, timedelta));
                    // }
                    // console.log(timers);
                },
            });
            timers.push(setTimeout(updateTooltip, 1000));
        }
        updateTooltip();
    });

    $('#link-first').click(function() {
        $('.sidebar-link').removeClass('selected');
        $(this).addClass('selected');
        clearTimers();
        $('#mainarea').empty();

        var currentMinDate = 0;
        var currentMaxDate = 0;
        var currentMinY = 0;
        var currentMaxY = 300;
    
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
            startDate: moment().startOf('hour'),
            endDate: moment().startOf('hour').add(32, 'hour'),
            locale: {
              format: 'M/DD hh:mm A'
            }
        });

        $('#random-timeframe').on('apply.daterangepicker',function(event,obj) {
            //console.log(obj.endDate.valueOf());
            updateGraph({
                keepY: true,
                timeRange: [obj.startDate.valueOf(), obj.endDate.valueOf()]
            });
        });

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
            var selected = $('#select-location :selected');
            var grid = selected.parent().attr('label');
            var location_id = selected.val();
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
            //console.log(requestDict);
            $.ajax({
                type: 'POST',
                dataType: 'json',
                contentType: 'application/json; charset=UTF-8',
                url: '/api/query',
                data: JSON.stringify(requestDict),
                success: function(res) {
                    let data = res.data;
                    if (data.length == 0) {
                        $('.spinner').css('display','none');
                        $('.splashmessage').css('display','flex');
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
                                            axisLabelWidth : 50,
                                        },
                                        y : {
                                            //labelsKMB: true,
                                            valueFormatter: function(value, opts, seriesName, dygraph, row, col) {
                                                let dim;
                                                let advalue;
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
                                                if (seriesName == 'U1' || seriesName == 'U2' || seriesName == 'U3') {
                                                    return advalue.toFixed(3)+ ' ' + dim +'V';
                                                }
                                                else if (seriesName == 'THDU1' || seriesName == 'THDU2' || seriesName == 'THDU3') {
                                                    return value.toFixed(2)+'%';
                                                }
                                                else if (seriesName == 'I1' || seriesName == 'I2' || seriesName == 'I3') {
                                                    return advalue.toFixed(3)+ ' ' + dim +'A';
                                                }
                                                else if (seriesName == 'P1' || seriesName == 'P2' || seriesName == 'P3') {
                                                    return advalue.toFixed(3)+ ' ' + dim +'W';
                                                }
                                                else if (seriesName == 'S1' || seriesName == 'S2' || seriesName == 'S3') {
                                                    return advalue.toFixed(3)+ ' ' + dim +'VA';
                                                }
                                                else if (seriesName == 'PF1' || seriesName == 'PF2' || seriesName == 'PF3') {
                                                    return value.toFixed(3);
                                                } 
                                                else if (seriesName == 'f') {
                                                    return advalue.toFixed(3)+ ' ' + dim +'Hz';
                                                }
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
                                    //legendFormatter: legendFormatter,
                                    yLabelWidth: 20,
                                    yLabelWidth: 20,
                                    zoomCallback: function(minDate, maxDate, yRanges) {
                                        if (minDate != currentMinDate || maxDate != currentMaxDate) {
                                            $('#timeselectbar .chartoption').removeClass('selected');
                                            currentMinDate = minDate;
                                            currentMaxDate = maxDate;
                                        }
                                        currentMinY = yRanges[0][0];
                                        currentMaxY = yRanges[0][1];
                                        if ((g.yAxisRange()[1] - g.yAxisRange()[0]) < 0.02) {
                                            g.updateOptions({valueRange: [-0.01,0.01]});
                                        }
                                    },
                                }
                            );
                        }
                        g.yAxisRange()
                        if ((g.yAxisRange()[1] - g.yAxisRange()[0]) < 0.02) {
                            g.updateOptions({valueRange: [-0.01,0.01]});
                        }
                        g.resize();
                        currentMinY = g.yAxisRange()[0];
                        currentMaxY = g.yAxisRange()[1];
                        $('.spinner').css('display','none');
                        $('.splashmessage').css('display','none');
                        $('#basicchart').fadeTo(0.5, 1);
                        errorflag = false;
                    }
                },
                error: function(res) {
                    $('.spinner').css('display','none');
                    $('.splashmessage').css('display','flex');
                    $('.splashmessage').text('No data to display');
                    errorflag = true;
                },
            });
        }

        // Setup the selection at the top
        $.ajax({
            type: 'GET',
            dataType: 'json',
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
        $('#select-location').change(function() {updateGraph({
            keepT: true,
            keepY: true
        });});
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
        clearTimers();
        $('#mainarea').empty();

        $.ajax({
            type: 'GET',
            dataType: 'json',
            url: '/api/status',
            // data: req,
            success: function(res) {
                var status = res.status;
                var now = Date.now();
                let index = 0
                for (var grid in status.grids) {
                    status.grids[grid].id = index;
                    for (var measurement in status.grids[grid].measurements) {
                        var secondsSinceLastStatus = (now - status.grids[grid].measurements[measurement].time) / 1000;
                        status.grids[grid].measurements[measurement].timeSinceLastStatus = secondsSinceLastStatus;
                        status.grids[grid].measurements[measurement].timeSinceLastStatusText = parseTimeDelta(secondsSinceLastStatus);
                    }
                    index++;
                }
                //console.log(status);
                             
                $('#mainarea').append(status_html(status));
                
                $('.cordsbutton').click(function(event){
                    let requestDict = {};
                    let partId = event.target.id.slice(7)
                    //console.log($('#gridname-'+partId));
                    
                    requestDict.db = $('#gridname-'+partId)[0].innerText;
                    requestDict.lat = parseFloat($('#lat-'+partId)[0].value);
                    requestDict.lng = parseFloat($('#lng-'+partId)[0].value);
                    $.ajax({
                        type: 'POST',
                        dataType: 'json',
                        contentType: 'application/json; charset=UTF-8',
                        url: '/api/update',
                        data: JSON.stringify(requestDict),
                        success: function(res) {
                        },
                    });
                });
            },
        });
    });

    $('#link-first').click();
});
