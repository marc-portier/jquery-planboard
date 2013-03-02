;
( function( $) {

    // ------------------------------------------------------------------------
    function log(msg) {
    	var ts = new Date().getTime();
    	console.log(ts + " |> " + msg);
    }

    // ------------------------------------------------------------------------
    // set of tuning aids, usage:
    //   0/ grab reference through $.tuning
    //   1/ suround method implementation with start("methodName"), stop("methodName")
    //   2/ finish up with dump()
    
    
    var LOGS = {};
    function getLog(key, orCreate) {
        orCreate = orCreate || false;
        var lg = LOGS[key];
        if (lg == null && orCreate) {
            lg = {"count": 0, "time": 0, "ts" : null};
            LOGS[key] = lg;
        }
        return lg;
    }
    function start(key) {
        var lg = getLog(key, true);
        lg.ts = new Date().getTime();
    }
    function stop(key) {
        var lg = getLog(key);
        lg.count++;
        lg.time += new Date().getTime() - lg.ts;
        lg.ts = null;
    }
    function dump() {
        for (key in LOGS) {
            var lg = LOGS[key];
            console.log("\t" + key + "\t|> time= " + lg.time + "\tcount=" + lg.count + "\tavg=" + (lg.time/lg.count));
        }
    }
    
    $.extend({"tuning": {"log": log, "start": start, "stop": stop, "dump": dump} });
})(jQuery);
