'use strict';



class Buddhabrot {
  
  
  
  // ms interval between sleeps during scan
  static WAIT_MS = 100;
  
  // map dimension name to index
  static DIMENSIONS = {
    'zr': 0,
    'zi': 1,
    'cr': 2,
    'ci': 3
  };
  
  // map dimension index to name
  static DIMENSION_NAMES = [
    'zr',
    'zi',
    'cr',
    'ci'
  ];
  
  
  
  // constructor takes canvas and options
  constructor(canvas, {
        squareIters = undefined,
        maxNRed = 5000,
        maxNGreen = 500,
        maxNBlue = 50,
        histMaxN = 5000,
        minN = 1,
        brightness = 3.0,
        colorCap = 15000,
        waitMs = Buddhabrot.WAIT_MS,
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
      } = {}) {
    // buddhabrot canvas
    this.canvas = canvas;
    
    // set options
    // sample (this.squareIters)^2 points per pixel
    let initialSide = 4.0;
    this.squareIters = squareIters;
    if (!this.squareIters) {
      let minDim = Math.min(this.canvas.width(), this.canvas.height());
      this.squareIters = minDim / (initialSide * 10);
    }
    
    // max n values for red, green and blue
    this.maxNRed = maxNRed; 
    this.maxNGreen = maxNGreen; 
    this.maxNBlue = maxNBlue; 
    this.imgMapMaxN = histMaxN;
    
    this.minN = minN;
    
    this.brightness = brightness;
    this.colorCap = colorCap;
    
    this.waitMs = waitMs;
    
    this.latitude = latitude;     // latitude and longitude in radians
    this.longitude = longitude;
    this._buildRotationMatrix();
    
    this.angRotX = angRot[0];
    this.angRotY = angRot[1];
    this.angRotZ = angRot[2];
    
    this.volumeAX = Buddhabrot.DIMENSIONS[volumeA[0]];
    this.volumeAY = Buddhabrot.DIMENSIONS[volumeA[1]];
    this.volumeAZ = Buddhabrot.DIMENSIONS[volumeA[2]];
    
    this.volumeBX = Buddhabrot.DIMENSIONS[volumeB[0]];
    this.volumeBY = Buddhabrot.DIMENSIONS[volumeB[1]];
    this.volumeBZ = Buddhabrot.DIMENSIONS[volumeB[2]];
    
    // initialize the rest of the variables
    // these variables control the render
    this.initialized = false;       // true if histogram for current parameters is built
    this.repaint = false;           // true if there is a need to repaint the canvas
    this.donePainting = false;      // true if all image data has been gathered
    this.progress = -1;             // 0-1, how much of the plane has been scanned to render the buddhabrot
    this.awaitingPromise = false;   // true if repaint was called, but the process has not yet started
    this.scanLoop = false;          // false when the render needs to get canceled
    
    
    this.scanning = false;
    this.scanLoop = false;
    this.scanDone = true;
    
    // get graphics context from canvas
    // then get image data (pixel array) to paint on
    this.context = this.canvas[0].getContext('2d');
    this.context.lineJoin = 'round';
    this.context.lineWidth = 3;
    this.context.font = '18px Georgia';
    this.context.fillStyle = '#fff';
    this.image = this.context.createImageData(this.canvas.width(), this.canvas.height());
    
    // get image dimensions from canvas
    this.imgWidth = this.canvas.width();
    this.imgHeight = this.canvas.height();
    this.imgSize = this.imgWidth * this.imgHeight;
    
    // center coords
    this.centerX = 0.0;
    this.centerY = 0.0;
    
    // fit the initial 4x4 area in the canvas
    // the rendered area is centered at (this.centerX, this.centerY) 
    // and its dimensions are this.width * this.height
    this.ratio = this.imgWidth / this.imgHeight;
    if (this.ratio >= 1) {
      this.height = initialSide;
      this.width = initialSide * this.ratio;
    } else {
      this.width = initialSide;
      this.height = initialSide / this.ratio;
    }
    
    this.imgHist = new Uint32Array(256);
    this.maxRed = 1;
    this.maxGreen = 1;
    this.maxBlue = 1;
    this._initDataStructures();
  }
  
  
  // initialize color arrays
  _initDataStructures() {
    this.imgMap = new Uint8Array(this.imgSize);
    this.gray = new Uint32Array(this.imgSize);
    this.red = new Uint32Array(this.imgSize);
    this.green = new Uint32Array(this.imgSize);
    this.blue = new Uint32Array(this.imgSize);
    for (let i = 0; i < this.imgSize; ++i) {
      this.imgMap[i] = 0;
      this.gray[i] = 0;
      this.red[i] = 0;
      this.green[i] = 0;
      this.blue[i] = 0;
    }
  }
  
