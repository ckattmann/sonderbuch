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
    for (var i = timers.length-1; i>=0; i--) {
        window.clearTimeout(window.timers[i]);
    }
    window.timers = [];
}