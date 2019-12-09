var url = "https://en.wikipedia.org/w/api.php"; 

var params = {
    action:  "parse",
    page:    "List_of_FIFA_World_Cup_goalscorers",
    format:  "json",
    section: 1
};

url = url + "?origin=*";
Object.keys(params).forEach(function(key){url += "&" + key + "=" + params[key];});

function parseData( response ){
    let dom = d3.select("body")
        .append("div")
        //.attr("display", "hidden")
    ;
    dom.html( response.parse.text["*"] );
    let tables = dom.selectAll("table");
    tables.each( d => {
        console.log(d);
    })
}

fetch(url)
    .then(function(response){return response.json();})
    .then( parseData )
    .catch(function(error){console.log(error);});