  // reset color arrays
  _resetDataStructures() {
    this.maxRed = 1;
    this.maxGreen = 1;
    this.maxBlue = 1;
    for (let i = 0; i < this.imgSize; ++i) {
      this.red[i] = 0;
      this.green[i] = 0;
      this.blue[i] = 0;
    }
  }
  
  // rotation matrix
  // https://stackoverflow.com/questions/34050929/3d-point-rotation-algorithm/34060479
  // https://de.wikipedia.org/wiki/Roll-Nick-Gier-Winkel
  _buildRotationMatrix() {
    let cosb = Math.cos(this.longitude);
    let sinb = Math.sin(this.longitude);

    let cosc = Math.cos(this.latitude);
    let sinc = Math.sin(this.latitude);
    
    this.Axx = cosb;
    this.Axy = sinb * sinc;
    this.Axz = sinb * cosc;

    this.Ayy = cosc;
    this.Ayz = -sinc;

    this.Azx = -sinb;
    this.Azy = cosb * sinc;
    this.Azz = cosb * cosc;
  }
  
  
  // setters
  // update latitude annd longitude
  setLatitudeLongitude(latitude, longitude) {
    this.latitude = latitude;
    this.longitude = longitude;
    this._buildRotationMatrix();
  }
  
  setColorsMaxN(maxNRed, maxNGreen, maxNBlue) {
    this.maxNRed = maxNRed;
    this.maxNGreen = maxNGreen;
    this.maxNBlue = maxNBlue;
  }
  
  setAngRot(angRotX, angRotY, angRotZ) {
    this.angRotX = angRotX;
    this.angRotY = angRotY;
    this.angRotZ = angRotZ;
  }
  
  setVolumeA(x, y, z) {
    this.volumeAX = Buddhabrot.DIMENSIONS[x];
    this.volumeAY = Buddhabrot.DIMENSIONS[y];
    this.volumeAZ = Buddhabrot.DIMENSIONS[z];
  }
  
  setVolumeB(x, y, z) {
    this.volumeBX = Buddhabrot.DIMENSIONS[x];
    this.volumeBY = Buddhabrot.DIMENSIONS[y];
    this.volumeBZ = Buddhabrot.DIMENSIONS[z];
  }
  
  _getXYZ(zr, zi, cr, ci) {
    let coords = [ zr, zi, cr, ci ];
    let x1 = coords[this.volumeAX];
    let y1 = coords[this.volumeAY];
    let z1 = coords[this.volumeAZ];
    let x2 = coords[this.volumeBX];
    let y2 = coords[this.volumeBY];
    let z2 = coords[this.volumeBZ];
    return [
        x1 + (x2 - x1) * this.angRotX,
        y1 + (y2 - y1) * this.angRotY,
        z1 + (z2 - z1) * this.angRotZ
      ];
  }
  
  // read only getter
  get painting() {
    return !this.donePainting;
  }
  
  
  // build functions
  // creates an array of ints of size this.imgWidth * this.imgHeight
  // this.imgMap[x][y] = 1 if (x, yi) is sure to be outside M; 0 otherwise
  async initialize() {
    
    // set proper render vars
    this.initialized = false;
    this.donePainting = false;
    this.repaint = true;
    
    let halfWidth = this.width / 2;
    let halfHeight = this.height / 2;
    let halfImgWidth = this.imgWidth / 2;
    let inc = this.width / this.imgWidth;
    let halfInc = inc / 2;
    let cr = this.centerX - halfHeight + halfInc;
    let ciIni = this.centerY - halfWidth + halfInc;
    
    let t = Date.now();
    for (let x = 0; x < this.imgHeight; ++x, cr += inc) {
      let ci = ciIni;
      for (let y = 0; y < halfImgWidth; ++y, ci += inc) {
        let zr = 0.0;
        let zi = 0.0;
        let tr = 0.0;
        let ti = 0.0;
        let n = 0;
        while (n < this.imgMapMaxN && tr + ti <= 4.0) {
          zi = 2.0 * zr * zi + ci;
          zr = tr - ti + cr;
          tr = zr * zr;
          ti = zi * zi;
          ++n;
        }
        this.imgMap[x * this.imgWidth + y] = this.imgMap[x * this.imgWidth + (this.imgWidth - y - 1)] = n < this.imgMapMaxN;
      }
      
      // wait every so often
      if (Date.now() - t > this.waitMs) {
        await this._sleep();
        t = Date.now();
      }
    }
    
    // thicken histogram
    let imgMapTmp = new Uint8Array(this.imgSize);
    for (let x = 0; x < this.imgHeight; ++x) for (let y = 0; y < this.imgWidth; ++y) 
      imgMapTmp[x * this.imgWidth + y] = this._isMapPointGood(x, y);
    
    this.imgMap = imgMapTmp;
    this.initialized = true;
  }
  
