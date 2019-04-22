const GPU = require('gpu.js').GPU

const gpu = new GPU({mode: 'gpu'})

/**
 * 
 * @param {Float32Array|Unit8Array|Float64Array} array Original matrix
 * @param {Float32Array|Unit8Array|Float64Array} kernel Kernel.
 * @param {Boolean} texMode Whether to save the output to a texture.
 * @returns {Float32Array} 
 */
const convolve = (array, kernel, texMode = false, normalize = false) => {
  const arrayX = array[0].length,
    arrayY = array.length,
    kernelX = kernel[0].length,
    kernelY = kernel.length,
    paddingX = kernelX - 2,
    paddingY = kernelY - 2;

  const matConvFunc = `function (array, kernel) {
    var sum = 0;
    for (var i = 0; i < ${kernelX}; i++){
      for (var j = 0; j < ${kernelY}; j++){
        sum += kernel[j][i] * array[this.thread.y + j][this.thread.x + i]
      }
    }
    return sum;
  }`;
  
    const paddingFunc = `function(array) {
    const positionX = Math.min(Math.max(this.thread.x - ${paddingX}, 0), ${arrayX} - 1);
    const positionY = Math.min(Math.max(this.thread.y - ${paddingY}, 0), ${arrayY} - 1);
  
    return array[positionY][positionX];
  }`;

  const padIt = gpu.createKernel(paddingFunc, {
    output: [arrayX + paddingX, arrayY + paddingY],
    outputToTexture: true
  })

  const convolveKernel = gpu.createKernel(matConvFunc, {
    output: [arrayX, arrayY],
    outputToTexture: texMode
  })

  padIt.build(array);

  const paddedArray = padIt(array)

  convolveKernel.build(paddedArray, kernel)

  if (texMode) return convolveKernel(paddedArray, kernel).toArray()
  else return convolveKernel(paddedArray, kernel)
}