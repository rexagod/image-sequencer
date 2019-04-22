// Define kernels for the sobel filter
const kernelx = [
  [-1, 0, 1],
  [-2, 0, 2],
  [-1, 0, 1]
],
kernely = [
  [-1,-2,-1],
  [ 0, 0, 0],
  [ 1, 2, 1]
];

const gpuUtils = require('../_nomodule/gpuUtils')

let pixelsToBeSupressed = [];

module.exports = function(pixels, highThresholdRatio, lowThresholdRatio, hysteresis) {
  let angles = [];
  
  let oldConv = (-1) * performance.now()
  const { gradsX, gradsY } = sobelFilter(pixels)
  oldConv += performance.now()
  console.log(`old convolution took ${oldConv}ms
  `)

  window.gx = gradsX;
  window.gy = gradsY;

  let vals = []

  for (var y = 0; y < pixels.shape[1]; y++){
    vals.push([])
    for (var x = 0; x < pixels.shape[0]; x++){
      vals[y].push(pixels.get(x, y, 0))
    }
  }

  window.grads = gpuUtils.convolve(vals, [kernelx, kernely], true)

  // nonMaxSupress(pixels, grads, angles);
  // doubleThreshold(pixels, highThresholdRatio, lowThresholdRatio, grads, strongEdgePixels, weakEdgePixels);
  // if(hysteresis.toLowerCase() == 'true') hysteresis(strongEdgePixels, weakEdgePixels);

  // strongEdgePixels.forEach(pixel => preserve(pixels, pixel));
  // weakEdgePixels.forEach(pixel => supress(pixels, pixel));
  // pixelsToBeSupressed.forEach(pixel => supress(pixels, pixel));

  return pixels;
}


function supress(pixels, pixel) {
  pixels.set(pixel[0], pixel[1], 0, 0);
  pixels.set(pixel[0], pixel[1], 1, 0);
  pixels.set(pixel[0], pixel[1], 2, 0);
  pixels.set(pixel[0], pixel[1], 3, 255);
}

function preserve(pixels, pixel) {
  pixels.set(pixel[0], pixel[1], 0, 255);
  pixels.set(pixel[0], pixel[1], 1, 255);
  pixels.set(pixel[0], pixel[1], 2, 255);
  pixels.set(pixel[0], pixel[1], 3, 255);
}

// sobelFilter function that convolves sobel kernel over every pixel
function sobelFilter(pixels) {
  // Padding Function
  const padIt = (pixels) => {
    let out = []

    for (var y = 0; y < pixels.shape[1] + 2; y++){
      out.push([])
      for (var x = 0; x < pixels.shape[0] + 2; x++){
        const positionX = Math.min(Math.max(x - 1, 0), pixels.shape[0] - 1);
        const positionY = Math.min(Math.max(y - 1, 0), pixels.shape[1] - 1);

        out[y].push(pixels.get(positionX, positionY, 0))
      }
    }

    return out
  }

  let vals = padIt(pixels)

  let gradsX = [],
    gradsY = [];

  for (let y = 0; y < pixels.shape[1]; y++){
    gradsX.push([])
    gradsY.push([])
    for (let x = 0; x < pixels.shape[0]; x++){
      let sumX = 0;
      let sumY = 0;
      for (let i = 0; i < 3; i++){
        for (let j = 0; j < 3; j++){
          sumX += vals[y + j][x + i] * kernelx[j][i];
          sumY += vals[y + j][x + i] * kernely[j][i];
        }
      }
      gradsX[y].push(sumX);
      gradsY[y].push(sumY);
    }
  }

  // const grad = Math.sqrt(Math.pow(gradX, 2) + Math.pow(gradY, 2)),
  //   angle = Math.atan2(gradY, gradX);
  // return {
  //   pixel: [val, val, val, grad],
  //   angle: angle
  // };

  return {
    gradsX,
    gradsY
  }
}

