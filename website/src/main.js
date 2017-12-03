// import purecss from 'purecss';
import Dygraph from 'dygraphs/index.es5.js';

import 'leaflet';
import leafletcss from 'leaflet/dist/leaflet.css';

import 'select2';
import selectcss from 'select2/dist/css/select2.min.css';

import bsslogo from './assets/bss_small.png';

import indexhtml from './index.pug';
import indexsass from './index.sass';

import mapsass from './components/map/map.sass';
import tooltiphtml from './components/map/tooltip.pug';
import tooltipsass from './components/map/tooltip.sass';

import chartcardhtml from './components/chartcard/chartcard.pug';
import chartcardsass from './components/chartcard/chartcard.sass';

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

    $('#link-map').click(function() {
        $('.sidebar-link').removeClass('selected');
        $(this).addClass('selected');
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
        // marker.bindTooltip("<span class='tooltip'><b>Störzbachstraße 15</b> <br> text</span>", {direction: 'right', offset: L.point(10,0), opacity: 0.4});
        function updateTooltip() {
            $.ajax({
                type: 'GET',
                dataType: 'json',
                url: '/api/status',
                success: function(res) {
                    var status = res.status;
                    console.log(status);
                    var now = Date.now();
                    console.log((now - status.time) / 1000);
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
        setInterval(updateTooltip, 1000);
    });

    $('#link-first').click(function() {
        $('.sidebar-link').removeClass('selected');
        $(this).addClass('selected');
        $('#mainarea').empty();
    
        var data = {
            values: {
                'Voltage': {id: 'voltage', values: 'U1,U2,U3'},
                'THD': {id: 'thd', values: 'THDU1,THDU2,THDU3'},
                'Current': {id: 'current', values: 'I1,I2,I3'},
                'TDD': {id: 'thd', values: 'TDDI1,TDDI2,TDDI3'},
                'Real Power': {id: 'P', values: 'P1,P2,P3'},
                'Power Factor': {id: 'PF', values: 'PF1,PF2,PF3'},
            },
            timeIntervals: {
                'Today': {id: 'today', values: 'today'},
                'This week': {id: 'thisweek', values: 'thisweek'},
                'last 24h': {id: 'last24h', values: 'last24h'},
                'last 7 days': {id: 'thisweek', values: 'last7d'},
            }
        };
        $('#mainarea').append(chartcardhtml(data));

        $('.select-location').select2();
        $('#select-timeUnit').select2({minimumResultsForSearch: -1});

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
                axis : {
                    x : {
                      valueFormatter: Dygraph.dateString_,
                      valueParser: function(x) { return 1000*parseInt(x); },
                      ticker: Dygraph.dateTicker,
                    }
                  }

            }
        );

        function updateGraph() {
            var values = $('#values-options .chartoption.selected').data('values');
            var timeInterval = $('#timeInterval-options .chartoption.selected').data('timeinterval');
            var avrginterval = $('#input-aggtime').val()+$('#select-timeUnit').val();
            var requestDict = {values: values, avrgInterval: avrginterval, timeInterval: timeInterval};
            console.log(requestDict);
            $.ajax({
                type: 'GET',
                dataType: 'json',
                url: '/api/query',
                data: requestDict,
                success: function(res) {
                    var data = res.data;
                    for (var i=0;i<data.length;i++) {
                        data[i][0] = new Date(data[i][0]);
                    }
                    g.updateOptions({'file': data, 'labels': res.labels});
                },
            });
        }

        $('#timeInterval-options .chartoption').first().addClass('selected');
        $('#value-options .chartoption').first().addClass('selected');

        $('.chartoption').click(function(el){
            $(el.currentTarget).siblings().removeClass('selected');
            $(el.currentTarget).addClass('selected');
            updateGraph();
        });
        $('#input-aggtime').change(updateGraph);
        $('#select-timeUnit').change(updateGraph);

        $('#voltage').click();
    });


    $('#link-second').click(function() {
        $('.sidebar-link').removeClass('selected');
        $(this).addClass('selected');
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
        $('#mainarea').empty();

        $('#mainarea').append(view_simple_html());
    });


    $('#link-status').click(function() {
        $('.sidebar-link').removeClass('selected');
        $(this).addClass('selected');
        $('#mainarea').empty();

        $('#mainarea').append(status_html());
        var data = {'gridid': 'SONDZ-E-UST-002', 'id': 12912983179, 'address': 'Störzbachstraße 15', 'secondssinceupdate': 5};
        $('#statustable').append(location_line_html(data));
        var data = {'gridid': 'SONDZ-E-UST-002', 'id': 12912983178, 'address': 'Störzbachstraße 13', 'secondssinceupdate': 123};
        $('#statustable').append(location_line_html(data));
        $.ajax({
            type: 'GET',
            dataType: 'json',
            url: '/api/status',
            // data: req,
            success: function(res) {
                var status = res.status;
                console.log(status);
                var now = Date.now();
                console.log((now - status.time) / 1000);
                status.timeSinceLastStatus = (now - status.time) / 1000;
            },
        });
    });

    $('#link-first').click();
});
