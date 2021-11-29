/*******************
* Global Variables *
********************/

var kde = new KDE(0.05,100);
var uniform = new Uniform(100);
var gauss = new Gaussian(0.5,0.25,100);
var kdeModel;

var surpriseH = new Histogram([],colorbrewer.YlOrRd[9]);
var surpriseM = new Heatmap(100,defaultRamp);

var maxS = 0;

var events = [];
/******************
* p5 Core Methods *
*******************/

function preload(){
}

function setup(){
  pixelDensity(displayDensity());
  createCanvas(1500,1000);
  background(255);
  gaussData();
  //quakeData();
  //fireData();
  //drawFunnel();
  noLoop();

}

function draw(){
}

function mainGlyph(models,x,y,w,kde,img){
  
  /*
  top 2 rows: the signed surprise map, and the kde map, side by side
   
  bottom row: diff map for each model.
  */
  var ratio = img ? img.width/img.height : 1;
  
  if(ratio>1){
    w = w/ratio;
  }
  
  surpriseM.draw(x,y,((w*ratio)/2)-5,(w/2)-5);
  if(img){
    tint(255,64);
    image(img,x,y,((w*ratio)/2)-5,(w/2)-5);
  }
  
  kde.draw(x+((w*ratio)/2),y,((w*ratio)/2)-5,(w/2)-5);
  
  var mw = w/(2*models.length);
  for(i = 0;i<models.length;i++){
     models[i].draw(x + (i*2*mw) + (mw/2)+ 5,y+w - (2*mw) + 5, mw-10,mw-10);
  }
}

function windowResized(){
  //resizeCanvas(windowWidth-20,windowHeight-20);
  //redraw();
}


function surpriseMap(models,observed,unsigned){
  //Creates a map of surprising event densities, by weighting the density by the surprise of the density
  
  var sValues = initializeGrid(surpriseM.resolution);
  //probability of data, given model
  var pdms;
  
  //probability of model, given data
  var pmds;
  
  var diff;
  var total;
  var kl;
  for(var i = 0;i<sValues.length;i++){
    for(var j = 0;j<sValues[i].length;j++){
      pdms = [];
      pmds = [];
      for(var k = 0;k<models.length;k++){
        diff = observed.get(i,j)-models[k].expected(i,j); //max(observed.get(i,j)-models[k].expected(i,j),0);
        pdms.push(1 - abs(diff));
      }
      
      kl = 0;
      for(var k = 0;k<models.length;k++){
        pmds.push ( models[k].pm * pdms[k] );
        //pmds.push( models[k].pm*(pdms[k]/dl.sum(pdms)));
        kl+= pmds[k] * (log ( pmds[k] / models[k].pm)/log(2));
      }
      if(abs(kl)>maxS){
        maxS = abs(kl);
        surpriseM.min = -1*maxS;
        surpriseM.max = maxS;
      }
      sValues[i][j] = (diff>0||unsigned) ? abs(kl) : -1*abs(kl);
    }
  }
  surpriseM.setAll(sValues,false);
};

function surprise(models,observed){
  //probability of data, given model
  var pdms = [];
  //prior probability of model
  var pms = [];
  //probability of model, given data
  var pmds = [];
  
  for(var i = 0;i<models.length;i++){
    pms.push(models[i].pm);
    pdms.push(1 - models[i].update(observed));
    pmds.push(pms[i]*pdms[i]);
  }
  
  //normalize, as sum(probs) must = 1
  var total = dl.sum(pmds);
  for(var i = 0;i<models.length;i++){
    models[i].pm = total!=0 ? (pmds[i]/total) : 1/models.length;
    pmds[i]/= total;
  }
  
  //we now have our two distributions, and so can compute KL diverg.
  var kl = 0;
  for(var i = 0;i<pmds.length;i++){
    kl+= pmds[i] * (log ( pmds[i] / pms[i] )/log(2));
  }
  surpriseH.push(kl);
}

function loadData(file,X,Y,imageFile){
  dl.csv(file,function(err,data){
         if(err){
         console.log(err);
         }
         else{
           data.X = X;
           data.Y = Y;
           
           data.min = {x: dl.min(data,X), y: dl.min(data,Y)};
           data.max = {x: dl.max(data,X), y: dl.max(data,Y)};
           data.mean = {x: dl.mean(data,X), y: dl.mean(data,Y)};
           data.sigma = {x: dl.stdev(data,X), y: dl.stdev(data,Y)};
           if(imageFile){
            loadImage(imageFile,function(img){
                      fullMap(data,img);
            });
           }
           else{
             fullMap(data);
           }
         }
  });
}

function quakeData(){
  loadData("data/quakes2.csv","lat","long","data/quakes.png");
}

