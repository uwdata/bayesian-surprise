//Per State Unemployment from
//https://github.com/floswald/Rdata/

var data = {};
var surpriseData = {};
var minYear = 1981;
var maxYear = 1998;

var curYear = minYear;


//US States GeoJSON
var map;

var mapWidth = 500;
var mapHeight = 300;

var smallMapW = 200;
var smallMapH = 100;

var projection = d3.geo.albersUsa()
      .scale(500)
      .translate([mapWidth/2,mapHeight/2]);

var smallProj = d3.geo.albersUsa()
  .scale(200)
  .translate([smallMapW/2,smallMapH/2]);

var path = d3.geo.path().projection(projection);

var smallPath = d3.geo.path().projection(smallProj);

var rate = d3.scale.quantile()
    .domain([0, 12])
    .range(colorbrewer.RdPu[9]);

var surprise = d3.scale.quantile()
    .domain([-.02, .02])
    .range(colorbrewer.RdBu[11].reverse());

var diff = d3.scale.quantile()
  .domain([-12, 12])
  .range(colorbrewer.RdYlBu[9].reverse());

var belief = d3.scale.quantile()
.domain([-1, 1])
.range(colorbrewer.RdYlBu[9]);

var y = d3.scale.linear()
  .domain([0,1])
  .range([0,smallMapH]);

var x = d3.scale.linear()
  .domain([0, maxYear - minYear])
  .range([0, smallMapW]);


//1991 was a boom year
var boomYear = 1998 - minYear;

//1981 was a bust year
var bustYear = 1981 - minYear;

//assume no geographic pattern
var uniform = {};

//assume things will be like our boom year
var boom = {};

//asume things will be like our bust year
var bust = {};

d3.csv("../Code/data.csv", function(row){
   var rates = [];
   for(var i = minYear;i <= maxYear;i++){
     rates.push(+row[i.toString()]);
   }
   data[row.State] = rates;
   return;
  },
  function(done){
       d3.json("../Code/states.json", function(d){
               map = d;
               makeMaps();
       });

  }
);

function makeMaps(){

  calcSurprise();
  //Make both our density and surprise maps
  makeBigMap(rate,data, "Unemployment", "rates");
  makeBigMap(surprise, surpriseData, "Surprise", "surprise");

  makeSmallMap("uniformE", d3.select("#uniform"));
  makeSmallMap("uniformEO", d3.select("#uniform"));
  makeAreaChart(uniform.pM, "uniformB", d3.select("#uniform"));

  makeSmallMap("boomE", d3.select("#boom"));
  makeSmallMap("boomEO", d3.select("#boom"));
  makeAreaChart(boom.pM, "boomB", d3.select("#boom"));

  makeSmallMap("bustE", d3.select("#bust"));
  makeSmallMap("bustEO", d3.select("#bust"));
  makeAreaChart(bust.pM, "bustB", d3.select("#bust"));

  update();
}

function makeSmallMap(id, parent){
  var smallMap = parent.append("svg").attr("id", id);
  smallMap.selectAll("path")
    .data(map.features)
    .enter()
    .append("path")
    .attr("d", smallPath)
    .attr("fill", "#333");

}

function makeAreaChart(data, id, parent){
  var areaChart = parent.append("svg").attr("id", id);

  areaChart.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x",function(d,i){ return x(i);})
    .attr("y",function(d){ return smallMapH - y(d);})
    .attr("width",x(1) - x(0))
    .attr("height",function(d){ return y(d);})
    .attr("fill",function(d, i){ return belief(d); });
}

function makeBigMap(theScale, theData, theTitle, id){
  //Make a "big" map. Also merges given data with our map data
  var mainMap = d3.select("#main").append("svg")
  .attr("id", id).attr("height", mapHeight);

  mainMap.append("g").selectAll("path")
  .data(map.features)
  .enter()
  .append("path")
  .datum(function(d){ d[id] = theData[d.properties.NAME]; return d;})
  .attr("d",path)
  .attr("fill","#333")
  .append("svg:title")
  .text(function(d){ return d.properties.NAME; });

  var scale = mainMap.append("g");

  scale.append("text")
  .attr("x",mapWidth / 2)
  .attr("y", 15)
  .attr("font-family", "Futura")
  .attr("text-anchor", "middle")
  .attr("font-size", 12)
  .text(theTitle);

  var legend = scale.selectAll("rect")
  .data(theScale.range())
  .enter();

  legend.append("rect")
  .attr("stroke", "#fff")
  .attr("fill",function(d){ return d;})
  .attr("y", 35)
  .attr("x", function(d, i){ return mapWidth/2 - (45) + 10 * i; })
  .attr("width", 10)
  .attr("height", 10)

  legend.append("text")
  .attr("x",function(d, i){ return mapWidth / 2 - (40) + 10 * i; })
  .attr("y", 30)
  .attr("font-family", "Futura")
  .attr("text-anchor", "middle")
  .attr("font-size", 8)
  .text(function(d, i){
        var label = "";
        if(i == 0){
          label = d3.format(".2n")(theScale.invertExtent(d)[0]);
        }
        else if(i == theScale.range().length-1){

          label = d3.format(".2n")(theScale.invertExtent(d)[1]);
        }
        return label;
  });

   mainMap.selectAll("path")
   .attr("fill",function(d){ return theScale(d[id][curYear - minYear]);});
}