  // return true if this.imgMap[x][y] or any of its neighbors is true
  _isMapPointGood(x, y) {
    for (let a = Math.max(x - 1, 0); a < Math.min(x + 2, this.imgHeight); ++a)
      for (let b = Math.max(y - 1, 0); b < Math.min(y + 2, this.imgWidth); ++b)
        if (this.imgMap[a * this.imgWidth + b]) return 1;
    return 0;
  }
  
  
  // buld the buddhabrot image
  async _scan() {
    if (!this.initialized) return;
    
    // set proper render vars
    this.donePainting = false;
    this.repaint = true;
    this.progress = 0;
    this.scanLoop = true;
    
    let halfWidth = this.width / 2;
    let halfHeight = this.height / 2;
    let halfImgWidth = this.imgWidth / 2;
    let crIni = this.centerX - halfHeight;
    let ciIni = this.centerY - halfWidth;
    let inc = this.width / (this.imgWidth * this.squareIters);
    let ratioTmp = this.imgWidth / this.width;
    
    let iteratesR = new Float64Array(this.imgMapMaxN);
    let iteratesI = new Float64Array(this.imgMapMaxN);
    for (let i = 0; i < this.imgMapMaxN; ++i) {
      iteratesR[i] = 0.0;
      iteratesI[i] = 0.0;
    }
    
    this._resetDataStructures();
    this._buildRotationMatrix();
    
    let t0 = Date.now();
    let maxN = Math.max(Math.max(this.maxNRed, this.maxNGreen), this.maxNBlue);
    let t = Date.now();
    for (let a = 0; this.scanLoop && a < this.imgHeight; ++a) {
      for (let b = 0; b < this.imgWidth; ++b) {
        if (this.imgMap[a * this.imgWidth + b]) {
          let cr = crIni + a * this.width / this.imgWidth;
          let ciIniRow = ciIni + b * this.width / this.imgWidth;
          for (let i = 0; i < this.squareIters; ++i, cr += inc) {
            let ci = ciIniRow;
            for (let j = 0; j < this.squareIters; ++j, ci += inc) {
              
              let zr = 0.0;
              let zi = 0.0;
              let tr = 0.0;
              let ti = 0.0;
              let n = 0;
              while (n < maxN && tr + ti <= 4.0) {
                iteratesI[n] = zi = 2.0 * zr * zi + ci;
                iteratesR[n] = zr = tr - ti + cr;
                tr = zr * zr;
                ti = zi * zi;
                ++n;
              }
              
              if (n >= this.minN && n < maxN) {
                for (let k = 0; k < n; ++k) {
                  let coords = this._getXYZ(iteratesR[k], iteratesI[k], cr, ci);
                  
                  let x = Math.round(((this.Axx * coords[0] + this.Axy * coords[1] + this.Axz * coords[2]) - crIni) * ratioTmp);
                  let y = Math.round(((this.Ayy * coords[1] + this.Ayz * coords[2]) - ciIni) * ratioTmp);
                  
                  if (x >= 0 && x < this.imgHeight && y >= 0 && y < this.imgWidth) {
                    let z = x * this.imgWidth + y;
                    if (n < this.maxNRed) ++this.red[z];
                    if (n < this.maxNGreen) ++this.green[z];
                    if (n < this.maxNBlue) ++this.blue[z];
                  }
                }
              }
            }
          }
        }
      }
      this.progress = (a + 1) / this.imgHeight;
      // wait every so often
      if (Date.now() - t > this.waitMs) {
        await this._sleep();
        t = Date.now();
      }     
    }
    
    console.log(Date.now() - t0);
    this.progress = -1;
    this.donePainting = true;
    return this.scanLoop;
  }
  