function fireData(){
  loadData("data/fires2.csv","X","Y","data/fires.png");
}

function gaussData(){
  var n = 250;
  var data = [];
  for(var i = 0;i<n;i++){
    data.push({x: constrain(randomGaussian(0.5,0.25),0,1), y: constrain(randomGaussian(0.5,0.25),0,1)});
  }
  data.X = "x";
  data.Y = "y";
  data.min = {x:0,y:0};
  data.max = {x:1,y:1};
  data.mean = {x:0.5,y:0.5};
  data.sigma = {x:0.25,y:0.25};
  fullMap(data);
}

function fullMap(data,img){
  //Draws:
  // A surprise map 3 times over the course of the data
  // Difference maps (observed-expected) for each model, 3 times
  // A KDE (event density) map 10 times
  // A histogram of p(M|D) for each model, updated every 5 ticks
  // A histogram of average surprise, updated every 5 ticks
  events = [];
  var n = data.length;
  var uP,gP,sumP,surP;
  var gDiff = [];
  var uDiff = [];
  var dw = width/10;
  var dx = dw/8;
  var eX,eY;
  
  var mapX = function(x){
    return map(x,data.min.x,data.max.x,0,1);
  };
  
  var mapY = function(y){
    return map(y,data.min.y,data.max.y,0,1);
  };
  
  gauss.set(
              {x: mapX(data.mean.x), y: mapY(data.mean.y)},
              {x: map(data.sigma.x,0,abs(data.max.x-data.min.x),0,1), y: map(data.sigma.y,0,abs(data.max.y-data.min.y),0,1)},
              100
  );
  
  var firstN = new KDE(0.05,100);
  for(var i = 0;i<25;i++){
    eX = mapX(data[i][data.X]);
    eY = mapY(data[i][data.Y]);
    firstN.push(eX,eY);
  }
  
  var bModels = [];
  var bKDES = [];
  var bootstrap = dl.random.bootstrap(dl.range(0,data.length));
  var index;
  for(var j = 0;j<5;j++){
    bKDES.push(new KDE(0.05,100));
    for(var i = 0;i<50;i++){
      index = bootstrap();
      eX = mapX(data[index][data.X]);
      eY = mapY(data[index][data.Y]);
      bKDES[j].push(eX,eY);
    }
    bModels.push(new KDEModel(bKDES[j]));
  }
  
  kdeModel = new KDEModel(firstN);
  
  var allModels =
  //[uniform,gauss,kdeModel];
  [uniform,gauss];
  //bModels;
  
  var hists = [];
  for(var i = 0;i<allModels.length;i++){
    allModels[i].pm = 1/allModels.length;
    hists.push(new Histogram());
    hists[i].min = 0;
  }
  
  for( var i = 0;i<n;i++){
    eX = mapX(data[i][data.X]);
    eY = mapY(data[i][data.Y]);
    events.push({"x": eX,"y": eY});
    kde.push(eX,eY);
    
    if(i%5 ==0){
      for(var j = 0;j<hists.length;j++){
        hists[j].push(allModels[j].pm);
      }
      surprise(allModels,kde);
    }
  
  /*  if(i>0 && i%floor(n/11)==0){
      kde.draw(dx, height-540, 75,75);
      dx+=dw;
    }
  */
    if(i==floor(n/10)){
      console.log(i);
      surpriseMap(allModels,kde);
      mainGlyph(allModels,0,0,(width/3)-10,kde,img);
    }
    else if(i == floor(n/2)){
      console.log(i);
      surpriseMap(allModels,kde);
      mainGlyph(allModels,(width/3),0,(width/3)-10,kde,img);
    }
    
  }
  console.log(i);
  surprise(allModels,kde);
  surpriseMap(allModels,kde);
  mainGlyph(allModels,2*(width/3),0,(width/3)-10,kde,img);
  
  var hMax = 0;
  for(var i = 0;i<hists.length;i++){
    hMax = max(hMax,hists[i].max);
  }
  
  for(var i = 0;i<hists.length;i++){
    hists[i].max = hMax;
  }
  
  var vspace = height-(width/3)-10;
  var histH = vspace / (hists.length+1);
  events.mean = [dl.mean(events,'x'),dl.mean(events,'y')];
  events.stdev = [dl.stdev(events,'x'),dl.stdev(events,'y')];
  
  for(var i = 0;i<hists.length;i++){
    hists[i].draw(0,(width/3) + (i*histH)+10,width,histH-10);
  }
  
  surpriseH.draw(0,height-histH,width,histH);
}

function drawFunnel(){
  background(255);
  var data = dl.csv("data/unemployment.csv");
  var model = new deMoivre(data,"Geography",null,"Unemployment Rate","Population",colorbrewer.RdPu[9]);
  model.draw(0,0,width,height);
}