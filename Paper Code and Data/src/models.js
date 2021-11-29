/****************************
* Continuous Spatial Models *
*****************************/

//var defaultRamp = colorbrewer.RdYlBu[11].reverse();
var defaultRamp = colorbrewer.RdBu[11].reverse();

function Spatial(resolution,colorramp){
  this.resolution = resolution ? resolution : 10;
  this.ramp = colorramp ? colorramp : defaultRamp;//(colorbrewer.RdYlGn[11]).reverse();
  this.map = new Heatmap(this.resolution,this.ramp);
  this.map.min = -1;
  this.map.max = 1;
  this.pm = 0.5;
  this.name = "Default";
  this.update = function(observed){
    //observed is a heatmap
    var diff;
    var sum = 0;
    for(var i = 0;i<this.map.values.length;i++){
      for(var j=0;j<this.map.values[i].length;j++){
        diff = observed.get(i,j)-this.expected(i,j);
        this.map.set(i,j,diff);
        sum+= abs(diff);//max(diff,0);//abs(diff);
      }
    }
    this.needsUpdate = true;
    return sum/(this.resolution*this.resolution);
  };
  this.get = function(x,y,observed){
    //observed is a point density
    return observed - this.map.getxy(x,y);
  }
  this.draw = function(x,y,w,h){
    this.map.draw(x,y,w,h);
    var fillC = colorbrewer.YlOrRd[9][floor(map(this.pm,0,1,0,8))];
    stroke(fillC);
    fill(0,0);
    rect(x,y,w-1,h-1);
    /*
    stroke(255);
    fill(0);
    text(this.name,x+2,y+12);
    */
  };
  this.expected = function(i,j){
    return 0;
  };
};

//Assume density is spatially uniform
function Uniform(resolution,colorramp){
  Spatial.apply(this,[resolution,colorramp]);
  this.name = "Uniform";
  this.expected = function(i,j){
    //assume uniform density
    return 0.5;
  };
};

//Assume density follows a gaussian pattern
function Gaussian(mu,sigma,resolution,colorramp){
  Spatial.apply(this,[resolution,colorramp]);
  this.name = "Gaussian";
  this.mu = {};
  if(mu && dl.isNumber(mu)){
    this.mu.x = mu;
    this.mu.y = mu;
  }
  else{
    this.mu.x = mu.x ? mu.x : 0.5;
    this.mu.y = mu.y ? mu.y : 0.5;
  }
  
  this.sigma = {};
  if(sigma && dl.isNumber(sigma)){
    this.sigma.x = sigma;
    this.sigma.y = sigma;
  }
  else{
    this.sigma.x = sigma.x ? sigma.x : 1;
    this.sigma.y = sigma.y ? sigma.y : 1;
  }
  
  this.gaussX = dl.random.normal(0,this.sigma.x);
  this.gaussY = dl.random.normal(0,this.sigma.y);
  
  this.expected = function(i,j){
    var x,y;
    y = 1 - j/this.resolution;
    x = i/this.resolution;
    
    return (this.gaussX.pdf(x-this.mu.x)*this.gaussY.pdf(y-this.mu.y)) / (this.gaussY.pdf(0)*this.gaussX.pdf(0));
    //return 0;
  };
  
  this.set = function(mu,sigma){
    if(mu && dl.isNumber(mu)){
      this.mu.x = mu;
      this.mu.y = mu;
    }
    else{
      this.mu.x = mu.x ? mu.x : 0.5;
      this.mu.y = mu.y ? mu.y : 0.5;
    }
    
    if(sigma && dl.isNumber(sigma)){
      this.sigma.x = sigma;
      this.sigma.y = sigma;
    }
    else{
      this.sigma.x = sigma.x ? sigma.x : 1;
      this.sigma.y = sigma.y ? sigma.y : 1;
    }
  };
};

//Use observed density as a model for future density
function KDEModel(kde,colorramp){
  var ramp = colorramp ? colorramp : kde.ramp;
  Spatial.apply(this,[kde.resolution],[ramp]);
  this.kde = kde;
  this.expected = function(i,j){
    return this.kde.get(i,j);
  }
};

/***************************************
* Choropleth (Discrete Spatial) Models *
****************************************/

