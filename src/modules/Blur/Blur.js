module.exports = exports = function(pixels, blur) {
  let kernel = kernelGenerator(blur), oldpix = require('lodash').cloneDeep(pixels);

  // for (let i = 0; i < pixels.shape[0]; i++) {
  //   for (let j = 0; j < pixels.shape[1]; j++) {
  //     let neighboutPos = getNeighbouringPixelPositions([i, j]);
  //     let acc = [0.0, 0.0, 0.0, 0.0];
  //     for (let a = 0; a < kernel.length; a++) {
  //       for (let b = 0; b < kernel.length; b++) {
  //         acc[0] += (oldpix.get(neighboutPos[a][b][0], neighboutPos[a][b][1], 0) * kernel[a][b]);
  //         acc[1] += (oldpix.get(neighboutPos[a][b][0], neighboutPos[a][b][1], 1) * kernel[a][b]);
  //         acc[2] += (oldpix.get(neighboutPos[a][b][0], neighboutPos[a][b][1], 2) * kernel[a][b]);
  //         acc[3] += (oldpix.get(neighboutPos[a][b][0], neighboutPos[a][b][1], 3) * kernel[a][b]);
  //       }
  //     }
  //     pixels.set(i, j, 0, acc[0]);
  //     pixels.set(i, j, 1, acc[1]);
  //     pixels.set(i, j, 2, acc[2]);
  //   }
  // }

  pixs = {
    r: [],
    g: [],
    b: [],
  }

  for (let y = 0; y < pixels.shape[1]; y++){
    pixs.r.push([])
    pixs.g.push([])
    pixs.b.push([])

    for (let x = 0; x < pixels.shape[0]; x++){
      pixs.r[y].push(pixels.get(x, y, 0))
      pixs.g[y].push(pixels.get(x, y, 1))
      pixs.b[y].push(pixels.get(x, y, 2))
    }
  }

  const convolve = require('../_nomodule/gpuUtils').convolve

  conPix = convolve([pixs.r, pixs.g, pixs.b], kernel)

  for (let y = 0; y < pixels.shape[1]; y++){
    for (let x = 0; x < pixels.shape[0]; x++){
      pixels.set(x, y, 0, conPix[0][y][x])
      pixels.set(x, y, 1, conPix[1][y][x])
      pixels.set(x, y, 2, conPix[2][y][x])
    }
  }

  return pixels;

  //Generates a 5x5 Gaussian kernel
  function kernelGenerator(sigma = 1) {

    /*
    Trying out a variable radius kernel not working as of now
    */
    // const coeff = (1.0/(2.0*Math.PI*sigma*sigma))
    // const expCoeff = -1 * (1.0/2.0 * sigma * sigma)
    // let e = Math.E
    // let result = []
    // for(let i = -1 * size;i<=size;i++){
    //     let arr = []
    //     for(let j= -1 * size;j<=size;j++){
    //         arr.push(coeff * Math.pow(e,expCoeff * ((i * i) + (j*j))))
    //     }
    //     result.push(arr)
    // }
    // let sum = result.reduce((sum,val)=>{
    //     return val.reduce((sumInner,valInner)=>{
    //         return sumInner+valInner
    //     })
    // })
    // result = result.map(arr=>arr.map(val=>(val + 0.0)/(sum + 0.0)))

    // return result

    let kernel = [],
      sum = 0;

    if (sigma == 0) sigma += 0.25

    const s = 2 * Math.pow(sigma, 2);

    for (let y = -2; y <= 2; y++) {
      kernel.push([])
      for (let x = -2; x <= 2; x++) { 
        let r = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2))
        kernel[y + 2].push(Math.exp(-(r / s)))
        sum += kernel[y + 2][x + 2]
      } 
    }

    for (let x = 0; x < 5; x++){
      for (let y = 0; y < 5; y++){
        kernel[y][x] = (kernel[y][x] / sum)
      }
    }

    // return [
    //   [2.0 / 159.0, 4.0 / 159.0, 5.0 / 159.0, 4.0 / 159.0, 2.0 / 159.0],
    //     [4.0 / 159.0, 9.0 / 159.0, 12.0 / 159.0, 9.0 / 159.0, 4.0 / 159.0],
    //     [5.0 / 159.0, 12.0 / 159.0, 15.0 / 159.0, 12.0 / 159.0, 5.0 / 159.0],
    //     [4.0 / 159.0, 9.0 / 159.0, 12.0 / 159.0, 9.0 / 159.0, 4.0 / 159.0],
    //     [2.0 / 159.0, 4.0 / 159.0, 5.0 / 159.0, 4.0 / 159.0, 2.0 / 159.0]
    // ];
    return kernel;
  }
  function getNeighbouringPixelPositions(pixelPosition) {
    let x = pixelPosition[0], y = pixelPosition[1], result = [];

    for (let i = -2; i <= 2; i++) {
      let arr = [];
        for (let j = -2; j <= 2; j++)
          arr.push([x + i, y + j]);

          result.push(arr);
      }
    return result;
  }

  function flipKernel(kernel) {
    let result = [];
    for (let i = kernel.length - 1; i >= 0; i--) {
      let arr = [];
      for (let j = kernel[i].length - 1; j >= 0; j--) {
          arr.push(kernel[i][j]);
      }
      result.push(arr);
    }
    return result;
  }
}