function update(){
  //Update our big maps, our difference maps, and model maps.
  curYear = +d3.select("#year").node().value;

  d3.select("#yearLabel").text(curYear);

  d3.select("#rates").selectAll("path")
  .attr("fill",function(d){ return rate(d.rates[curYear - minYear]);});

  d3.select("#surprise").selectAll("path")
  .attr("fill",function(d){ return surprise(d.surprise[curYear - minYear]);});

  var avg = average();
  d3.select("#uniformE").selectAll("path")
  .attr("fill",rate(avg));

  d3.select("#uniformEO").selectAll("path")
  .attr("fill",function(d){ return diff( d.rates[curYear - minYear] - avg);});

  d3.select("#boomE").selectAll("path")
  .attr("fill",function(d){ return rate(d.rates[boomYear]);});

  d3.select("#boomEO").selectAll("path")
  .attr("fill",function(d){ return diff(d.rates[curYear-minYear] - d.rates[boomYear]);});

  d3.select("#bustE").selectAll("path")
  .attr("fill", function(d){ return rate(d.rates[bustYear]);});

  d3.select("#bustEO").selectAll("path")
  .attr("fill", function(d){ return diff(d.rates[curYear - minYear] - d.rates[bustYear]);});

  d3.select("#uniformB").selectAll("rect")
  .attr("fill-opacity", function(d, i){ return i == (curYear - minYear) ? 1 : 0.3;});

  d3.select("#boomB").selectAll("rect")
  .attr("fill-opacity", function(d, i){ return i == (curYear-minYear) ? 1 : 0.3;});

  d3.select("#bustB").selectAll("rect")
  .attr("fill-opacity", function(d, i){ return i == (curYear-minYear) ? 1 : 0.3;});
}

function average(i){
  //Average unemployement for the current year.
  var index = i ? i : curYear - minYear;
  var sum = 0;
  var n = 0;
  for(var prop in data){
    sum+= data[prop][index];
    n++;
  }
  return sum / n;
}

function sumU(i){
  //Sum unemployement for the current year.
  var index = i ? i : curYear - minYear;
  var sum = 0;
  for(var prop in data){
    sum+= data[prop][index];
  }
  return sum;
}

function KL(pmd,pm){
  return pmd * (Math.log ( pmd / pm   ) / Math.log(2));
}

function maxSurprise(){
  var curM = 0;
  var sMax;
  for(var prop in surpriseData){
    sMax = Math.max.apply(null, surpriseData[prop]);
    curM = sMax>curM ? sMax : curM;
  }
  return curM;
}

function makeRandom(){
  //Random fake data in [-1,1]
  var randData = {};
  for(var prop in data){
    randData[prop] = [];
    for(var i = 0;i <= maxYear - minYear;i++){
      randData[prop][i] = Math.random()>0.5 ? -1 * Math.random() : Math.random();
    }
  }
  return randData;
}

function calcSurprise(){


  for(var prop in data){
    surpriseData[prop] = [];
    for(var i = 0;i<maxYear - minYear;i++){
      surpriseData[prop][i] = 0;
    }
  }
  // Start with equiprobably P(M)s
  // For each year:
  // Calculate observed-expected
  // Estimate P(D|M)
  // Estimate P(M|D)
  // Surprise is D_KL ( P(M|D) || P(M) )
  // Normalize so sum P(M)s = 1

  //0 = uniform, 1 = boom, 2 = bust

  //Initially, everything is equiprobable.
  var pMs =[(1/3), (1/3), (1/3)];

  uniform.pM = [pMs[0]];
  boom.pM = [pMs[1]];
  bust.pM = [pMs[2]];

  var pDMs = [];
  var pMDs = [];
  var avg;
  var total;
  //Bayesian surprise is the KL divergence from prior to posterior
  var kl;
  var diffs = [0, 0, 0];
  var sumDiffs = [0, 0, 0];
  for(var i = 0;i<=maxYear - minYear;i++){
    sumDiffs = [0, 0, 0];
    avg = average(i);
    total = sumU(i);
    //Calculate per state surprise
    for(var prop in data){

      //Estimate P(D|M) as 1 - |O - E|
      //uniform
      diffs[0] = ((data[prop][i] / total) - (avg / total));
      pDMs[0] = 1 - Math.abs(diffs[0]);
      //boom
      diffs[1] = ((data[prop][i] / total) - (data[prop][boomYear] / total));
      pDMs[1] = 1 - Math.abs(diffs[1]);
      //bust
      diffs[2] = ((data[prop][i] / total) - (data[prop][bustYear] / total));
      pDMs[2] = 1 - Math.abs(diffs[2]);

      //Estimate P(M|D)
      //uniform
      pMDs[0] = pMs[0] * pDMs[0];
      pMDs[1] = pMs[1] * pDMs[1];
      pMDs[2] = pMs[2] * pDMs[2];

      // Surprise is the sum of KL divergance across model space
      // Each model also gets a weighted "vote" on what the sign should be
      kl = 0;
      var voteSum = 0;
      for(var j = 0;j < pMDs.length;j++){
        kl+= pMDs[j] * (Math.log( pMDs[j] / pMs[j]) / Math.log(2));
        voteSum += diffs[j] * pMs[j];
        sumDiffs[j]+= Math.abs(diffs[j]);
      }

      surpriseData[prop][i] = voteSum >= 0 ? Math.abs(kl) : -1*Math.abs(kl);
    }

    //Now lets globally update our model belief.

    for(var j = 0;j < pMs.length;j++){
      pDMs[j] = 1 - (0.5 * sumDiffs[j]);
      pMDs[j] = pMs[j] * pDMs[j];
      pMs[j] = pMDs[j];
    }

    //Normalize
    var sum = pMs.reduce(function(a, b) { return a + b; }, 0);
    for(var j = 0;j < pMs.length;j++){
      pMs[j] /= sum;
    }

    uniform.pM.push(pMs[0]);
    boom.pM.push(pMs[1]);
    bust.pM.push(pMs[2]);
  }
}
