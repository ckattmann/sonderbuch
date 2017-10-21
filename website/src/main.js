// import purecss from 'purecss';
import Dygraph from 'dygraphs/index.es5.js';

import indexhtml from './index.pug';
import indexsass from './index.sass';

import chartcardhtml from './components/chartcard/chartcard.pug';
import chartcardsass from './components/chartcard/chartcard.sass';

import firstviewhtml from './components/firstview/firstview.pug';
import firstviewsass from './components/firstview/firstview.sass';

import secondviewhtml from './components/secondview/secondview.pug';


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


$(document).ready(function() {

    // Helper Functions


    $('#link-first').click(function() {
        $('.sidebar-link').removeClass('selected');
        $(this).addClass('selected');
        $('#mainarea').empty();
    
        $('#mainarea').append(firstviewhtml());
        var data = {items: {
            'Voltage': {id: 'voltage', values: 'U1,U2,U3'},
            'Current': {id: 'current', values: 'I1,I2,I3'},
            'THD': {id: 'thd', values: 'THDU1,THDU2,THDU3'}
        }};
        $('#powerchart').append(chartcardhtml(data));

        var g = new Dygraph(
            document.getElementById("basicchart"),
            "Date,-\n" +
            "0,0\n",
            {
                gridLinePattern: [4,4],
                labelsDiv: "basicchartlegend",
                legend: 'always',
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

        function updateDygraph(req) {
            $.ajax({
                type: 'GET',
                dataType: 'json',
                url: '/api/query',
                data: req,
                success: function(res) {
                    var data = res.data;
                    for (var i=0;i<data.length;i++) {
                        data[i][0] = new Date(data[i][0]);
                    }
                    g.updateOptions({'file': data, 'labels': res.labels});
                },
            });
        }

        $('.chartoption').click(function(el){
            updateDygraph({values: el.currentTarget.dataset.values});
        });

        var req = {
            values: 'THDU1',
        };

        updateDygraph(req);

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
                labelsDiv: "basicchartlegend",
                includeZero: true 
            }
        );
    });

    $('#link-first').click();
});
