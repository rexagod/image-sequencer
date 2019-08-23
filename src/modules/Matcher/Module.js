/*
 * Match the images
 */
function Match(options, UI) {
  var output;

  function draw(input, callback, progressObj) {
    progressObj.stop(true);
    progressObj.overrideFlag = true;

    var step = this;
    async function asf() {
      if(this.results){
        return this.results;
      }
      new Matcher(
        "examples/images/small.jpg",
        "examples/images/big.jpg",
        async function(q) {
          var res = await q;
          this.results = res.points;
        }
      );
      return await this.results;
    }

    async function changePixel(r, g, b, a, x, y) {
      debugger
      asf().then(function(points){

        for (var i = 0; i < 500; i++) {
          if (
            Math.abs(points[i].x - x) <= 10 &&
            Math.abs(points[i].y - y) <= 10
          ) {
            return [0, 255, 0];
          }
        }

        var rgba = [r, g, b, a];
        this.rgba = rgba;
      });

      return await this.rgba;

    }

    function output(image, datauri, mimetype) {
      step.output = { src: datauri, format: mimetype };
    }

    return input.pixelManipulation({
      output: output,
      changePixel: changePixel,
      format: input.format,
      image: options.image,
      inBrowser: options.inBrowser,
      callback: callback,
      useWasm: options.useWasm
    });
  }

  return {
    options: options,
    draw: draw,
    output: output,
    UI: UI
  };
}

module.exports = Match;