  async cancel() {
    if (this.donePainting && !this.scanLoop) return;
    
    this.scanLoop = false;
    return this.scanPromise;
  }
  
  
  // render functions
  // draw the histogram
  _renderHistogram() {
    let offset = 0;
    for (let i = 0; i < this.imgSize; ++i) {
      let color = this.imgMap[i] ? 255 : 0;
      this.image.data[offset++] = color;
      this.image.data[offset++] = color;
      this.image.data[offset++] = color;
      this.image.data[offset++] = 255;
    }
  }
  
  // draw the buddhabrot
  _renderBuddhabrot() {
    for (let i = 0; i < 256; ++i) this.imgHist[i] = 0;
    for (let i = 0; i < this.imgSize; ++i) {
      this.maxRed = Math.max(this.maxRed, this.red[i]);
      this.maxGreen = Math.max(this.maxGreen, this.green[i]);
      this.maxBlue = Math.max(this.maxBlue, this.blue[i]);
    }
    let offset = 0;
    for (let i = 0; i < this.imgSize; ++i) {
      let redCh = Math.floor(255.0 * Math.min(this.colorCap, this.red[i]) / Math.min(this.colorCap, this.maxRed));
      let greenCh = Math.floor(255.0 * Math.min(this.colorCap, this.green[i]) / Math.min(this.colorCap, this.maxGreen));
      let blueCh = Math.floor(255.0 * Math.min(this.colorCap, this.blue[i]) / Math.min(this.colorCap, this.maxBlue));
      this.gray[i] = Math.round(redCh * 0.299 + greenCh * 0.587 + blueCh * 0.114);
      ++this.imgHist[this.gray[i]];
      
      this.image.data[offset++] = redCh;
      this.image.data[offset++] = greenCh;
      this.image.data[offset++] = blueCh;
      ++offset;
    }
    for (let i = 1; i < 256; ++i) this.imgHist[i] += this.imgHist[i - 1];
    for (let i = offset = 0; i < this.imgSize; ++i) {
      let factor = this.brightness * this.imgHist[this.gray[i]] / this.imgSize;
      this.image.data[offset] = Math.min(255, factor * this.image.data[offset++]);
      this.image.data[offset] = Math.min(255, factor * this.image.data[offset++]);
      this.image.data[offset] = Math.min(255, factor * this.image.data[offset++]);
      this.image.data[offset++] = 255;
    }
    if (this.donePainting) this.repaint = false;
  }
  
  
  scan(callback) {
    this.scanPromise = this._scan().then(callback);
  }
  
  // main render function
  render() {
    if (this.repaint) {
      if (this.initialized) this._renderBuddhabrot();
      else this._renderHistogram();
    }
    this.context.clearRect(0, 0, this.imgWidth, this.imgHeight);
    this.context.putImageData(this.image, 0, 0);
  }
  
  
  // sleep function. use 'await this.sleep()' in async functions
  _sleep() { 
    return new Promise(resolve => requestAnimationFrame(resolve)); 
  }
  
}



