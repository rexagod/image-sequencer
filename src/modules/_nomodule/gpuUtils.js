const GPU = require('gpu.js').GPU
const gpu = new GPU({mode: 'gpu'})

/**
 * @method convolve
 * @param {Float32Array|Unit8Array|Float64Array} array Original matrix.
 * @param {Float32Array|Unit8Array|Float64Array} kernels An array of kernels each of same size to be convolved on the same matrix.
 * @param {Boolean} pipeMode Whether to save the output to a texture.
 * @param {Boolean} normalize Whether to normailize the output by dividing it by the total value of the kernel.
 * @returns {Float32Array} 
 */
const convolve = (array, kernels, pipeMode = false, normalize = false) => {
  const arrayX = array[0].length,
    arrayY = array.length,
    kernelX = kernels[0][0].length,
    kernelY = kernels[0].length,
    paddingX = Math.floor(kernelX / 2),
    paddingY = Math.floor(kernelY / 2);

  const matConvFunc = `function (array, kernels) {
    var sum = 0;
    for (var i = 0; i < ${kernelX}; i++){
      for (var j = 0; j < ${kernelY}; j++){
        sum += kernels[this.thread.z][j][i] * array[this.thread.y + j][this.thread.x + i];
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
    output: [arrayX, arrayY, kernels.length],
    pipeline: pipeMode
  })

  let buildPer = window.performance.now() * (-1)
  let padTime = performance.now() * (-1)
  const paddedArray = padIt(array)
  padTime += performance.now()
  console.log(`padding took ${padTime}ms`)
  convolveKernel.build(paddedArray, kernels[0])
  buildPer += performance.now();
  console.log(`compilation took ${buildPer - padTime}ms`)
  
  let outs;

  let perform = (-1) * window.performance.now()
  if (pipeMode) out = convolveKernel(paddedArray, kernels).toArray()
  else out = convolveKernel(paddedArray, kernels)
  perform += window.performance.now()
  console.log(`new convolution took ${perform}ms`)
  console.log(`total new convolution took ${buildPer + perform}ms`)

  return out
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