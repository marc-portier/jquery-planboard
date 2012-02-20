//(c) 2012, Marc Portier
// CC-SA-BY license 2.0 - BE, see http://creativecommons.org/licenses/by/2.0/be/

 //TODO
 //6- apis - events - config
 //7- optimise building and general speed + cleanup pcode
 //   (see also code for jsp (jq-scroll-pane): it samples more hidden variables inside 'create' function, better encapsulation
 //    jquery tricks: add elms through HTML generation then lookup by id or class.
 //    work less with dates, but rather with the datenums, only convert for visualization
 //8- tools & buttons:  select new period - pan? - find free wizard - add VE, add dates
 //9- visualisation: statusbar - loading - elements
 //10 - checkup bouncing around effect upon resize: avoid through absolute position of elements in n-e-s-w-grid

 // --
 // filtering rows on metadata? 
 // dynamically adding rows 
 // selection of renatal period >> highlighting available rows
 // jump-to-month (6<< en 6>>)
 
;
( function( $) {

    function jqExtendor(name, fn) {
        var ext = {};
        ext[name] = function(pass) {
            return $(this).map(function(){ 
                return fn($(this), pass);
            });
        }
        $.fn.extend(ext);
    };
    
    function jqDefine(name, cstr) {
        jqExtendor(name, function($e,p){return new cstr($e,p)});
    };
    
    function jqBuild(name, fn) {
        jqExtendor(name, fn);
    };
    
    function jqMerge(defs, vals) {
        return $.extend($.extend({}, defs), vals);
    }


    // -------------------------------------------------------------------------
    //
    // common util functions
    //
    // -------------------------------------------------------------------------
    


    // -------------------------------------------------------------------------
    //
    // planboard
    //
    // -------------------------------------------------------------------------

    
    jqDefine("planboard", Planboard);
    
    function Planboard($elm, config) {
        
        this.config = jqMerge(Planboard.config, config);
        this.$board = $elm;
        this.init();
    }
    
    Planboard.config = {
        jScrollPane:       {showArrows: true},
        northScrollHeight: "115px",
        westScrollWidth:   "95px",
        datenames:         ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"], 
        monthnames:        ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"], 
        addDayCount:       7,
        initDayCount:      42,
        scrollBarSize:     16
    }
    

    function createGrid(base) {
        base.$nw=$("<div class='north west'      ></div>");
        base.$nm=$("<div class='north meridian'  ></div>");
        base.$ne=$("<div class='north east'      ></div>");
        base.$NO=$([]).add(base.$nw).add(base.$nm).add(base.$ne);

        base.$ew=$("<div class='equator west'    ></div>");
        base.$em=$("<div class='equator meridian'></div>");
        base.$ee=$("<div class='equator east'    ></div>");
        base.$EQ=$([]).add(base.$ew).add(base.$em).add(base.$ee);

        base.$sw=$("<div class='south west'      ></div>");
        base.$sm=$("<div class='south meridian'  ></div>");
        base.$se=$("<div class='south east'      ></div>");
        base.$SO=$([]).add(base.$sw).add(base.$sm).add(base.$se);
    }
    
    Planboard.prototype.init = function() {
        createGrid(this);
        var me = this;
        
        // initialise north
        this.$north = $("<div></div>");
        this.$colhead = $("<div style='overflow: hidden'></div>");
        this.$days =$("<div class='uc days'></div>");
        this.$months =$("<div class='months'></div>");
        this.$periods =$("<div class='periods'></div>");
        this.$colhead.append(this.$periods).append(this.$months).append(this.$days);
        this.$north.append(this.$colhead);
        
        this.$nscroll=$("<div style='width=100%; overflow:auto;margin-right: "+this.config.scrollBarSize+"px'></div>");
        this.$nscroll.height(this.config.northScrollHeight);
        this.$nscroll.append(this.$north).jScrollPane(this.config.jScrollPane);
        this.$nm.append(this.$nscroll);
        
        // initialise northwest
        var $btnPreDates = $("<button class='colPrepend'>&lt;&lt;</button>").click(function() {
            me.prependCol(me.config.addDayCount)
        });
        this.$nw.html("<div></div>").append($btnPreDates);
        
        // initialise northeast
        var $btnAppDates = $("<button class='colAppend'>&gt;&gt;</button>").click(function() {
            me.appendCol(me.config.addDayCount)
        });
        this.$ne.html("<div></div>").append($btnAppDates);
        
        // initialise west
        this.$west =$("<div class='uc'></div>");
        this.$wscroll=$("<div style='overflow:auto;'></div>");
        this.$wscroll.width(this.config.westScrollWidth);
        this.$wscroll.append(this.$west).jScrollPane(this.config.jScrollPane);
        this.$ew.append(this.$wscroll);
        
        //initialise center
        this.$center =$("<div class='board'></div>");
        this.$cscroll=$("<div style='overflow:auto;'></div>");
        this.$cscroll.width(this.config.westScrollWidth);
        this.$cscroll.height(this.config.northScrollHeight);
        this.$cscroll.append(this.$center).jScrollPane(this.config.jScrollPane);
        this.$em.append(this.$cscroll);
        
        this.$WE=$([]).add(this.$nw).add(this.$ew).add(this.$sw);
        this.$ME=$([]).add(this.$nm).add(this.$em).add(this.$sm);
        this.$EA=$([]).add(this.$ne).add(this.$ee).add(this.$se);

        this.$board.addClass("planboard").html("")
            .append(this.$NO).append(this.$EQ).append(this.$SO);


        //probe sizes
        if (!this.config.unitsize) {
            this.$center.html("<div class='uc'><div class='u h w'>0</div></div>");
            var $u = this.$center.find(".u.h.w");
            this.config.unitsize = Math.max($u.outerWidth(), $u.outerHeight());
            this.$center.html("");
        }

        // add some cols & rows (callback and or default)
        this.initCells();

        // animate hookup the scrollers...
        jspHookup('y', this.$cscroll, this.$wscroll);
        jspHookup('x', this.$cscroll, this.$nscroll);
        
        // size up and redo that upon resize
        this.initSize();
        
        var me = this;
        $(window).resize(function(){me.initSize()});
    }

    function jspHookup(axis, $el1, $el2) {
        var ap1 = $el1.data('jsp');
        var ap2 = $el2.data('jsp');
        
        var evt = 'jsp-scroll-' + axis;
        var meth = 'scrollTo' + axis.toUpperCase();
        
        var link = true;
        
        _jspLink(link, $el1, evt, ap2, meth);
        _jspLink(link, $el2, evt, ap1, meth);
    };

    function _jspLink(guard, $src, evt, tgt, meth) {
        $src.bind(evt, function(event, pos, isMin, isMax){
            if (guard) {
                guard = false;
                tgt[meth](pos);
                guard = true;
            }
        });
    };


    function ajaxLoadedRows(board, data, textStatus, jqXhr) {
        var size = data.length;
        for (i=0; i<size; i++) {
            board.appendRow(data[i]);
        }
    }
    
    Planboard.prototype.initCells = function() {
    
        // todo call ajax for this...
        var rowdataUri = this.config.uri.rowdata;
        var me = this;
        $.get(rowdataUri, function(d,s,x){ ajaxLoadedRows(me, d, s, x);}, "json");
        
        //appendCols
        this.appendCol(this.config.initDayCount);

    };
    
    
    Planboard.offsetDate = function(offset, date) {

        offset = offset || -7;
        date = date || new Date();
        
        var od = new Date(date.getTime());
        od.setDate(date.getDate() + offset);
        return od; 
    }
    
    var ONEDAYms = 1000 * 60 * 60 * 24;
    Planboard.date2Num = function(date) {
        if (!date) {
            return null;
        }
        return Math.floor(0.5 + date.getTime() / ONEDAYms ); //adding one half here is crazy but got around an issue with 29/2/2012 ??
    };
    
    Planboard.num2Date = function(num) {
        if (!num) {
            return null;
        }
        return new Date(num * ONEDAYms);
    };
    
    function monthClass(m) {
        return "m"+ (1 + m) % 2;
    };
   
   
    var DATEPATTERN_RE = /(\d{2,4})-(\d{1,2})-(\d{1,2})/;
    Planboard.string2Date = function(str) {
        var match = str.match(DATEPATTERN_RE);
        if (match === null) {
            return null;
        }
        return new Date(match[1], match[2] - 1, match[3]);
    }
    
    Planboard.prototype.addPeriod = function(period) {
    
        if (!this.periods) {
            this.periods = {};
            this.periodnums = {};
        }
        
        if (this.periods[period.id]) { // the period was already added before
            return;  // TODO maybe consider re-adding periods with changed attributes
        }
        
        var fromnum = Planboard.date2Num(Planboard.string2Date(period.from));
        var tillnum = Planboard.date2Num(Planboard.string2Date(period.till));
        
        if (tillnum < this.cols.firstnum || fromnum > this.cols.lastnum) {
            return;
        }
        
        var days = 1 + tillnum - fromnum;
        var anchornum = Math.max(this.cols.firstnum, fromnum);
        var offdays = fromnum - anchornum;
        
        var width = days * this.config.unitsize;
        var offset = offdays * this.config.unitsize;
        
        var headId = toCellId("", anchornum);
        var $anchor = this.$days.find("#" + headId);
        period.$elm = $("<div class='period' style='left: " + offset + "px; width: " + width + "px'>" + period.label + "</div>");
        $anchor.append(period.$elm);
        
        // mark periods on board
        var num;
        for (num = fromnum; num <= tillnum; num++) {
            this.periodnums[num] = period;
            var lookup = ".cell.num_" + num;
            var $cells =  this.$board.find(lookup);
            $cells.addClass('pmark');
        }    
        this.periods[period.id] = period;
    } 
    
   
    function ajaxLoadedPeriods(board, data, textStatus, jqXhr) {
    
        board.$periods.html(""); // clear current periods // TODO is this needed?
        
        var size = data.length;
        for (i=0; i<size; i++) {
            board.addPeriod(data[i]);
        }
    }
    
    Planboard.prototype.loadPeriods = function(firstnum, lastnum) {
    
        // todo do something with the passed arguments towards calling the backend!
        
        var perioduri = this.config.uri.period;
        var me = this;
        $.get(perioduri, function(d,s,x){ ajaxLoadedPeriods(me, d, s, x);}, "json");
        
    } 
    

    Planboard.prototype.addAlloc = function(alloc) {

        if (!this.allocs) {
            this.allocs = {};
        }
        
        if (this.allocs[alloc.id]) { // the period was already added before
            return;  // TODO maybe consider re-adding allocs with changed attributes
        }
        
        var fromnum = Planboard.date2Num(Planboard.string2Date(alloc.from));
        var tillnum = Planboard.date2Num(Planboard.string2Date(alloc.till));
        
        if (tillnum < this.cols.firstnum || fromnum > this.cols.lastnum) {
            return;
        }
        
        var days = tillnum - fromnum; // no +1 here // unlike for periods: since allocs-end-dates are exclusive TODO make configurable
        var anchornum = Math.max(this.cols.firstnum, fromnum);
        var offdays = fromnum - anchornum + 0.5; //shift halfdays for night reservations TODO make configurable?
        
        var width = days * this.config.unitsize;
        var offset = offdays * this.config.unitsize;
        
        var anchorcode = alloc.ve;  // TODO make configurable property!
        
        var cellId = toCellId(anchorcode, anchornum);
        var cellClass = "alloc" + " " + alloc.type;  // TODO make class property configurable ? callback?
        
        var $anchor = this.$center.find("#" + cellId);
        alloc.$elm = $("<div class='" + cellClass + "' style='left: " + offset + "px; width: " + width + "px'>" + alloc.label + "</div>"); // TODO per 42 units add an extra label-span
        $anchor.append(alloc.$elm);
        
        this.allocs[alloc.id] = alloc;
    } 
    
   
    function ajaxLoadedAllocs(board, data, textStatus, jqXhr) {
        var size = data.length;
        for (i=0; i<size; i++) {
            board.addAlloc(data[i]);
        }
    }
    
    Planboard.prototype.loadAllocs = function(firstnum, lastnum) {
        // todo do something with the passed arguments towards calling the backend!
        
        var perioduri = this.config.uri.allocation;
        var me = this;
        $.get(perioduri, function(d,s,x){ ajaxLoadedAllocs(me, d, s, x);}, "json");
    } 
    
    Planboard.prototype.updateTimes  = function() {
        
        if (!this.cols) {
            return;
        }

        var fDateNum = this.cols.firstnum;
        var lDateNum = this.cols.lastnum;
        
        this.loadPeriods(fDateNum, lDateNum);
        this.loadAllocs(fDateNum, lDateNum);
        this.updateMonths(fDateNum, lDateNum);
    }
         
    Planboard.prototype.updateMonths = function(fDateNum, lDateNum) {
        var monthsHtml = "";

        var fDateNum = this.cols.firstnum;
        var lDateNum = this.cols.lastnum;
        
        var cfDateNum = fDateNum; //current month first
        
        do {
            var cfDate = Planboard.num2Date(cfDateNum);
            var m = cfDate.getMonth();
            var fy = cfDate.getFullYear();
            var clDate = new Date(cfDate.getFullYear(), m+1, 0);
            var clDateNum = Planboard.date2Num( clDate ); // last of this month == zeroth of next month
            var clDateNum = Math.min(clDateNum, lDateNum); // trim to the end of the board

            var days = 1 + clDateNum - cfDateNum;
            var width = this.config.unitsize * days - 2; // 2 px for the border
            var mclass = monthClass(m);

            monthsHtml += "<div class='month " + mclass + "' style='width: " + width + "px;'>" + this.config.monthnames[m] + " " + fy + "</div>";
            
            cfDateNum = clDateNum + 1; // first of next month
        } while (cfDateNum  <= lDateNum);
        this.$months.html(monthsHtml);        
    }
     
    Planboard.prototype.appendCol = function(count) {
        this._addCol(false,count);
        this.updateTimes();
    };
    
    Planboard.prototype.prependCol = function(count) {
        this._addCol(true,count);
        this.updateTimes();
    }
    
    Planboard.prototype._addCol = function(prepend, count) {
        prepend = prepend || false;
        for (; count>1; count--) {
            this._addCol(prepend);
        }
    
        if (this.cols == null) {
            this.cols = {"count": 0, "bynum": {}}; 
        }
        
        
        var refDateNum = this.cols.lastnum, offset = 1; //defaults for append
        if (prepend) {
            refDateNum = this.cols.firstnum;
            offset = -1;
        }
        
        var newDateNum = refDateNum ? refDateNum + offset : Planboard.date2Num(Planboard.offsetDate());
        
        // add logically
        var newCol = new PlanColumn(newDateNum, this, prepend);
        
        // add visually
        if (prepend) {
            this.$days.prepend(newCol.$elm);
        } else {
            this.$days.append(newCol.$elm);
        }
        
        //resize
        var newCellHeight = newCol.$elm.height() + 1;
        var newHeight = Math.max(this.$north.height(), newCellHeight);
        this.$north.height(newHeight);
        
        var newWidth =  1 + this.cols.count * (this.config.unitsize);
        var oldWidth = this.$north.width();
        
        this.$colhead.width(newWidth);
        this.$north.width(newWidth);
        this.$center.width(newWidth);
        
        this.reinitHorizontalScrollBar();
    };
    
    function PlanColumn(datenum, board, prepend) {
        prepend = prepend || false;
        var allCols   = board.cols;
        var datenames = board.config.datenames;
        
        this.datenum  = datenum;
        this.date     = Planboard.num2Date(datenum);
        this.label    = datenames[this.date.getDay()] + "<br/>" + this.date.getDate();
        this.$cells   = $([]);
        this.classes= [monthClass(this.date.getMonth())];
        if (this.date.getDay() % 6 == 0) { //weekend is day 0 or day 6
            this.classes.push("we");
        }
        var headId    = toCellId("", this.datenum);
        this.$elm     = $("<div class='u w "+this.classes.join(" ")+"' id="+headId+">"+this.label+"</div>");
        
        // hookup to the planboard structure        
        allCols.bynum[this.datenum]=this;
        if (prepend) {
            allCols.firstnum = this.datenum;
            allCols.lastnum  = allCols.lastnum || allCols.firstnum;  // if prepending first
        } else {
            allCols.lastnum = this.datenum;
            allCols.firstnum  = allCols.firstnum || allCols.lastnum; // if appending first
        }
        allCols.count++;
        

        var allRows = board.rows;
        if (allRows) {
            var code;
            for (code in allRows.bycode) {
                var row = allRows.bycode[code];
                board.newCell(row.code, this.datenum, row, this, prepend);
            }
        }
    }
        
    Planboard.prototype.appendRow = function(rowData) {
    
        // TODO row-code should become ID of some sort, label should be externally added.
        
        if (this.rows == null) {
            this.rows={ "count" : 0, "bycode" : {}};
        }
        
        //TODO make the fields to use as code & label configurable!
        var code = rowData.id;
        var label = rowData.label;
        
        var newRow = this.rows.bycode[code];
        if (newRow) {  // already exists! 
            return;
        } 
        
        // add logically
        newRow = new PlanRow(code, label, rowData, this);
        
        // add visually
        this.$west.append(newRow.$elm);
        this.$center.append(newRow.$row);
        
        //resize
        var newCellWidth = newRow.$elm.width() + 1;
        var newWidth = Math.max(this.$west.width(), newCellWidth);
        this.$west.width(newWidth);
        
        var newHeight = 1 + this.rows.count * (this.config.unitsize);
        this.$west.height(newHeight);
        this.$center.height(newHeight);
        this.reinitVerticalScrollBar();
    };
    
    function PlanRow(code, label, rowData, board) {
        var allRows   = board.rows;
        var rowClass  = "r" + (allRows.count % 2);
        
        this.code     = code; //TODO maybe strip spaces?
        this.label    = label;
        this.data     = rowData;
        
        var headId    = toCellId(code, "");
        this.$elm     = $("<div class='u h "+rowClass+"' id="+headId+">"+this.label+"</div>");
        
        // hookup to the planboard structure
        allRows.bycode[code]=this;
        allRows.count++;
        
        var rowId     = toCellId(code, "--");
        this.$row     = $("<div class='uc "+rowClass+"' id="+rowId+"></div>");
        //TODO add existing cols to this row >> USE HTML cat for speed!!!
        var allCols = board.cols;
        var colnum, firstnum = allCols.firstnum, lastnum = allCols.lastnum;
        for (colnum=firstnum; colnum <= lastnum; colnum++) {
            var col = allCols.bynum[colnum];
            board.newCell(this.code, colnum, this, col);
        }
    }
    
    
    function toCellId(code, num) {
        return code + "_" + num;
    }
    
    
    //TODO change this into HTML production
    Planboard.prototype.newCell = function(code, num, row, col, prepend) {
        prepend = prepend || false;
        
        var cellId = toCellId(code, num);
        var cellClass = "cell num_" + num;
        if (this.periodnums && this.periodnums[num]) {
            cellClass += " pmark";
        }        
        var $cell = $("<div class='u h w " + col.classes.join(" ") + "' id='"+cellId+"'><div class='"+cellClass+"'>&nbsp;</div></div>");
        if (prepend) {
            row.$row.prepend($cell);
        } else {
            row.$row.append($cell);
        }
        col.$cells.add($cell); // don't do this in HTML production, instead add class-name with encoded datenum!
    }
    
    
    Planboard.prototype.initSize = function() {
       var noHeight = Math.max.apply(Math, this.$NO.map(function(){return $(this).css('height','').height();}).get());
       var soHeight = Math.max.apply(Math, this.$SO.map(function(){return $(this).css('height','').height();}).get());
       var eqHeight = this.$board.height() - (noHeight + soHeight);
       this.$NO.height(noHeight);
       this.$SO.height(soHeight);
       this.$EQ.height(eqHeight);
       
       this.$wscroll.height(eqHeight -17);
       this.$cscroll.height(eqHeight -1);
       
       var weWidth = Math.max.apply(Math, this.$WE.map(function(){return $(this).css('width','').width();}).get());
       var eaWidth = Math.max.apply(Math, this.$EA.map(function(){return $(this).css('width','').width();}).get());
       var meWidth = this.$board.width() - (weWidth + eaWidth);
       this.$WE.width(weWidth);
       this.$EA.width(eaWidth);
       this.$ME.width(meWidth);
       
       //update scroll-bars
       this.reinitScrollBars();
    }
    
    Planboard.prototype.reinitScrollBars = function() {
        this.reinitHorizontalScrollBar();
        this.reinitVerticalScrollBar();
    }

    function reinitBar($elm) {
        var api = $elm.data('jsp');
        if (!api) { return; };
        api.reinitialise();
    }
    Planboard.prototype.reinitHorizontalScrollBar = function() {
        reinitBar(this.$cscroll);
        reinitBar(this.$nscroll);
    }
    Planboard.prototype.reinitVerticalScrollBar = function() {
        reinitBar(this.$cscroll);
        reinitBar(this.$wscroll);
    }
    
})(jQuery);
