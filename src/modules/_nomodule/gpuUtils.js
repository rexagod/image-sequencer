const GPU = require('gpu.js').GPU
const gpu = new GPU()

/**
 * @method convolve
 * @param {Float32Array|Unit8Array|Float64Array} arrays Array of matrices all of the same size.
 * @param {Float32Array|Unit8Array|Float64Array} kernel kernelto be convolved on all the matrices.
 * @param {Boolean} pipeMode Whether to save the output to a texture.
 * @param {Boolean} normalize Whether to normailize the output by dividing it by the total value of the kernel.
 * @returns {Float32Array} 
 */
const convolve = (arrays, kernel, pipeMode = false, normalize = false) => {
  const arrayX = arrays[0][0].length,
    arrayY = arrays[0].length,
    kernelX = kernel[0].length,
    kernelY = kernel.length,
    paddingX = Math.floor(kernelX / 2),
    paddingY = Math.floor(kernelY / 2);

  const matConvFunc = `function (array, kernel) {
    var sum = 0;
    for (var i = 0; i < ${kernelX}; i++){
      for (var j = 0; j < ${kernelY}; j++){
        sum += kernel[j][i] * array[this.thread.y + j][this.thread.x + i];
      }
    }
    return sum;
  }`;

  const padIt = (array) => {
    let out = []

    for (var y = 0; y < array.length; y++){
      out.push([])
      for (var x = 0; x < array[0].length; x++){
        const positionX = Math.min(Math.max(x - paddingX, 0), arrayX - 1);
        const positionY = Math.min(Math.max(y - paddingY, 0), arrayY - 1);

        out[y].push(array[positionY][positionX])
      }
    }

    return out
  }

  const convolveKernel = gpu.createKernel(matConvFunc, {
    output: [arrayX, arrayY],
    pipeline: pipeMode
  })
  
  let outs = [];
  for (var i = 0; i < arrays.length; i++){
    const paddedArray = padIt(arrays[i])

    const outArr = convolveKernel(paddedArray, kernel)

    if (pipeMode) outs.push(outArr.toArray())
    else outs.push(outArr)
  }

  return outs
}

/**
 * 
 * @param {Float32Array|'Object'} outputSize Output size of the compute function.
 * @param {Function} computeFunc The compute function. Cannot be an arrow function.
 * @param {'Object'} constants Constants to be passed to the function. Can be accessed inside the compute function using `this.constants`.
 * @param {Boolean} pipeMode Whether to save output array to a texture.
 * @returns {Float32Array}
 */
const compute = (outputSize, computeFunc, constants, pipeMode) => {
  computeFunc = computeFunc.toString()

  const compute = gpu.createKernel(computeFunc, {
    output: outputSize,
    constants,
    pipeline: pipeMode
  })

  compute.build()

  if (pipeMode) return compute().toArray()
  else return compute()
}

module.exports = {
  convolve,
  compute
}