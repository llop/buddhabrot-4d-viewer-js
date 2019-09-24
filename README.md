buddhabrot-4d-viewer-js
=======================

Explore the 4 dimensions of the [Buddhabrot](https://en.wikipedia.org/wiki/Buddhabrot) using this HTML + Javascript viewer.


## Features

* Easy click + drag rotation.
* RGB color channel selection.
* Control the render using the 'Cancel', 'Repaint' ans 'Reset' buttons.
* Adjust the granularity of the scan ('Density' select).
* Select the 4D rotation to render.
* Histogram equalization for improved image quality.

## Getting started

A working example can be found in [index.html](index.html).

Include 'buddhabrot-4d-viewer.js' and 'buddhabrot-4d-viewer.css' in your HTML file. [jQuery](https://jquery.com/) is also required.

```html
<script src='https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js'></script>
<script src='buddhabrot-4d-viewer.js'></script>
<link rel='stylesheet' href='assets/buddhabrot-4d-viewer.css'>
``` 

Add the viewer's HTML elements. The following code is taken directly from the example:

```html
<div class='buddhabrot'>
  <canvas id='buddhabrot-canvas' class='buddhabrot-canvas' width='1000' height='600'>Your browser does not support canvas.</canvas>
</div>

<div class='buddhabrot-controls'>
  <table class='controls-table'>
  <tr>
  <td><div class='controls-label'>Colors</div></td>
  <td><div class='controls-label'>Volume</div></td>
  </tr>
  <tr>
    <td class='controls-cell'>
      <div class='colors-box'>
        <input type='number' id='red-input' class='buddhabrot-input red-input' value='5000' min='1' max='5000'></input>
        <input type='range' id='red-slider' class='color-slider red-slider' value='5000' min='1' max='5000'></input>
      </div>
      <div class='colors-box'>
        <input type='number' id='green-input' class='buddhabrot-input green-input' value='500' min='1' max='5000'></input>
        <input type='range' id='green-slider' class='color-slider green-slider' value='500' min='1' max='5000'></input>
      </div>
      <div class='colors-box'>
        <input type='number' id='blue-input' class='buddhabrot-input blue-input' value='50' min='1' max='5000'></input>
        <input type='range' id='blue-slider' class='color-slider blue-slider' value='50' min='1' max='5000'></input>
      </div>
      <div class='controls-label image-label'>Image</div>
      <div class='buttons-box'>
        <button id='reset-btn' class='buddhabrot-button control-btn'>Reset</button>
        <div class='density-box'>
          <label for='density-select'>Density: </label>
          <select id='density-select' class='density-select buddhabrot-select'>
            <option value='low'>Low</option>
            <option value='standard' selected>Standard</option>
            <option value='hi'>High</option>
          </select>
        </div>
        <button id='repaint-btn' class='buddhabrot-button control-btn'>Repaint</button>
        <button id='cancel-btn' class='buddhabrot-button control-btn'>Cancel</button>
      </div>
    </td>
    <td class='controls-cell'>
      <div class='volume-controls'>
      <div class='volume-slider-box'>
        <input type='range' id='volume-slider' class='color-slider volume-slider' value='0' min='0' max='1000'></input>
      </div>
      <div class='volumes-box'>
        <img src='assets/buddhabrot-volumes.png' alt='Buddhabrot volumes'></img>
        <select id='volAX-select' class='volAX buddhabrot-select'>
          <option value='zr' selected>Zr</option>
          <option value='zi'>Zi</option>
          <option value='cr'>Cr</option>
          <option value='ci'>Ci</option>
        </select>
        <select id='volAY-select' class='volAY buddhabrot-select'>
          <option value='zr'>Zr</option>
          <option value='zi' selected>Zi</option>
          <option value='cr'>Cr</option>
          <option value='ci'>Ci</option>
        </select>
        <select id='volAZ-select' class='volAZ buddhabrot-select'>
          <option value='zr'>Zr</option>
          <option value='zi'>Zi</option>
          <option value='cr' selected>Cr</option>
          <option value='ci'>Ci</option>
        </select>
        <select id='volBX-select' class='volBX buddhabrot-select'>
          <option value='zr'>Zr</option>
          <option value='zi'>Zi</option>
          <option value='cr' selected>Cr</option>
          <option value='ci'>Ci</option>
        </select>
        <select id='volBY-select' class='volBY buddhabrot-select'>
          <option value='zr'>Zr</option>
          <option value='zi'>Zi</option>
          <option value='cr'>Cr</option>
          <option value='ci' selected>Ci</option>
        </select>
        <select id='volBZ-select' class='volBZ buddhabrot-select'>
          <option value='zr'>Zr</option>
          <option value='zi' selected>Zi</option>
          <option value='cr'>Cr</option>
          <option value='ci'>Ci</option>
        </select>
      </div>
      </div>
    </td>
  </tr>
  </table>
</div>
```

All elements are, of course, customizable via CSS.

The initial image is the 'front' view of the (zr, zi, cr) object.
Start the viewer with the following code:

```html
<script>
$(() => {
  const canvas = $('#buddhabrot-canvas');
  const buddhabrot = new Buddhabrot(canvas);
  const buddhabrotControls = new BuddhabrotControls(buddhabrot, {
    redInput: $('#red-input'),
    greenInput: $('#green-input'),
    blueInput: $('#blue-input'),
    redSlider: $('#red-slider'),
    greenSlider: $('#green-slider'),
    blueSlider: $('#blue-slider'),
    volumeSlider: $('#volume-slider'),
    volAXSelect: $('#volAX-select'),
    volAYSelect: $('#volAY-select'),
    volAZSelect: $('#volAZ-select'),
    volBXSelect: $('#volBX-select'),
    volBYSelect: $('#volBY-select'),
    volBZSelect: $('#volBZ-select'),
    densitySelect: $('#density-select'),
    resetButton: $('#reset-btn'),
    repaintButton: $('#repaint-btn'),
    cancelButton: $('#cancel-btn')
  });
  buddhabrotControls.start();
});
</script>
```

## Advanced use

It is recommended to learn about the Mandelbrot and the Buddhabrot rendering technique before changing the presets.

### Buddhabrot class

The `Buddhabrot` class is in charge of scanning and rendering the fractal. Its constructor takes the HTML canvas (required).

You can also provide a custom `options` object to the `Buddhabrot` constructor in order to set the render parameters:

* `squareIters`: How many points<sup>2</sup> to sample within the area of a pixel.
* `maxNRed`, `maxNGreen`, `maxNBlue`: For each color channel, set the maximum number of iterations for a point before it is considered to be in M. 
* `histMaxN`: To speed up scan times, a map is initially created to separate areas inside and outside of M. This value sets the maximum number of iterations for a point before it is considered to be in M in the aforementioned map. For consistency, it should be equal to max(`maxNRed`, `maxNGreen`, `maxNBlue`)
* `minN`: Minimum number of iterations for a point before it is considered for plotting in the buddhabrot image.
* `brightness`: Brightness multiplier.
* `colorCap`: Maximum number of iterates per pixel per color channel to be considered for render.
* `waitMs`: During a scan, this value sets how many ms before the next sleep cycle. This is necessary so as not to block the browser.
* `latitude`, `longitude`: Determine the position of the observer.
* `volumeA`, `volumeB`: The rendered 3D object can be `volumeA`, `volumeB`, or any rotation in between them. These values must be an array of the dimension's names.
* `angRot`: Determines the rotation angles between `volumeA`'s and `volumeB`'s dimensions.


The defaults look like this:

```javascript
{
  squareIters = undefined,
  maxNRed = 5000,
  maxNGreen = 500,
  maxNBlue = 50,
  histMaxN = 5000,
  minN = 1,
  brightness = 3.0,
  colorCap = 15000,
  waitMs = 100,
  latitude = 0.0,
  longitude = 0.0,
  angRot = [
      0.0,
      0.0,
      0.0
    ],
  volumeA = [ 
      'zr', 
      'zi', 
      'cr' 
    ],
  volumeB = [ 
      'cr', 
      'ci', 
      'zi' 
    ]
}
```

Render parameters can also be later changed using the following setters:

* `squareIters`
* `setLatitudeLongitude(latitude, longitude)`
* `setColorsMaxN(maxNRed, maxNGreen, maxNBlue)`
* `setAngRot(angRotX, angRotY, angRotZ)`
* `setVolumeA(x, y, z)`
* `setVolumeB(x, y, z)`

Once the a `Buddhabrot` instance is created, `initialize()` must be invoked. This function returns a `Promise` that will settle when everything is set up.

From then on, the `Buddhabrot` instance can be controlled via the following functions:

* `scan(callback)`: Sets off a scan for the currently specified parameters. `callback` must be a function, and it will be invoked when the scan finishes. `callback` will get one boolean argument `success` indicating if the scan completed or was canceled.

* `cancel()`: Cancels the ongoing scan. It returns a `Promise` that will settle once the scan is cancelled. Does nothing if no scan is currently under way.

* `render()`: Paints the available image data on the canvas.

Finally, there is a getter function `painting` to find out if a scan is in progress or not.

### BuddhabrotControls class

The `BuddhabrotControls` class connects the UI to the `Buddhabrot` engine by using the aforementioned methods. Its constructor  takes a `Buddhabrot` instance.

An `options` object can also be passed on to the constructor for customization. Besides the HTML elements, the following parameters are also available:

* `minNColor`, `maxNColor`: Numeric bounds for the color channel inputs.
* `volumeSliderMax`: Maximum value for the `volumeA`-`volumeB` slider input (minimum is 0).
* `progressWidth`: Line width for the progress bar.
* `progressColor`: Line color for the progress bar.
* `axesWidth`: Line width for the axes.
* `axesColors`: Array containing the line colors for the axes.

Default options are:

```javascript
{
  minNColor = 1,
  maxNColor = 5000,
  volumeSliderMax = 1000,
  
  progressWidth = 4,
  progressColor = '#0f0',
  axesWidth = 3,
  axesColors = [ 
      '#9606b4', 
      '#ff8d12', 
      '#fff000' 
    ]
}
```

The `start()` function must be called to start up the viewer.

Events are dispatched whenever a scan starts or ends. It is best to add handlers before calling the `start()` function:


```javascript
buddhabrotControls.on('scan-start', (event) => {
  console.log('scan-start', event);
});
buddhabrotControls.on('scan-end', (event) => {
  console.log('scan-end', event);
});
buddhabrotControls.start();
```

## License

`buddhabrot-4d-viewer-js` is resealsed under the MIT License. See [LICENSE](LICENSE) for details.