class BuddhabrotControls {
  
  
  // events
  static SCAN_START = 'scan-start';
  static SCAN_END = 'scan-end';
  
  
  constructor(buddhabrot, {
        redInput = $("<input type='number'></input>"),
        greenInput = $("<input type='number'></input>"),
        blueInput = $("<input type='number'></input>"),
        redSlider = $("<input type='range'></input>"),
        greenSlider = $("<input type='range'></input>"),
        blueSlider = $("<input type='range'></input>"),
        volumeSlider = $("<input type='range'></input>"),
        volAXSelect = $("<select><option value='zr'>Zr</option><option value='zi'>Zi</option><option value='cr'>Cr</option><option value='ci'>Ci</option></select>"),
        volAYSelect = $("<select><option value='zr'>Zr</option><option value='zi'>Zi</option><option value='cr'>Cr</option><option value='ci'>Ci</option></select>"),
        volAZSelect = $("<select><option value='zr'>Zr</option><option value='zi'>Zi</option><option value='cr'>Cr</option><option value='ci'>Ci</option></select>"),
        volBXSelect = $("<select><option value='zr'>Zr</option><option value='zi'>Zi</option><option value='cr'>Cr</option><option value='ci'>Ci</option></select>"),
        volBYSelect = $("<select><option value='zr'>Zr</option><option value='zi'>Zi</option><option value='cr'>Cr</option><option value='ci'>Ci</option></select>"),
        volBZSelect = $("<select><option value='zr'>Zr</option><option value='zi'>Zi</option><option value='cr'>Cr</option><option value='ci'>Ci</option></select>"),
        densitySelect = $("<select><option value='low'>Low</option><option value='standard'>Standard</option><option value='hi'>High</option></select>"),
        resetButton = $("<button type='button'>Reset</button>"),
        repaintButton = $("<button type='button'>Repaint</button>"),
        cancelButton = $("<button type='button'>Cancel</button>"),
        
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
      } = {}) {
    
    this.buddhabrot = buddhabrot;
    this.canvas = this.buddhabrot.canvas;
    this.canvas.css('cursor', 'pointer');
    this.context = this.buddhabrot.context;
    
    // HTML elements
    this.redInput = redInput;
    this.greenInput = greenInput;
    this.blueInput = blueInput;
    this.redSlider = redSlider;
    this.greenSlider = greenSlider;
    this.blueSlider = blueSlider;
    this.volumeSlider = volumeSlider;
    this.volAXSelect = volAXSelect;
    this.volAYSelect = volAYSelect;
    this.volAZSelect = volAZSelect;
    this.volBXSelect = volBXSelect;
    this.volBYSelect = volBYSelect;
    this.volBZSelect = volBZSelect;
    this.densitySelect = densitySelect;
    this.resetButton = resetButton;
    this.repaintButton = repaintButton;
    this.cancelButton = cancelButton;
    
    // color settings
    this.minNColor = minNColor;
    this.maxNColor = maxNColor;
    this.volumeSliderMax = volumeSliderMax;
    
    // progress settings
    this.progressWidth = progressWidth;
    this.progressColor = progressColor;
    
    // axes colors
    this.axisXColor = axesColors[0];
    this.axisYColor = axesColors[1];
    this.axisZColor = axesColors[2];
    this.axesWidth = axesWidth;
    
    this.showAxes = false;
    this.mouseDown = false;
    this.mouseXIni = 0;
    this.mouseYIni = 0;
    this.rotationRepaint = false;
    
    // get defaults from buddhabrot
    this.defaults = this._getBuddhabrotParams();
    this.params = this._getBuddhabrotParams();
    
    // deal with square iters
    this.densities = {
      'low': this.defaults.squareIters / 4.0,
      'standard': this.defaults.squareIters / 2.0,
      'hi': this.defaults.squareIters
    };
    this.defaults.squareIters = this.densities.standard;
    this.params.squareIters = this.densities.standard;
    this.buddhabrot.squareIters = this.densities.standard;
    
    // event listeners
    this.handlers = new Map();
    this.handlers.set(BuddhabrotControls.SCAN_START, []);
    this.handlers.set(BuddhabrotControls.SCAN_END, []);
    
    // init UI
    this._initUI();
    this._addUIEventHandlers();
    this._setUIOptions(this.defaults);
  }
  
  
  // set limits to inputs
  _initUI() {
    this.redInput.attr({
        min: this.minNColor,
        max: this.maxNColor
      });
    this.greenInput.attr({
        min: this.minNColor,
        max: this.maxNColor
      });
    this.blueInput.attr({
        min: this.minNColor,
        max: this.maxNColor
      });
    this.redSlider.attr({
        min: this.minNColor,
        max: this.maxNColor
      });
    this.greenSlider.attr({
        min: this.minNColor,
        max: this.maxNColor
      });
    this.blueSlider.attr({
        min: this.minNColor,
        max: this.maxNColor
      });
    this.volumeSlider.attr({
        min: 0,
        max: this.volumeSliderMax
      });
  }
  
