function loadData(){
    const data = {};
    /**
     * Load data from wikipedia 
     * return a promise
     */
    function loadWiki( params ){
        const wikiApi = "https://en.wikipedia.org/w/api.php";

        //additional params
        params.format = "json";
        params.maxage = 60*60*24;
        params.action = "parse";

        let url = wikiApi + "?origin=*";
        Object.keys(params).forEach(function(key){url += "&" + key + "=" + params[key];});


        return fetch(url)
            .then( response => response.json() )
            .then( response => response.parse.text["*"])
            .then( txt      => txt.replace(/ src/g, ' _src') );
    }

    /**
     * return an objects of structure:
     * country : {
     *    year : {              (year when the country participated in WC)
     *      player   : #scores  (score of player)
     *      "_total" : #socres  (total scores of the country in this year)
     *    }
     *    "_img" : image source 
     * } 
     */
    function parseText( txt ){
        const content  = d3.select("body").append("div").style("display", "none").html( txt );
        const tables   = content.selectAll("table");
        const data = {};
        tables.each( function(){
            //get country information
            const h3 = d3.select(this.parentNode).select("h3");
            if( h3 == undefined )
                return;
            const country = h3.select("a").text();
            const imgSrc  = h3.select("img").attr("_src");

            console.log( country, imgSrc );

            const obj = { _img: imgSrc }
            //get table
            const table = d3.select( this );
            const trs   = table.selectAll("tr");
            const header= [];

            trs.each( function(d,i){
                switch( i ){
                //first tr is header
                case 0:
                    d3.select(this).selectAll("th").each( function(){
                        header.push( this.textContent.trim() );
                    });
                    break;

                //jump over the second tr: it is sub header
                case 1:
                    break;

                default:
                    let player = ""
                    //each immediate child node
                    const children = this.children;

                    for( var j=0; j<children.length; j++){
                        const txt = children[j].textContent;
                        if( txt == undefined || txt.length == 0 )
                            continue; 
                        switch( j ){
                            //first td is player's name
                            case 0:
                                player = txt.trim();
                                if( player == "Total")
                                    player = "_total";

                                obj[ player ] = {};
                                break;
                            //jump over the second td as this is total scores of the player
                            case 1:
                                break;
                            default:
                                const year   = header[j];
                                const scores = parseInt( txt );
                                if( scores > 0 )
                                    obj[player][year] = scores;
                        }
                    }
                }
            });

            console.log( obj );

            data[ country ] = obj;
        });

        content.remove();
        return data;
    }

    /**
     * Parse host countries
     * return an object: {
     *   year : {
     *     "_host" : country
     *     "_logo" :
     *   }   
     * }
     */
    function parseHosts( txt ){

        const content  = d3.select("body").append("div")
                            //.style("display", "none")
                            .html( txt );
        const table = content.select("table");


        //return a promise to get source of the main image of a page
        function _loadLogo( data){
            const ret = loadWiki( {
                page    : data._pageId,
                section : 0
            })
            .then( txt => {
                const content  = d3.select("body").append("div")
                            .style("display", "none")
                            .html( txt );
                const img = content.select("table").select("img");

                if( img.empty() )
                    data = undefined;
                else
                    data._logo = img.attr("_src");

                //remove DOM from body
                content.remove();
                return data;
            });
            return ret;
        }

        const allPromises = [];

        table.selectAll("tr").each(function(d, i){
            if( allPromises.length >=3 )
                return;
            //ignore header
            if( i == 0 ) return;
            const tds = this.children;

            const yearHref = d3.select(tds[0]).select("a");
            //No link, e.g., Canncelled because of WW II
            if( yearHref.empty() )
                return;


            const host = tds[1].textContent.trim();
            if( host == "TBD" )
                return;

            const year = yearHref.text().trim();
            const detailPage = yearHref.attr("href"); ///wiki/1930_FIFA_World_Cup
            const pageId = detailPage.substring(detailPage.lastIndexOf('/') + 1); //1930_FIFA_World_Cup

            allPromises.push( _loadLogo({_pageId: pageId, _year: year, _host: host} ));
            //console.log( year, host, detailPage );
        });

        const ret = Promise.all( allPromises )
            .then( arr => {
                const data  = {};
                arr.forEach( e => {
                    if( e ) 
                        data[e._year] = e 
                });
                console.data;
                return data;
            });

        content.remove();
        return ret;
    }

    function loadHosts(){
        //parse host countries
        return loadWiki( {
            //page   : "FIFA_World_Cup_hosts",
            section: 1,
            //Parse the content of this revision. Overrides page and pageid.
            oldid  : 920233381, //Latest revision as of 14:08, 12 November 2019
        })
        .then( parseHosts )
        .then( hosts  => { data.hosts = hosts; return data; })
    }

    //parse data of scores by country by year
    return loadWiki( {
            //page   : "List_of_FIFA_World_Cup_goalscorers",
            section: 3,
            //Parse the content of this revision. Overrides page and pageid.
            oldid  : 925902747, //Latest revision as of 01:15, 13 November 2019
        })
        .then( parseText )
        .then( scores  => data.scores = scores )
        .then( loadHosts )
        .then( function(){ return data } );
}


loadData().then( console.log );