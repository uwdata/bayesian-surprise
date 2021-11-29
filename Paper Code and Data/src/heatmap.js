function initializeGrid(resolution,value){
  var grid = new Array(resolution);
  for(var i = 0;i<resolution;i++){
    grid[i] = new Array(resolution);
    for(var j = 0;j<resolution;j++){
      grid[i][j] = value? value : 0;
    }
  }
  return grid;
}

function maxGrid(anArray){
  var max = anArray[0][0];
  for(var i = 0;i<anArray.length;i++){
    for(var j = 0;j<anArray[i].length;j++){
      if(max<anArray[i][j]){
        max = anArray[i][j];
      }
    }
  }
  return max;
}

function minGrid(anArray){
  var min = anArray[0][0];
  for(var i = 0;i<anArray.length;i++){
    for(var j = 0;j<anArray[i].length;j++){
      if(min>anArray[i][j]){
        min = anArray[i][j];
      }
    }
  }
  return min;
}


function Heatmap(resolution,colorramp,anArray){
  this.resolution = resolution ? resolution : 10;
  this.values = anArray ? anArray : initializeGrid(resolution);
  this.ramp = colorramp ? colorramp : colorbrewer.RdPu[9];
  this.max = anArray ? maxGrid(anArray) : 0;
  this.min = anArray ? minGrid(anArray) : 0;
  this.needsUpdate = true;
  this.get = function(i,j){
    return (this.values[i][j]-this.min)/this.max;
  };
  this.getxy = function(x,y){
    var i = floor(map(x,0,1,0,resolution-1));
    var j = floor(map(y,0,1,resolution-1,0));
    return this.get(i,j);
  };
  this.set = function(i,j,value){
    this.values[i][j] = value;
    if(value>this.max){
      this.max = value;
    }
    if(value<this.min){
      this.min = value;
    }
    this.needsUpdate = true;
  };
  this.setAll = function(values,updateBounds){
    this.values = values;
    if(updateBounds){
      this.min = minGrid(values);
      this.max = maxGrid(values);
    }
    this.resolution = values.length;
    this.needsUpdate = true;
  };
  this.push = function(x,y){
    if(x<0 || x>1 || y<0 || y>1){
      return;
    }
    var i = floor(map(x,0,1,0,resolution-1));
    var j = floor(map(y,0,1,resolution-1,0));
    this.values[i][j]++;
    if(this.values[i][j]>this.max){
      this.max = this.values[i][j];
    }
    if(this.values[i][j]<this.min){
      this.min = this.values[i][j];
    }
    this.needsUpdate = true;
  };
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
  this.updateMap = function(){
    if(!this.canvas){
      this.canvas = createGraphics(pixelDensity()*this.resolution,pixelDensity()*this.resolution);
    }
    this.canvas.loadPixels();
    this.canvas.background(255,0,0);
    for(var i = 0;i<this.values.length;i++){
      for(var j = 0;j<this.values[i].length;j++){
        this.canvas.set(i,j,this.getColor(this.values[i][j]));
      }
    }
    this.canvas.updatePixels();
    this.needsUpdate = false;
  };
  this.draw = function(x,y,w,h){
    if(this.needsUpdate){
      this.updateMap();
    }
    image(this.canvas,0,0,this.canvas.width,this.canvas.height,x,y,w,h);
  };
  
}


function KDE(sigma,resolution,colorramp,anArray){
  Heatmap.apply(this,[resolution,colorramp,anArray]);
  this.kernel = dl.random.normal(0,sigma);
  this.push = function(x,y){
    if(x<0 || x>1 || y<0 || y>1){
      return;
    }
    var dist,x1,y1;
    for(var i = 0;i<this.values.length;i++){
      for(var j = 0;j<this.values[i].length;j++){
        y1 = map(j,0,this.values[i].length,1,0);
        x1 = map(i,0,this.values.length,0,1);
        dist = sqrt( sq(x-x1) + sq(y-y1) );
        this.values[i][j] += this.kernel.pdf(dist) / this.kernel.pdf(0);
        if(this.values[i][j] > this.max){
          this.max = this.values[i][j];
        }
        if(this.values[i][j] < this.min){
          this.min = this.values[i][j];
        }
      }
    }
    this.needsUpdate = true;
  };
};