  // UI events
  _addUIEventHandlers() {
    // color input listeners
    this.redInput.bind('input keyup mouseup', () => {
      let val = this.redInput.val();
      if ($.isNumeric(val)) {
        val = Number(val) | 0;
        if (val < this.minNColor || val > this.maxNColor) val = this.params.maxNRed;
      } else {
        val = this.params.maxNRed;
      }
      this.params.maxNRed = val;
      this.redInput.val(val);
      this.redSlider.val(val);
    });
    this.greenInput.bind('input keyup mouseup', () => {
      let val = this.greenInput.val();
      if ($.isNumeric(val)) {
        val = Number(val) | 0;
        if (val < this.minNColor || val > this.maxNColor) val = this.params.maxNGreen;
      } else {
        val = this.params.maxNGreen;
      }
      this.params.maxNGreen = val;
      this.greenInput.val(val);
      this.greenSlider.val(val);
    });
    this.blueInput.bind('input keyup mouseup', () => {
      let val = this.blueInput.val();
      if ($.isNumeric(val)) {
        val = Number(val) | 0;
        if (val < this.minNColor || val > this.maxNColor) val = this.params.maxNBlue;
      } else {
        val = this.params.maxNBlue;
      }
      this.params.maxNBlue = val;
      this.blueInput.val(val);
      this.blueSlider.val(val);
    });
    
    // slider listeners
    this.redSlider.on('input change', () => { 
      this.params.maxNRed = this.redSlider.val();
      this.redInput.val(this.params.maxNRed);
    });
    this.greenSlider.on('input change', () => { 
      this.params.maxNGreen = this.greenSlider.val();
      this.greenInput.val(this.params.maxNGreen);
    });
    this.blueSlider.on('input change', () => { 
      this.params.maxNBlue = this.blueSlider.val();
      this.blueInput.val(this.params.maxNBlue);
    });
    
    this.repaintButton.click(() => { this._repaint() });
    this.resetButton.click(() => { this._reset() });
    this.cancelButton.click(() => { this._cancel() });
    
    // add mouse event handlers
    this.canvas.mousedown((event) => { this._mouseDownHandler(event) });
    $(document).mousemove((event) => { this._mouseMoveHandler(event) });
    $(document).mouseup((event) => { this._mouseUpHandler(event) });
  }
  
  
  // mouse event handlers
  _mouseDownHandler(event) {
    if (this.buddhabrot.painting) return;
    
    if (event.which == 1) {
      this.rotationRepaint = false;
      this.showAxes = true;
      this.mouseDown = true;
      this.mouseXIni = event.pageX - this.canvas.position().left;
      this.mouseYIni = event.pageY - this.canvas.position().top;
    }
  }
  
  _mouseMoveHandler(event) {
    if (this.mouseDown) {
      let mouseX = event.pageX - this.canvas.position().left;
      let mouseY = event.pageY - this.canvas.position().top;
      
      let offsetX = (mouseX - this.mouseXIni) * Math.PI / 500;
      let offsetY = (mouseY - this.mouseYIni) * Math.PI / 500;
      
      let newLat = this.params.latitude + offsetX;
      while (newLat > 2.0 * Math.PI) newLat -= 2.0 * Math.PI;
      while (newLat < 0.0) newLat += 2.0 * Math.PI;
      
      let newLon = this.params.longitude + offsetY;
      while (newLon > 2.0 * Math.PI) newLon -= 2.0 * Math.PI;
      while (newLon < 0.0) newLon += 2.0 * Math.PI;
      
      this.params.latitude = newLat;
      this.params.longitude = newLon;
      this._buildRotationMatrix();
      this.rotationRepaint = true;
      
      this.mouseXIni = mouseX;
      this.mouseYIni = mouseY;
    }
  }
  
  _mouseUpHandler(event) {
    if (this.mouseDown) {
      this.mouseDown = false;
      this.showAxes = false;
      if (this.rotationRepaint) {
        this.rotationRepaint = false;
        this._repaint();
      }
    }
  }
  
