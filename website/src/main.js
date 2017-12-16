// import purecss from 'purecss';
import Dygraph from 'dygraphs/index.es5.js';

import 'leaflet';
import leafletcss from 'leaflet/dist/leaflet.css';

import 'select2';
import selectcss from 'select2/dist/css/select2.min.css';

import 'moment';
import jquery_date_range_picker from 'jquery-date-range-picker/dist/jquery.daterangepicker.min.js';
import jquery_date_range_picker_css from 'jquery-date-range-picker/dist/daterangepicker.min.css';

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
// import location_line_sass from './components/status/location_line.sass';


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

$(document).ready(function() {


    var timers = [];
    function clearTimers() {
        for (var i = 0; i<timers.length; i++) {
            clearTimeout(timers[i]);
        }

    }
    $('#link-map').click(function() {
        $('.sidebar-link').removeClass('selected');
        $(this).addClass('selected');
        clearTimers();
        $('#mainarea').empty();

        // Noch in pug umwandeln:
        $('#mainarea').append('<div id="mapdiv"></div>');

        var map = L.map('mapdiv').setView([48.80445, 9.18791], 17);
        // var map = L.map('mapdiv').setView([48.252877, 9.479706], 17);

        // L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {attribution: ''}).addTo(map);
        L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
            maxZoom: 18, attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OSM</a>, &copy; <a href="https://carto.com/attribution">CARTO</a>'
        }).addTo(map);

        var marker = L.circle([48.80448, 9.18795], {radius: 5, stroke: false, fillOpacity: 1, fillColor: "gray"}).addTo(map);         
        marker.bindTooltip(tooltiphtml(), {direction: 'right', offset: L.point(10,0), opacity: 0.8, permanent: false, className: 'mapTooltip'});
        function updateTooltip() {
            $.ajax({
                type: 'GET',
                dataType: 'json',
                url: '/api/status',
                success: function(res) {
                    var status = res.status.grids.Misc['1'];
                    // console.log(status);
                    var now = Date.now();
                    // console.log((now - status.time) / 1000);
                    status.timeSinceLastStatus = (now - status.time) / 1000;
                    if (parseFloat(status.THDU1) > 99) {
                        status.THDU1 = '0';
                    }
                    if (parseFloat(status.THDU2) > 99) {
                        status.THDU2 = '0';
                    }
                    if (parseFloat(status.THDU3) > 99) {
                        status.THDU3 = '0';
                    }
                    var secondsSinceLastStatus = (now - status.time) / 1000;
                    status.timeSinceLastStatus = secondsSinceLastStatus;
                    status.timeSinceLastStatusText = parseTimeDelta(secondsSinceLastStatus);

                    marker.setTooltipContent(tooltiphtml(status));

                    $('.U1').css('color',colormap(Math.abs(parseFloat(status.U1) - 230) / 23 * 100));
                    $('.U2').css('color',colormap(Math.abs(parseFloat(status.U2) - 230) / 23 * 100));
                    $('.U3').css('color',colormap(Math.abs(parseFloat(status.U3) - 230) / 23 * 100));
                    $('.thd1').css('color',colormap(parseFloat(status.THDU1) / 8 * 100));
                    $('.thd2').css('color',colormap(parseFloat(status.THDU2) / 8 * 100));
                    $('.thd3').css('color',colormap(parseFloat(status.THDU3) / 8 * 100));
                    marker.setStyle({'fillColor': colormap(Math.abs(parseFloat(status.U3) - 230) / 23 * 100)});
                },
            });
        }
        timers.push(setInterval(updateTooltip, 1000));
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
                'TDD': {id: 'thd', values: 'TDDI1,TDDI2,TDDI3'},
            },
            timeIntervals: {
                'All Time': {id: 'alltime', values: 'alltime'},
                'Today': {id: 'today', values: 'today'},
                'This week': {id: 'thisweek', values: 'thisweek'},
                'Last 24h': {id: 'last24h', values: 'last24h'},
                // 'Last 7 days': {id: 'thisweek', values: 'last7d'},
            }
        };
        $('#mainarea').append(chartcardhtml(data));
        
        $('#random-timeframe').dateRangePicker({
            autoClose: true,
            format: 'DD.MM.YYYY',
            startOfWeek: 'monday',
            time: {
                enabled: true
            },
            // beforeShowDay: function(t) {
            //     console.log(t);
            //     // console.log(t.milliseconds());
            //     // var valid = t.
            // }
            defaultTime: moment().startOf('day').toDate(),
            defaultEndTime: moment().endOf('day').toDate()
        }).bind('datepicker-change',function(event,obj) {
                updateGraph({
                    keepY: true,
                    timeRange: [obj.date1.getTime(), obj.date2.getTime()]
                });
            }
        );

        // Options for Data Graph
        // ======================

        var g = new Dygraph(
            document.getElementById("basicchart"),
            "Date,-\n" +
            "0,0\n",
            {
                gridLinePattern: [4,4],
                labelsDiv: "chartlegend",
                labelsSeparateLines: true,
                legend: 'always',
                colors: ['#F22613', '#26A65B', '#F7CA18'],
                strokeWidth: 2,
                // showRangeSelector: true,
                axis : {
                    x : {
                      valueFormatter: Dygraph.dateString_,
                      valueParser: function(x) { return 1000*parseInt(x); },
                      ticker: Dygraph.dateTicker,
                    }
                  },
                // xlabel: "Time",
                valueFormatter: function(value, opts, seriesName, dygraph, row, col) {
                    if (seriesName == 'time') {
                        return moment(value).format('ddd, D.MM.YYYY HH:mm:ss');
                    }
                    else if (seriesName == 'U1' || seriesName == 'U2' || seriesName == 'U3') {
                        return value.toFixed(2)+' V';
                    }
                    else if (seriesName == 'THDU1' || seriesName == 'THDU2' || seriesName == 'THDU3') {
                        return value.toFixed(2)+'%';
                    }
                    else if (seriesName == 'I1' || seriesName == 'I2' || seriesName == 'I3') {
                        return value.toFixed(3)+' A';
                    }
                    else if (seriesName == 'P1' || seriesName == 'P2' || seriesName == 'P3') {
                        return value.toFixed(1)+' W';
                    }
                    else if (seriesName == 'TDDI1' || seriesName == 'TDDI2' || seriesName == 'TDDI3') {
                        return value.toFixed(2)+' %';
                    }
                    else if (seriesName == 'PF1' || seriesName == 'PF2' || seriesName == 'PF3') {
                        return value.toFixed(2);
                    }
                },
                ylabel: "Voltage",
                yLabelWidth: 20,
                zoomCallback: function(minDate, maxDate, yRanges) {
                    if (minDate != currentMinDate || maxDate != currentMaxDate) {
                        $('#timeselectbar .chartoption').removeClass('selected');
                        currentMinDate = minDate;
                        currentMaxDate = maxDate;
                    }
                    currentMinY = yRanges[0][0];
                    currentMaxY = yRanges[0][1];
                },
            }
        );
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
            console.log(requestDict);
            $.ajax({
                type: 'POST',
                dataType: 'json',
                contentType: 'application/json; charset=UTF-8',
                url: '/api/query',
                data: JSON.stringify(requestDict),
                success: function(res) {
                    var data = res.data;
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
                        var valueRange = keepY && !errorflag ? [currentMinY, currentMaxY] : [null, null];
                        var dateWindow = keepT && !errorflag ? null : [currentMinDate, currentMaxDate];
                        g.updateOptions({file: data, labels: res.labels, valueRange: valueRange, dateWindow: dateWindow});
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
                $('.select-location').select2();
                updateGraph(false,false);
            }
        });
        $('#select-timeUnit').select2({minimumResultsForSearch: -1});
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
            updateGraph({
                keepY: true
            });
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


    $('#link-second').click(function() {
        $('.sidebar-link').removeClass('selected');
        $(this).addClass('selected');
        clearTimers();
        $('#mainarea').empty();

        $('#mainarea').append(secondviewhtml());
        var data = {items: {involts:'Volts', inpercent: '% / 50 Hz'}};
        $('#harmonicschart').append(chartcardhtml(data));

        var g = new Dygraph(
            document.getElementById("basicchart"),
            "Date,Temperature\n" +
            "2,75\n" +
            "3,70\n" +
            "4,80\n",
            {
                plotter: barChartPlotter,
                labelsDiv: "chartlegend",
                includeZero: true 
            }
        );
    });


    $('#link-view-simple').click(function() {
        $('.sidebar-link').removeClass('selected');
        $(this).addClass('selected');
        clearTimers();
        $('#mainarea').empty();

        $('#mainarea').append(view_simple_html());
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
                for (var grid in status.grids) {
                    for (var location in status.grids[grid]) {
                        var secondsSinceLastStatus = (now - status.grids[grid][location].time) / 1000;
                        status.grids[grid][location].timeSinceLastStatus = secondsSinceLastStatus;
                        status.grids[grid][location].timeSinceLastStatusText = parseTimeDelta(secondsSinceLastStatus);
                    }
                }
                $('#mainarea').append(status_html(status));
            },
        });

        // var data = {'gridid': 'SONDZ-E-UST-002', 'id': 12912983179, 'address': 'Störzbachstraße 15', 'secondssinceupdate': 5};
        // $('#statustable').append(location_line_html(data));
        // var data = {'gridid': 'SONDZ-E-UST-002', 'id': 12912983178, 'address': 'Störzbachstraße 13', 'secondssinceupdate': 123};
        // $('#statustable').append(location_line_html(data));
    });

    $('#link-first').click();
});
