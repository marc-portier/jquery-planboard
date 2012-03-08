//(c) 2012, Marc Portier
// CC-SA-BY license 2.0 - BE, see http://creativecommons.org/licenses/by/2.0/be/

 //TODO
 //1- tools & buttons:  implement the added ones, think about more?
 // filtering/hiding/removing rows on metadata? 
 // dynamically adding rows 
 //2- selection mode implementation
 // selection of rental period >> highlighting available rows 
 //3- apis - events - config
 //  > docs
 //  > allow to add tools by moving them in from a passed div#id? or by passing the $tools to a callback
 //4- optimise building and general speed + cleanup pcode
 //   (see also code for jsp (jq-scroll-pane): it samples more hidden variables inside 'create' function, better encapsulation
 //    jquery tricks: add elms through HTML generation then lookup by id or class.
 //    work less with dates, but rather with the datenums, only convert for visualization
 //5- visualisation: loading - elements

 // --
 // think dependencies: default css to be overriden should be in src/main
 // less should be compiled
 // js should be minified
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

        var options = this.config.datepicker;
        var lang = this.config.lang;
        if (lang != 'en') {
            $.extend(options, $.datepicker.regional[lang]);
        } 
        if (this.config.datenames) {  options.dayNamesMin  = this.config.datenames; }
        else {                        this.config.datenames  = options.dayNamesMin; }
        if (this.config.monthnames) { options.monthNames  = this.config.monthnames; }
        else {                        this.config.monthnames  = options.monthNames; }
        delete options.onSelect;  // make sure nobody captures this event
        this.config.datepicker = options; // not setting them as default as not to interfere
        
        this.$board = $elm;
        this.init();
    }
    
    Planboard.CONTEXT = "planboard.context";
    Planboard.config = {
        //pass-through options to jsp
        jScrollPane:         {showArrows: true},
        // pass-through options to datepicker
        datepicker:          {
            autoSize:          true,
            changeYear:        true,
            showOtherMonths:   false,
            selectOtherMonths: true,
            numberOfMonths:    2,
            stepMonths:        2,
            yearRange:         "c-5:c+5"
        },
        //width of vertical - height of horizontal scrollbar
        scrollBarSize:       16,
        //fixed dimensions for sections
        northScrollHeight:   "115px",
        westScrollWidth:     "95px",
        // language to use- defaults to $('html').attr('lang')
        lang:               $('html').attr('lang'),
        // number of days between suggested repeats of labels in allocs
        labelRepeatDayCount:     28, 
        // number of days to be added when button is pushed
        addDayCount:         7,
        // number of days to be added after selected date
        daysafter:           14,
        // number of days to be added before selected date
        daysbefore:          7,
        // number of days to be added initially
        initDayCount:        42,
        //--------------------------------- allocation config
        // is the end-date inclusive 0=no, 1=yes. 
        allocInclusive:      0, // allocation times are end-time not inclusive
        // offset of allocation in grid (e.g. half day offset for hotel-bookings)
        allocOffset:         0.5,
        // property of allocation data containing 'from' time
        allocFromProperty:   "from",
        // property of allocation data containing 't‎ill' time
        allocTillProperty:   "till",
        // property of allocation data containing 'identifier' (unique)
        allocIdProperty:     "id",
        // property of allocation data containing 'identifier' (unique)
        allocLabelProperty:  "label",
        // property of allocation data containing reference to row-identifier
        allocRowProperty:    "rowid",
        // property of allocation data containing 'type' (class styling) information
        allocTypeProperty:   "type",

        //--------------------------------- period config
        // period times are typically end -time inclusive
        periodInclusive:     1, 
        // property of period data containing 'from' time
        periodFromProperty:  "from",
        // property of period data containing 'till' time
        periodTillProperty:  "till",
        // property of period data containing 'identifier'
        periodIdProperty:    "id",
        // property of period data containing 'label'
        periodLabelProperty: "label",
        
        //--------------------------------- row config
        // property of row data containing 'identifier'
        rowIdProperty:       "id",
        // property of row data containing 'label'
        rowLabelProperty:    "label",
        
        // location for date-picker-image
        datePickerImgSrc:    "./image/date.png"
    }
    

    function createGrid(me) {
        me.$nw=$("<div class='north west'      ></div>");
        me.$nm=$("<div class='north meridian'  ></div>");
        me.$ne=$("<div class='north east'      ></div>");
        me.$NO=$([]).add(me.$nw).add(me.$nm).add(me.$ne);

        me.$ew=$("<div class='equator west'    ></div>");
        me.$em=$("<div class='equator meridian'></div>");
        me.$ee=$("<div class='equator east'    ></div>");
        me.$EQ=$([]).add(me.$ew).add(me.$em).add(me.$ee);

        me.$sw=$("<div class='south west'      ></div>");
        me.$sm=$("<div class='south meridian'  ></div>");
        me.$se=$("<div class='south east'      ></div>");
        me.$SO=$([]).add(me.$sw).add(me.$sm).add(me.$se);
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

        // initialise south
        this.$status = $("<div class='status'>&nbsp;</div>");
        this.$sm.append(this.$status);
        
        // initialise east
        this.$tools = $("<div class='tools'></div>");

        var $datePickDiv = $("<div class='tool datepick'></div>");
        function dateSelected(dateText, inst) {
            me.$pickDate.click();
            me.gotoDate($datePickDiv.datepicker("getDate"));
        }

        this.$tools.append($datePickDiv);
        $datePickDiv.datepicker($.extend({onSelect: dateSelected}, this.config.datepicker));

        $datePickDiv.hide();
       
        this.$pickDate = $("<button class='tool'>D</button>").click(function() {me.pickDateTool($datePickDiv)});
        var $moreRows = $("<button class='tool'>M</button>").click(function() {me.moreRowsTool()});
        this.$hideRows = $("<button class='tool'>H</button>").click(function() {me.hideRowsTool()});
        this.$tools.append(this.$pickDate).append($moreRows).append(this.$hideRows);

        this.$ee.append(this.$tools);
        
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

        // size up and redo that upon resize of the window
        this.initSize();
        var me = this;
        $(window).resize(function(){me.initSize()});

        // capture keys
        $('body').keypress(function(evt) {
            evt.stopPropagation();
            Planboard.keypress( me, $(this), evt);
        });

    }

    
    Planboard.prototype.setStatus = function(msg) {
        this.$status.html(msg);
    }
    
    Planboard.registerCellEvents = function(me, $elm, id, code, num) {
        var context = {id: id, code: code, num: num};
        $elm.hover(function(evt) {
            Planboard.enterCell(context, me, $(this), evt);
        }, function(evt) {
            Planboard.leaveCell(context, me, $(this), evt);
        });
        $elm.click(function(evt) {
            Planboard.clickCell(context, me, $(this), evt);
        });
    }

    function highlight($elm, style) {
        $elm.addClass("highlight");
        if (style) {  $elm.addClass(style); }
    }
    
    function downlight($elm, style) {
        $elm.removeClass("highlight");
        if (style) {  $elm.removeClass(style); }
    }

    Planboard.enterCell = function(context, me, $cell, evt) {
        if (context.code) { highlight( me.rows.bycode[context.code].$elm); }
        if (context.num)  { highlight( me.cols.bynum[context.num].$elm); }
    }
    
    Planboard.leaveCell = function(context, me, $cell, evt) {
        if (context.code) { downlight( me.rows.bycode[context.code].$elm); }
        if (context.num)  { downlight( me.cols.bynum[context.num].$elm); }
    }
    
    Planboard.clickCell = function(context, me, $cell, evt) {
    
        //TODO: arrange for separate clickPeriod / hover-period to allow for period-matching-alloc
        
        var num = context.num;
        var code = context.code;
        var sel = me.selection;

        Planboard.hideSelection(me);
        sel = sel || {};   // create selection for first click
        if ( code && sel.code != code ) { // other selected row
            sel.code = code;
            if (num != undefined) {
                sel.fromnum = num;
                sel.tillnum = num;
                sel.lastnum = num;
            }
        } 
        
        if (num != undefined) {    
            if (sel.lastnum == num) { //first click
                sel.fromnum = sel.lastnum;
                sel.tillnum = num + 1; // expand to at least one night
            } else if (sel.lastnum < num) { //follow up click is towards the future
                sel.fromnum = sel.lastnum;
                sel.tillnum = num;
            } else { // follow up click is towards the past
                sel.tillnum = sel.lastnum;
                sel.fromnum = num;
            }
            sel.lastnum = num;
        }
        me.selection = sel;
        Planboard.showSelection(me);
    }

    Planboard.PRESS_TIMEOUT_MS = 1000; // 1 seconds
    Planboard.keypress = function( me, $doc, evt) {
        var sel = me.selection;
        if (!sel) { return; }
         
        //TODO capture key (DELETE?) to remove the selection (since row & date head clicks don't clear selection any more
        
        var pressTS = (new Date()).getTime(); // capture time to check for follow-up keypress
        
        var count = 0;
        if (evt.which == 43 || evt.which == 61) {               // if + or =
            count = sel.tillnum - sel.fromnum + 1;              //   increment
            pressTS = 0;
        } else if (evt.which == 45 || evt.which == 95) {        // if - or _
            count = sel.tillnum - sel.fromnum - 1;              //   decrement
            pressTS = 0;
        } else if (evt.which < 48 || evt.which > 57) {          // if no digit
            me.selection.lastcount = 0;                         //   clear count and bail out.
            delete me.selection.pressTS;
            return;
        } else {                                                // normal digit case
            var digit = evt.which - 48;
            if (sel.pressTS && pressTS - sel.pressTS < Planboard.PRESS_TIMEOUT_MS) { 
                count = sel.lastcount;                          //   in time for follow up
            } 
            count = count * 10 + digit;
        }
        
        // keep state
        sel.pressTS = pressTS;
        sel.lastcount = count;
        
        // adapt selection
        sel.tillnum = sel.fromnum + Math.max(1, count);  // don't allow counts below 1;
        sel.lastnum = sel.fromnum;

        Planboard.hideSelection(me);
        me.selection = sel;
        Planboard.showSelection(me);
    }
   
    Planboard.hideSelection = function(me) {
        var sel = me.selection;
        if (!sel) { return; }
        sel.$elm.remove();
        sel.$elm = null;
    }

    Planboard.NEWID = "__NEW__";
    Planboard.showSelection = function(me) {
        var sel = me.selection;
        if (!sel) { return; }
        var markfloat = "right", marker = "&lt;";
        if (sel.lastnum == sel.fromnum) {
            markfloat = "left";
            marker = "&gt;";
        }
        var lbl = "<div style='padding-"+markfloat+": 2px; float: "+markfloat+";'>"+marker+"</div>" + (sel.tillnum - sel.fromnum);
        sel.$elm = me.makeAllocElm(Planboard.NEWID, "new", sel.code, sel.fromnum, sel.tillnum, lbl);
    }


    Planboard.registerAllocEvents = function(me, $elm, id, style, code, fromnum, tillnum) {
        var context = {id: id, style: style, code: code, fromnum: fromnum, tillnum: tillnum};
        $elm.hover(function(evt) {
            evt.stopPropagation();
            Planboard.enterAlloc(context, me, $(this), evt);
        }, function(evt) {
            evt.stopPropagation();
            Planboard.leaveAlloc(context, me, $(this), evt);
        });
        $elm.click(function(evt) {
            evt.stopPropagation();
            Planboard.clickAlloc(context, me, $(this), evt);
        });
    };

    Planboard.enterAlloc = function(context, me, $alloc, evt) {
        if (context.code) { highlight( me.rows.bycode[context.code].$elm, context.style); }
        if (context.fromnum && context.tillnum)  { 
            var num;
            var firstnum = Math.max(context.fromnum, me.cols.firstnum);
            var lastnum  = Math.min(context.tillnum, me.cols.lastnum);
            for(num = firstnum; num <= lastnum; num++) {
                highlight( me.cols.bynum[num].$elm, context.style); 
            }
        }
    };
    
    Planboard.leaveAlloc = function(context, me, $alloc, evt) {
        if (context.code) { downlight( me.rows.bycode[context.code].$elm, context.style); }
        if (context.fromnum && context.tillnum)  { 
            var num;
            var firstnum = Math.max(context.fromnum, me.cols.firstnum);
            var lastnum  = Math.min(context.tillnum, me.cols.lastnum);
            for(num = firstnum; num <= lastnum; num++) {
                downlight( me.cols.bynum[num].$elm, context.style); 
            }
        }
    }
    
    Planboard.clickAlloc = function(context, me, $alloc, evt) {
        //TODO check if the callback is configured, if so call it.
    }

    Planboard.prototype.pickDateTool = function($div) {
        if (!$div.data("context") ) {
            $div.data("context", true);
            $div.show(); 
            this.$pickDate.html("d");//TODO better visual
            $div.css("right", $div.find(".ui-widget").outerWidth() + "px");
        } else {
            this.$pickDate.html("D"); //TODO better visual
            $div.hide();
            $div.data("context", false);
        }
    }
    
    Planboard.prototype.moreRowsTool = function() {
        this.setStatus("TODO: show selector dialog to obtain more rows, then load them");
    }
    
    Planboard.prototype.hideRowsTool = function() {
        var me = this;
        
        function showSelectors() {

            for (code in me.rows.bycode) {
                var row = me.rows.bycode[code];
                var $s = $("<input type='checkbox'>");
                $s.data('row', row);
                var $d = $("<div style='position: absolute; left: 0px; top: 2px'></div>").append($s);
                row.$elm.append($d); // show them

                context.$selects = context.$selects.add($s); // keep ref
                context.$added = context.$added.add($d); // keep ref
            }
            
            var $ctrl =  $("<div style='position:absolute; bottom: 2px'></div>");
            var $grp = $("<input type='checkbox'>").change(function() {
                if ($grp.attr('checked') === 'checked') {       // if grp-selects ON
                    context.$selects.attr('checked','checked'); // set all selects ON
                } else {
                    context.$selects.removeAttr('checked');     // set all selects OFF
                }
            });
            var $ok = $("<button>o</button>").click(function() {
                doTool();
                endTool();
            });
            var $cancel = $("<button>c</button>").click(function() {
                endTool();
            });
            $ctrl.append($grp).append($ok).append($cancel);
            me.$nw.append($ctrl);
            context.$added = context.$added.add($ctrl);
        }
        
        function hideSelectors() {
            context.$added.remove();
        }
        
        
        var context;
        function startTool() {
            me.$hideRows.html('h'); //TODO some better visual clue 
            context = {
                '$selects': $([]), 
                '$added': $([])
            };
            
            showSelectors();

            me.$hideRows.data('context', context);
        }
        
        function endTool() {
            me.$hideRows.data('context', null);

            hideSelectors();

            context = null;
            me.$hideRows.html('H');  //TODO remove visual clue of enabling
        }
        
        function doTool() {
            context.$selects.each(function() {
                var $this = $(this);
                if (!$this.attr('checked')) { return; }
                
                var row = $this.data('row');
                me.removeRow(row);
            });
        }
        
        //tool-toggle-control
        context = this.$hideRows.data('context');
        if (!context) {
            startTool();
        } else {
            endTool();
        }
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

    Planboard.prototype.gotoDate = function(date) {
        var gotoNum = Planboard.date2Num(date);
        var hsapi = this.$cscroll.data('jsp');
        if (gotoNum >= this.cols.firstnum && gotoNum <= this.cols.lastnum) { // allready in range
            var xpcnt = (gotoNum - this.cols.firstnum) / (this.cols.lastnum - this.cols.firstnum);
            hsapi.scrollToPercentX(xpcnt);
            return;
        }// else

        var prependCount = this.cols.firstnum - gotoNum; 
        var appendCount = gotoNum - this.cols.lastnum; 
        if (appendCount  >= 0 && appendCount < this.config.initDayCount ) { // within range of the last
            this.appendCol(appendCount + this.config.daysafter);   
            hsapi.scrollToPercentX(100);
            return;
        } //else
        if (prependCount >= 0 && prependCount < this.config.initDayCount ) { //within range of the first
            this.prependCol(prependCount + this.config.daysbefore); 
            hsapi.scrollToPercentX(0);
            return;
        } // else
        
        // no overlap >> new complete range
        this.clearColumns();
        this.config.startDate = date;
        this.initDates();
    }

    function ajaxLoadedRows(board, data, textStatus, jqXhr) {
        var size = data.length;
        for (i=0; i<size; i++) {
            board.appendRow(data[i]);
        }
    }
    
    Planboard.prototype.loadRows = function() {
        var rowdataUri = this.config.uri.rowdata;
        var me = this;
        $.get(rowdataUri, function(d,s,x){ ajaxLoadedRows(me, d, s, x);}, "json");
    }
    
    Planboard.prototype.initCells = function() {
    
        this.loadRows();    
        this.config.startDate = this.config.startDate || Planboard.offsetDate();
        this.initDates();
    }
    
    Planboard.prototype.initDates = function() {
        this.appendCol(this.config.initDayCount);
    };
    
    
    Planboard.offsetDate = function(offset, date) {

        offset = offset || 0;
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
        
        var id = period[this.config.periodIdProperty];
        if (this.periods[id]) { // this period was already added before
            return;  // TODO maybe consider re-adding periods with changed attributes
        }
        
        var fromnum = Planboard.date2Num(Planboard.string2Date(period[this.config.periodFromProperty]));
        var tillnum = Planboard.date2Num(Planboard.string2Date(period[this.config.periodTillProperty]));
        
        if (tillnum < this.cols.firstnum || fromnum > this.cols.lastnum) {
            return;
        }
        
        var days = this.config.periodInclusive + tillnum - fromnum;
        var anchornum = Math.max(this.cols.firstnum, fromnum);
        var offdays = fromnum - anchornum;
        
        var width = days * this.config.unitsize;
        var offset = offdays * this.config.unitsize;
        
        var headId = toCellId("", anchornum);
        var $anchor = this.$days.find("#" + headId);
        period.$elm = $("<div class='period' style='left: " + offset + "px; width: " + width + "px'>" + period[this.config.periodLabelProperty] + "</div>");
        $anchor.append(period.$elm);
        
        // mark periods on board
        var num;
        for (num = fromnum; num <= tillnum; num++) {
            this.periodnums[num] = period; // TODO: list all periods through this date - and upon chech look for the size of the array
            var lookup = ".cell.num_" + num;
            var $cells =  this.$board.find(lookup);
            $cells.addClass('pmark');
        }    
        this.periods[id] = period;
    } 
    
   
    function ajaxLoadedPeriods(board, data, textStatus, jqXhr) {
    
        board.$periods.html(""); // clear current periods 
        
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
    
        
    
    Planboard.prototype.makeAllocElm = function(id, style, code, fromnum, tillnum, label) {
        var days = tillnum - fromnum + this.config.allocInclusive; 
        var num = Math.max(this.cols.firstnum, fromnum);
        var offdays = fromnum - num + this.config.allocOffset; 
        
        var width = days * this.config.unitsize;
        var offset = offdays * this.config.unitsize;
        
        var cellId = toCellId(code, num);
        var cellClass = "alloc" + " " + style;
        
        var $anchor = this.$center.find("#" + cellId);
        var $elm = $("<div class='" + cellClass + "' style='left: " + offset + "px; width: " + width + "px'></div>"); 
        Planboard.registerAllocEvents(this, $elm, id, style, code, fromnum, tillnum);

        var labels = "";
        var repeatDays = this.config.labelRepeatDayCount;
        var times = Math.floor(days / repeatDays) + 1;
        var repeatWidth = Math.min(width, repeatDays * this.config.unitsize);
        var n;
        for (n=0; n<times; n++) {
            labels += "<div style='float: left; width: "+repeatWidth+"px'>" + label + "</div>";
        }
        $elm.html(labels);
        $anchor.append($elm);
        
        return $elm;
    }
    
    Planboard.prototype.addAlloc = function(alloc) {

        if (!this.allocs) {
            this.allocs = {};
        }
        
        var id = alloc[this.config.allocIdProperty];
        if (this.allocs[id]) { // this alloc was already added before
            return;  // TODO maybe consider re-adding allocs with changed attributes
        }
        
        var fromnum = Planboard.date2Num(Planboard.string2Date(alloc[this.config.allocFromProperty]));
        var tillnum = Planboard.date2Num(Planboard.string2Date(alloc[this.config.allocTillProperty]));
        
        if (tillnum < this.cols.firstnum || fromnum > this.cols.lastnum) {
            return;
        }
        
        var code = alloc[this.config.allocRowProperty];
        var label = alloc[this.config.allocLabelProperty];
        var style = alloc[this.config.allocTypeProperty];

        alloc.$elm = this.makeAllocElm(id, style, code, fromnum, tillnum, label);
        
        this.allocs[id] = alloc;
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
     
    Planboard.prototype.clearColumns = function() {
    
        for (code in this.rows.bycode) {
            var row = this.rows.bycode[code];
            row.$row.html("");
        }
        this.$days.html("");
        this.cols = null;
        this.allocs = null; // clear allocs too since they are attached to the rows
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
        
        var newDateNum = refDateNum ? refDateNum + offset : Planboard.date2Num(this.config.startDate) - this.config.daysbefore;
        
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
        Planboard.registerCellEvents(board, this.$elm, headId, null, this.datenum);
        
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
    
        if (this.rows == null) {
            this.rows={ "count" : 0, "bycode" : {}};
        }
        
        //TODO make the fields to use as code & label configurable!
        var code = rowData[this.config.rowIdProperty];
        var label = rowData[this.config.rowLabelProperty];
        
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
        this.rowHeadResize(newRow);
        
        var newHeight = 1 + this.rows.count * (this.config.unitsize);
        this.$west.height(newHeight);
        this.$center.height(newHeight);
        this.reinitVerticalScrollBar();
    };
    
    function PlanRow(code, label, rowData, board) {
        var allRows   = board.rows;
        
        this.code     = code; //TODO maybe strip spaces?
        this.label    = label;
        this.data     = rowData;
        
        var headId    = toCellId(code, "");
        this.$elm     = $("<div class='u h row' id="+headId+">"+this.label+"</div>");
        Planboard.registerCellEvents(board, this.$elm, headId, code, null);
        
        // hookup to the planboard structure
        allRows.bycode[code]=this;
        allRows.count++;
        
        var rowId     = toCellId(code, "--");
        this.$row     = $("<div class='uc row' id="+rowId+"></div>");
        //TODO add existing cols to this row >> USE HTML cat for speed!!!
        var allCols = board.cols;
        var colnum, firstnum = allCols.firstnum, lastnum = allCols.lastnum;
        for (colnum=firstnum; colnum <= lastnum; colnum++) {
            var col = allCols.bynum[colnum];
            board.newCell(this.code, colnum, this, col);
        }
    }

    Planboard.prototype.removeRow = function(row) {
    
        if (this.rows == null) { return; }
        
        var code = row.code;

        delete this.rows.bycode[code];
        this.rows.count--;
        
        // add visually
        row.$elm.remove();
        row.$row.remove();
        
        //resize
        this.rowHeadResize();
    }
    
    Planboard.prototype.rowHeadResize = function(row) {
        if (row) {
            var newCellWidth = row.$elm.width() + 1;
            var newWidth = Math.max(this.$west.width(), newCellWidth);
            this.$west.width(newWidth);
        }
        
        var newHeight = 1 + this.rows.count * (this.config.unitsize);
        this.$west.height(newHeight);
        this.$center.height(newHeight);
        this.reinitVerticalScrollBar();
    };
    
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
        Planboard.registerCellEvents(this, $cell, cellId, code, num);

        if (prepend) {
            row.$row.prepend($cell);
        } else {
            row.$row.append($cell);
        }
        col.$cells.add($cell); // don't do this in HTML production, instead add class-name with encoded datenum!
    }
    
    
    Planboard.prototype.initSize = function() {
        // release after resize
        this.$board.css('height',''); 
        this.$board.css('width','');  
        
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

        // fixing it to avoid jumping/flashing during resize
        this.$board.width(this.$board.width());
        this.$board.height(this.$board.height()); //fixing it for resize

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
        reinitBar(this.$cscroll, true);
        reinitBar(this.$nscroll, true);
    }
    Planboard.prototype.reinitVerticalScrollBar = function() {
        reinitBar(this.$cscroll);
        reinitBar(this.$wscroll);
    }
    
})(jQuery);