  // rotation matrix for the axes
  _buildRotationMatrix() {
    let cosb = Math.cos(this.params.longitude);
    let sinb = Math.sin(this.params.longitude);

    let cosc = Math.cos(this.params.latitude);
    let sinc = Math.sin(this.params.latitude);
    
    this.Axx = cosb;
    this.Axy = sinb * sinc;
    this.Axz = sinb * cosc;

    this.Ayy = cosc;
    this.Ayz = -sinc;

    this.Azx = -sinb;
    this.Azy = cosb * sinc;
    this.Azz = cosb * cosc;
  }
  
  
  // get parameters from UI and put them in this.params 
  _getUIOptions() {
    this.params.squareIters = this.densities[this.densitySelect.val()];
    let newAngRot = Math.sin((Math.PI * this.volumeSlider.val()) / (2.0 * this.volumeSliderMax));
    this.params.angRot = [ newAngRot, newAngRot, newAngRot ];
    this.params.volA = [
        this.volAXSelect.children('option:selected').val(),
        this.volAYSelect.children('option:selected').val(),
        this.volAZSelect.children('option:selected').val()
      ];
    this.params.volB = [
        this.volBXSelect.children('option:selected').val(),
        this.volBYSelect.children('option:selected').val(),
        this.volBZSelect.children('option:selected').val()
      ];
  }
  
  // set UI parameters from options object
  _setUIOptions(options) {
    if (options.squareIters == this.densities.low) this.densitySelect.val('low');
    else if (options.squareIters == this.densities.hi) this.densitySelect.val('hi');
    else this.densitySelect.val('standard');
    
    this.params.latitude = options.latitude;
    this.params.longitude = options.longitude;
    this._buildRotationMatrix();
    
    this.params.maxNRed = options.maxNRed;
    this.params.maxNGreen = options.maxNGreen;
    this.params.maxNBlue = options.maxNBlue;
    
    this.redInput.val(this.params.maxNRed);
    this.greenInput.val(this.params.maxNGreen);
    this.blueInput.val(this.params.maxNBlue);
    
    this.redSlider.val(this.params.maxNRed);
    this.greenSlider.val(this.params.maxNGreen);
    this.blueSlider.val(this.params.maxNBlue);
    
    this.volumeSlider.val(Math.asin(options.angRot[0]) * this.volumeSliderMax);
    
    this.volAXSelect.val(options.volA[0]);
    this.volAYSelect.val(options.volA[1]);
    this.volAZSelect.val(options.volA[2]);
    this.volBXSelect.val(options.volB[0]);
    this.volBYSelect.val(options.volB[1]);
    this.volBZSelect.val(options.volB[2]);
  }
  
  // get and set buddhabrot parameters
  _getBuddhabrotParams() {
    return {
        squareIters: this.buddhabrot.squareIters,
        latitude: this.buddhabrot.latitude,
        longitude: this.buddhabrot.longitude,
        maxNRed: this.buddhabrot.maxNRed,
        maxNGreen: this.buddhabrot.maxNGreen,
        maxNBlue: this.buddhabrot.maxNBlue,
        angRot: [ 
            this.buddhabrot.angRotX, 
            this.buddhabrot.angRotY, 
            this.buddhabrot.angRotZ 
          ],
        volA: [ 
            Buddhabrot.DIMENSION_NAMES[this.buddhabrot.volumeAX], 
            Buddhabrot.DIMENSION_NAMES[this.buddhabrot.volumeAY], 
            Buddhabrot.DIMENSION_NAMES[this.buddhabrot.volumeAZ] 
          ],
        volB: [ 
            Buddhabrot.DIMENSION_NAMES[this.buddhabrot.volumeBX], 
            Buddhabrot.DIMENSION_NAMES[this.buddhabrot.volumeBY], 
            Buddhabrot.DIMENSION_NAMES[this.buddhabrot.volumeBZ] 
          ]
      };
  }
  
  _setBuddhabrotParams(options) {
    this.buddhabrot.squareIters = options.squareIters;
    this.buddhabrot.setColorsMaxN(options.maxNRed, options.maxNGreen, options.maxNBlue);
    this.buddhabrot.setLatitudeLongitude(options.latitude, options.longitude);
    this.buddhabrot.setAngRot(options.angRot[0], options.angRot[1], options.angRot[2]);
    this.buddhabrot.setVolumeA(options.volA[0], options.volA[1], options.volA[2]);
    this.buddhabrot.setVolumeB(options.volB[0], options.volB[1], options.volB[2]);
  }
  
  
  
  //-----------------------------------------------------------
  // 
  // control functions:
  // 
  // - reset
  // - repaint
  // - cancel
  // 
  //-----------------------------------------------------------
  
