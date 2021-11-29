function Histogram(anArray,colorramp){
  this.values = anArray ? anArray : [];
  this.min = anArray ? dl.min(anArray) : 0;
  this.max = anArray ? dl.max(anArray) : 0;
  this.ramp = colorramp ? colorramp : colorbrewer.RdPu[9];
  this.push = function(value){
    this.values.push(value);
    if(value<this.min){
      this.min = value;
    }
    if(value>this.max){
      this.max = value;
    }
  };
 this.draw = function(x,y,w,h){
   if(!this.min && !this.max){
     this.min = dl.min(this.values);
     this.max = dl.max(this.values);
   }
   if(this.values.length>0){
     noStroke();
     var dx = w/this.values.length;
     var dy = h;

     push();
     translate(x,y);
     for(var i = 0;i<this.values.length;i++){
       dy = map(this.values[i],this.min,this.max,h/10,h);
       fill(this.getColor(this.values[i]));
       rect(0,h,dx,-dy);
       translate(dx,0); 
     }
     pop();
   }
 }
 this.getColor = function(val){
   if(this.min==this.max){
     return this.ramp[0];
   }
   else{
     var index = floor(map(val,this.min,this.max,0,this.ramp.length-1));
     var remainder = map(val,this.min,this.max,0,this.ramp.length-1)-index;
     if(index>=this.ramp.length-1){
       return this.ramp[this.ramp.length-1];
     }
     else if(index<0 || isNaN(index)){
       console.log("Error:" + val);
       console.log(val+":"+this.min+","+this.max);
       return this.ramp[0];
     }
     else{
       return lerpColor(color(this.ramp[index]),color(this.ramp[index+1]),remainder);
     }
   }
 }; 
};
