const GPU = require('gpu.js').GPU

const gpu = new GPU({mode: 'gpu'})

/**
 * 
 * @param {Float32Array|Unit8Array|Float64Array} array Original matrix
 * @param {Float32Array|Unit8Array|Float64Array} kernel Kernel.
 * @param {Boolean} texMode Whether to save the output to a texture.
 * @returns {Float32Array} 
 */
const convolve = (array, kernel, texMode = false, normailize = false) => {
  const matConvFunc = `function (array, kernel) {
    var sum = 0;
    for (var i = 0; i < 3; i++){
      for (var j = 0; j < 3; j++){
        sum += kernel[j][i] * array[this.thread.y + j][this.thread.x + i]
      }
    }
    return sum;
  }`;
  
    const paddingFunc = `function(array, paddingSize) {
    const positionX = Math.min(Math.max(this.thread.x - paddingSize, 0), ${sizeX} - 1)
    const positionY = Math.min(Math.max(this.thread.y - paddingSize, 0), ${sizeY} - 1)
  
    return array[positionY][positionX]
  }`;
}