  // cancel
  async _cancel() {
    await this.buddhabrot.cancel();
  }
  
  // repaint
  async _repaint() {
    await this.buddhabrot.cancel();
    this._getUIOptions();
    this._setBuddhabrotParams(this.params);
    this._scan();
  }
  
  // reset
  async _reset() {
    await this.buddhabrot.cancel();
    this._setUIOptions(this.defaults);
    this._getUIOptions();
    this._setBuddhabrotParams(this.defaults);
    this._scan();
  }
  
  
  // start a scan
  _scan() {
    this.canvas.css('cursor', 'wait');  // wait cursor
    
    // fire scan start event
    let eventData = this._getEventData(BuddhabrotControls.SCAN_START, true);
    this._dispatch(BuddhabrotControls.SCAN_START, eventData);
    
    this.buddhabrot.scan((success) => {
      this.canvas.css('cursor', 'pointer');   // pointer cursor
      
      // fire scan end event
      let eventData = this._getEventData(BuddhabrotControls.SCAN_END, success);
      this._dispatch(BuddhabrotControls.SCAN_END, eventData);
    });
  }
  
  
  
  //-----------------------------------------------------------
  // 
  // 'public' methods:
  // 
  // * start
  // * render
  // * on
  // * off
  // 
  //-----------------------------------------------------------
  
  // initialize the buddhabrot then start a scan
  async start() {
    this.canvas.css('cursor', 'wait');
    await this.buddhabrot.initialize();
    this._scan();
    this._renderLoop();
  }
  
  _renderLoop() {
    this._render();
    requestAnimationFrame(() => { this._renderLoop(); });
  }
  
  // draw everything
  _render() {
    this.buddhabrot.render();
    if (this.buddhabrot.progress >= 0) this._renderProgress();
    if (this.showAxes) this._renderAxes();
  }
  
  
  //-----------------------------------------------------------
  // 
  // render methods
  // 
  //-----------------------------------------------------------
  
  _renderProgress() {
    this.context.lineWidth = this.progressWidth;
    this.context.strokeStyle = this.progressColor;
    this.context.beginPath();
    this.context.moveTo(1, this.canvas.height() - 1);
    this.context.lineTo(this.buddhabrot.progress * this.canvas.width(), this.canvas.height() - 1);
    this.context.closePath();
    this.context.stroke();
  }
  
  _renderAxes() {
    let y0 = this.canvas.width() / 2;
    let x0 = this.canvas.height() / 2;
    let len = -0.75 * Math.min(y0, x0);
    let axes = [
        [ 
          Math.round(len * this.Axx + x0), 
          Math.round(y0), 
          len * this.Azx, 
          this.axisXColor
        ],
        [ 
          Math.round(len * this.Axy + x0), 
          Math.round(len * this.Ayy + y0), 
          len * this.Azy, 
          this.axisYColor
        ],
        [ 
          Math.round(len * this.Axz + x0), 
          Math.round(len * this.Ayz + y0), 
          len * this.Azz, 
          this.axisZColor
        ]
      ];
    axes.sort((a, b) => { return a[2] - b[2]; });  
    
    this.context.lineWidth = this.axesWidth;
    for (let i = 0; i < 3; ++i) {
      let x = axes[i][0];
      let y = axes[i][1];
      this.context.strokeStyle = axes[i][3];
      this.context.beginPath();
      this.context.moveTo(y0, x0);
      this.context.lineTo(y, x);
      this.context.closePath();
      this.context.stroke();
    }
  }
  
  
  
  //-----------------------------------------------------------
  // 
  // observer pattern
  // 
  //-----------------------------------------------------------
  
  // add an event handler
  on(event, handler) {
    let handlers = this.handlers.get(event);
    if (handlers) {
      handlers.push(handler);
    }
  }
  
  // remove an event handler
  off(event, handler) {
    let handlers = this.handlers.get(event);
    if (handlers) {
      let index = handlers.indexOf(handler);
      if (index != -1) handlers.splice(index, 1);
    }
  }
  
  // fire events
  _dispatch(event, data) {
    let handlers = this.handlers.get(event);
    if (handlers) {
      for (let handler of handlers) {
        handler(data);
      }
    }
  }
  
  _getEventData(type, success) {
    return {
      type: type,
      data: this._getBuddhabrotParams(),
      success: success
    };
  }
}





