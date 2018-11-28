export function colormap(i) {
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

export function parseTimeDelta(seconds) {
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

export function barChartPlotter(e) {
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

export function clearTimers() {
    for (var i = window.timers.length-1; i>=0; i--) {
        window.clearTimeout(window.timers[i]);
    }
    window.timers = [];
}

export function customValueFormatter(value,seriesName, digits){
    if (value) {
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
            return advalue.toFixed(digits)+ ' ' + dim +'V';
        }
        else if (seriesName == 'THDU1' || seriesName == 'THDU2' || seriesName == 'THDU3') {
            return value.toFixed(digits)+'%';
        }
        else if (seriesName == 'I1' || seriesName == 'I2' || seriesName == 'I3') {
            return advalue.toFixed(digits)+ ' ' + dim +'A';
        }
        else if (seriesName == 'P1' || seriesName == 'P2' || seriesName == 'P3') {
            return advalue.toFixed(digits)+ ' ' + dim +'W';
        }
        else if (seriesName == 'S1' || seriesName == 'S2' || seriesName == 'S3') {
            return advalue.toFixed(digits)+ ' ' + dim +'VA';
        }
        else if (seriesName == 'PF1' || seriesName == 'PF2' || seriesName == 'PF3') {
            return value.toFixed(digits);
        } 
        else if (seriesName == 'f') {
            return advalue.toFixed(digits)+ ' ' + dim +'Hz';
        }
    } else {
        return '-'
    }
}