function categorizeAngle(angle){
  if ((angle >= -22.5 && angle <= 22.5) || (angle < -157.5 && angle >= -180)) return 1;
  else if ((angle >= 22.5 && angle <= 67.5) || (angle < -112.5 && angle >= -157.5)) return 2;
  else if ((angle >= 67.5 && angle <= 112.5) || (angle < -67.5 && angle >= -112.5)) return 3;
  else if ((angle >= 112.5 && angle <= 157.5) || (angle < -22.5 && angle >= -67.5)) return 4;

  /* Category Map
  * 1 => E-W
  * 2 => NE-SW
  * 3 => N-S
  * 4 => NW-SE
  */  
}

function isOutOfBounds(pixels, x, y){
  return ((x < 0) || (y < 0) || (x >= pixels.shape[0]) || (y >= pixels.shape[1]));
}

const removeElem = (arr = [], elem) => {
  return arr = arr.filter((arrelem) => {
    return arrelem !== elem; 
  })
}

// Non Maximum Supression without interpolation
function nonMaxSupress(pixels, grads, angles) {
  angles = angles.map((arr) => arr.map(convertToDegrees));

  for (let x = 0; x < pixels.shape[0]; x++) {
    for (let y = 0; y < pixels.shape[1]; y++) {

      let angleCategory = categorizeAngle(angles[x][y]);

      if (!isOutOfBounds(pixels, x - 1, y - 1) && !isOutOfBounds(pixels, x+1, y+1)){
        switch (angleCategory){
          case 1:
            if (!((grads[x][y] >= grads[x][y + 1]) && (grads[x][y] >= grads[x][y - 1]))) {
              pixelsToBeSupressed.push([x, y]);
            }
            break;
          
          case 2:
            if (!((grads[x][y] >= grads[x + 1][y + 1]) && (grads[x][y] >= grads[x - 1][y - 1]))){
              pixelsToBeSupressed.push([x, y]);
            }
            break;

          case 3:
            if (!((grads[x][y] >= grads[x + 1][y]) && (grads[x][y] >= grads[x - 1][y]))) {
              pixelsToBeSupressed.push([x, y]);
            }
            break;

          case 4:
            if (!((grads[x][y] >= grads[x + 1][y - 1]) && (grads[x][y] >= grads[x - 1][y + 1]))) {
              pixelsToBeSupressed.push([x, y]);
            }
            break;
        }
      }
    }
  }
}
// Converts radians to degrees
var convertToDegrees = radians => (radians * 180) / Math.PI;

// Finds the max value in a 2d array like grads
var findMaxInMatrix = arr => Math.max(...arr.map(el => el.map(val => !!val ? val : 0)).map(el => Math.max(...el)));

// Applies the double threshold to the image
function doubleThreshold(pixels, highThresholdRatio, lowThresholdRatio, grads, strongEdgePixels, weakEdgePixels) {

  const highThreshold = findMaxInMatrix(grads) * highThresholdRatio,
    lowThreshold = highThreshold * lowThresholdRatio;

  for (let x = 0; x < pixels.shape[0]; x++) {
    for (let y = 0; y < pixels.shape[1]; y++) {
      let pixelPos = [x, y];

      if (grads[x][y] > lowThreshold){
        if (grads[x][y] > highThreshold) {
          strongEdgePixels.push(pixelPos);
        }
        else {
          weakEdgePixels.push(pixelPos);
        }
      }
      else {
        pixelsToBeSupressed.push(pixelPos);
      }
    }
  }
}

function hysteresis(strongEdgePixels, weakEdgePixels){
  strongEdgePixels.forEach(pixel => {
    let x = pixel[0],
      y = pixel[1];

    if (weakEdgePixels.includes([x+1, y])) {
      removeElem(weakEdgePixels, [x+1, y]);
    } 
    else if (weakEdgePixels.includes([x-1, y])) {
      removeElem(weakEdgePixels, [x-1, y]);
    }
    else if (weakEdgePixels.includes([x, y+1])) {
      removeElem(weakEdgePixels, [x, y+1]);
    } 
    else if(weakEdgePixels.includes([x, y-1])) {
      removeElem(weakEdgePixels, [x, y-1]);
    }
  })
}