//Assumes we have a list of categories with an id column, a count column, and a rate column.
function DiscreteSpatial(data,idcol,countcol,ratecol,popcol,colorramp){
  this.pm = 0.5;
  this.ramp = colorramp ? colorramp : defaultRamp;
  this.name="Default";
  this.min = 0;
  this.data = data;
  this.id = idcol ? idcol : "id";
  this.count = countcol ? countcol : "count";
  this.rate = ratecol ? ratecol : "rate";
  this.pop = popcol ? popcol : "population";
  if(!ratecol){
    var sum = dl.sum(data,this.count);
    for(var i = 0;i<this.data.length;i++){
      this.data[i]["rate"] = popcol ? this.data[i][this.count] / this.data[i][this.popcol] : this.data[i][this.count]/sum;
    }
  }
  this.max = dl.max(data,this.rate);
  this.getColor = function(val){
    var vColor;
    if(this.min==this.max){
      vColor =  color(this.ramp[0]);
    }
    else{
      var index = floor(map(val,this.min,this.max,0,this.ramp.length-1));
      var remainder = map(val,this.min,this.max,0,this.ramp.length-1)-index;
      if(index>=this.ramp.length-1){
        vColor =  color(this.ramp[this.ramp.length-1]);
      }
      else{
        vColor = lerpColor(color(this.ramp[index]),color(this.ramp[index+1]),remainder);
      }
    }
    return vColor;
  };
  
  this.expected = function(){
    return 0;
  };
  
  this.get = function(i){
    return this.data[i][this.rate];
  };
  
  this.draw = function(x,y,w,h){
    var fillC = colorbrewer.YlOrRd[9][floor(map(this.pm,0,1,0,8))];
    stroke(fillC);
    fill(0,0);
    rect(x,y,w-1,h-1);
    stroke(0);
    var dx,dy;
    for(var i = 0;i<this.data.length;i++){
      dx = map(i,0,this.data.length,0,w);
      dy = map(this.data[i][this.rate],this.min,this.max,h,0);
      fillC = this.getColor(data[i][this.rate]);
      fill(fillC);
      ellipse(x+dx,y+dy,10,10);
    }
  };
}

function DiscreteUniform(data,idcol,countcol,ratecol,popcol,colorramp){
  DiscreteSpatial.apply(this,[data,idcol,countcol,ratecol,popcol,colorramp]);
  this.mean = dl.mean(this.data,this.rate);
  this.expected = function(){
    return this.mean;
  };
}

function deMoivre(data,idcol,countcol,ratecol,popcol,colorramp){
  DiscreteSpatial.apply(this,[data,idcol,countcol,ratecol,popcol,colorramp]);
  this.mean = dl.mean(this.data,this.rate);
  this.stddev = dl.stdev(this.data,this.rate);
  this.maxN = dl.max(this.data,this.pop);
  this.minN = dl.min(this.data,this.pop);
  this.sumN = dl.sum(this.data,this.pop);
  for(var i = 0;i<this.data.length;i++){
    this.data[i].z = (this.data[i][this.rate]-this.mean) / this.stddev;
  }
  this.maxZ = max(abs(dl.min(this.data,'z')),dl.max(this.data,'z'));
  this.draw = function(x,y,w,h){
    //draw model belief box
    var fillC = colorbrewer.YlOrRd[9][floor(map(this.pm,0,1,0,8))];
    stroke(fillC);
    fill(0,0);
    rect(x,y,w-1,h-1);
    
    //draw funnel
    stroke(0,64);
    var n,ci;
    for(var i = 0;i<w;i++){
      //critical statistic is z = 1.96, for a 95% z-c.i.
      n = map(i,0,w,this.minN,this.maxN)/this.sumN;
      ci = 1.96 * (this.stddev/sqrt(n));
      dy = map(ci,0,this.maxZ,h/2,0);
      line(i+x,y+ h/2,i+x,y + dy);
      line(i+x,y+ h/2,i+x,y + h - dy);
      //line(i+x,y + h/2,i+x,y -dy);
    }
    
    //draw line for mean
    stroke(0);
    strokeWeight(2);
    line(x,y + (h/2),x+w,y + h/2);
    //draw funnel points
    noStroke();
    var dx,dy;
    for(var i = 0;i<this.data.length;i++){
      dx = map(this.data[i][this.pop],this.minN,this.maxN,0,w);
      if(this.data[i].z>=0){
        dy = map(this.data[i].z,0,this.maxZ,h/2,0);
      }
      else{
        dy = map(this.data[i].z,0,-this.maxZ,h/2,h);
      }
      fillC = this.getColor(data[i][this.rate]);
      fill(fillC,64);
      ellipse(x+dx,y+dy,10,10);
      if(abs(this.data[i].z)>(3.92* (this.stddev/ sqrt(this.data[i][this.pop]/this.sumN)))){
        fill(0);
        var textX = x+dx;
        var textY = y+dy+14;
        if(textX>=x+w){
          textX-= textWidth(this.data[i][this.id]);
        }
        //text(this.data[i][this.id],textX,textY);
      }
    }
    
  };
}