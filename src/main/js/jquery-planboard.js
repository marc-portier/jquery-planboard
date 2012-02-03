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
        jScrollPane: {showArrows: true},
        northScrollHeight: "65px",
        westScrollWidth: "65px",
        datenames: ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"]
    }
    

    Planboard.prototype.init = function() {
        this.$nw=$("<div class='north west'      >nw                   </div>");
        this.$nm=$("<div class='north meridian'  ></div>");
        this.$ne=$("<div class='north east'      >ne                   </div>");
        this.$NO=$([]).add(this.$nw).add(this.$nm).add(this.$ne);

        this.$ew=$("<div class='equator west'    ></div>");
        this.$em=$("<div class='equator meridian'></div>");
        this.$ee=$("<div class='equator east'    >east                 </div>");
        this.$EQ=$([]).add(this.$ew).add(this.$em).add(this.$ee);

        this.$sw=$("<div class='south west'      >sw                   </div>");
        this.$sm=$("<div class='south meridian'  >south <br/> meridian </div>");
        this.$se=$("<div class='south east'      >se                   </div>");
        this.$SO=$([]).add(this.$sw).add(this.$sm).add(this.$se);

        // initialise north
        this.$nruler =$("<div class='uc'></div>");
        this.$nscroll=$("<div style='width=100%; overflow:auto;'></div>");
        this.$nscroll.height(this.config.northScrollHeight);
        this.$nscroll.append(this.$nruler).jScrollPane(this.config.jScrollPane);
        this.$nm.append(this.$nscroll);
        
        // initialise west
        this.$wruler =$("<div class='uc'></div>");
        this.$wscroll=$("<div style='overflow:auto;'></div>");
        this.$wscroll.width(this.config.westScrollWidth);
        this.$wscroll.append(this.$wruler).jScrollPane(this.config.jScrollPane);
        this.$ew.append(this.$wscroll);
        
        //initialise center
        this.$center =$("<div></div>").css("overflow", "hidden");
        //Todo: need to wrap inside a scrollable?
        this.$em.append(this.$center);
        
        
        this.$WE=$([]).add(this.$nw).add(this.$ew).add(this.$sw);
        this.$ME=$([]).add(this.$nm).add(this.$em).add(this.$sm);
        this.$EA=$([]).add(this.$ne).add(this.$ee).add(this.$se);

        this.$board.addClass("planboard").html("")
            .append(this.$NO).append(this.$EQ).append(this.$SO);

        // add some cols & rows (callback and or default)
        this.initCells();

        // size up and redo that upon resize
        this.initSize();
        
        var me = this;
        $(window).resize(function(){me.initSize()});
    }


    Planboard.prototype.initCells = function() {
    
        // todo call ajax for this...
        
        var num = 35;
        var codes = 32;
        
        //appendCols
        var i=0; 
        for (i=0; i<num; i++) {
            this.appendCol();
        }
        //append-prependRow or just insertRow(position)
        for (i=1; i<codes+1; i++) {
            var pfx = i<10 ? "0" : "";
            this.appendRow("VE " + pfx + i);
        }
        //appendCols again for testing
        for (i=0; i<7; i++) {
            this.appendCol();
        }
    };
    
    
    Planboard.offsetDate = function(offset, date) {

        offset = offset || -7;
        date = date || new Date();
        
        var od = new Date(date.getTime());
        od.setDate(date.getDate() + offset);
        return od; 
    }
    
    
    Planboard.dateNum = function(date) {

        return (((date.getFullYear() * 100) + date.getMonth() + 1) * 100) + date.getDate();
    }
    
    
    Planboard.prototype.appendCol = function() {
        if (this.cols == null) {
            this.cols = [];
            this.cols.bynum={};
        }
        
        var last = this.cols[this.cols.length -1];
        var newDate;
        if (!last) {
            newDate =  Planboard.offsetDate();
        } else {
            var lastDate = this.cols.bynum[last].date;
            newDate = Planboard.offsetDate(1, lastDate);
        }
        
        // add logically
        var newCol = new PlanColumn(newDate, this);
        
        // add visually
        this.$nruler.append(newCol.$elm).height();
        
        //resize
        var newCellHeight = newCol.$elm.height() + 1;
        var newHeight = Math.max(this.$nruler.height(), newCellHeight);
        this.$nruler.height(newHeight);
        
        var newWidth =  this.cols.length * (1+newCol.$elm.width());
        this.$nruler.width(newWidth);
        this.$center.width(newWidth +1);
        
        this.reinitHorizontalScrollBar();
    };
    
    function PlanColumn(date, board) {
        var allCols   = board.cols;
        var datenames = board.config.datenames;
        
        this.date     = date;
        this.datenum  = Planboard.dateNum(this.date);
        this.label    = datenames[date.getDay()] + " " + date.getDate() + "/" + (date.getMonth()+1);
        this.$elm     = $("<div class='u w'>"+this.label+"</div>").data("datenum", this.datenum);
        this.$cells   = $([]);
        
        // hookup to the planboard structure
        allCols.push(this.datenum);
        allCols.bynum[this.datenum]=this;

        //TODO add this col to existing rows!
        var allRows = board.rows;
        var code;
        for (code in allRows) {
            var row = allRows[code];
            
            newCell(row.code, this.datenum, row, this);
        }
    }
        
    Planboard.prototype.appendRow = function(code) {
        if (this.rows == null) {
            this.rows={};
            this.rowcount=0;
        }
        var newRow = this.rows[code];
        if (newRow) {  // already exists! 
            return;
        } 
        
        // add logically
        newRow = new PlanRow(code, this);
        
        // add visually
        this.$wruler.append(newRow.$elm);
        this.$center.append(newRow.$row);
        
        //resize
        var newCellWidth = newRow.$elm.width() + 1;
        var newWidth = Math.max(this.$wruler.width(), newCellWidth);
        this.$wruler.width(newWidth);
        
        var newHeight = this.rowcount * (1+newRow.$elm.height());
        this.$wruler.height(newHeight);
        this.$center.height(newHeight + 1);
        this.reinitVerticalScrollBar();
    };
    
    function PlanRow(code, board) {
        var allRows   = board.rows;
        
        this.code     = code; //TODO maybe strip spaces?
        this.label    = code;
        this.$elm     = $("<div class='u h'>"+this.label+"</div>").data("code", this.code);
        
        // hookup to the planboard structure
        allRows[code]=this;
        board.rowcount++;
        
        this.$row     = $("<div class='uc'></div>");
        //TODO add existing cols to this row
        var allCols = board.cols;
        var i=0, numCols = allCols.length;
        for (i=0; i<numCols; i++) {
            var colnum = allCols[i];
            var col = allCols.bynum[colnum];
            
            newCell(this.code, colnum, this, col);
        }
    }
    
    function newCell(code, num, row, col, prepend) {
        prepend = prepend || false;
        
        var $cell = $("<div class='u h w'>&nbsp;</div>").data("code", code).data("num", num);
        if (prepend) {
            row.$row.prepend($cell);
        } else {
            row.$row.append($cell);
        }
        col.$cells.add($cell);
    }
    
    Planboard.prototype.initSize = function() {
       var noHeight = Math.max.apply(Math, this.$NO.map(function(){return $(this).height();}).get());
       var soHeight = Math.max.apply(Math, this.$SO.map(function(){return $(this).height();}).get());
       var eqHeight = this.$board.height() - (noHeight + soHeight);
       this.$NO.height(noHeight);
       this.$SO.height(soHeight);
       this.$EQ.height(eqHeight);
       this.$wscroll.height(eqHeight -1);
       
       var weWidth = Math.max.apply(Math, this.$WE.map(function(){return $(this).width();}).get());
       var eaWidth = Math.max.apply(Math, this.$EA.map(function(){return $(this).width();}).get());
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
        reinitBar(this.$nscroll);
    }
    Planboard.prototype.reinitVerticalScrollBar = function() {
        reinitBar(this.$wscroll);
    }
    
})(jQuery);
