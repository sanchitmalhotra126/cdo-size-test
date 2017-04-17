/** @file Playground Component setup tests */
import five from '@code-dot-org/johnny-five';
import Playground from 'playground-io';
import {expect} from '../../../../util/configuredChai';
import sinon from 'sinon';
import {
  createCircuitPlaygroundComponents,
  destroyCircuitPlaygroundComponents,
  componentConstructors,
} from '@cdo/apps/lib/kits/maker/PlaygroundComponents';
import Piezo from '@cdo/apps/lib/kits/maker/Piezo';
import TouchSensor from '@cdo/apps/lib/kits/maker/TouchSensor';
import {
  CP_ACCEL_STREAM_ON,
  CP_COMMAND,
  TOUCH_PINS
} from '@cdo/apps/lib/kits/maker/PlaygroundConstants';

// Polyfill node's process.hrtime for the browser, gets used by johnny-five.
process.hrtime = require('browser-process-hrtime');

describe('Circuit Playground Components', () => {
  let board, clock, intervalKey;

  beforeEach(() => {
    board = newBoard();

    // Give thermometer an initial value so it can finish initialization in tests.
    const originalThermometerInitialize = Playground.Thermometer.initialize.value;
    sinon.stub(Playground.Thermometer.initialize, 'value')
      .callsFake(function (opts, dataHandler) {
        originalThermometerInitialize.call(this, opts, dataHandler);
        // 235 raw sensor value = 0C = 32F
        dataHandler(235);
      });

    // Use 100x accelerated time in these tests
    // We need time to pass for sensors to send back readings
    // during initialization
    intervalKey = setInterval(() => clock.tick(1000), 10);
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
    clearInterval(intervalKey);
    Playground.Thermometer.initialize.value.restore();
  });

  describe(`createCircuitPlaygroundComponents()`, () => {
    it(`returns an exact set of expected components`, () => {
      // This test is here to warn us if we add a new component but
      // don't cover it with new tests.  If that happens, make sure you
      // add matching tests below!
      return createCircuitPlaygroundComponents(board).then(components => {
        expect(Object.keys(components)).to.deep.equal([
           'colorLeds',
            'led',
            'toggleSwitch',
            'buzzer',
            'soundSensor',
            'lightSensor',
            'tempSensor',
            'accelerometer',
            'buttonL',
            'buttonR',
            // TODO (captouch): Restore when we re-enable
            // 'touchPad0',
            // 'touchPad1',
            // 'touchPad2',
            // 'touchPad3',
            // 'touchPad6',
            // 'touchPad9',
            // 'touchPad10',
            // 'touchPad12',
        ]);
      });
    });

    it('can initialize a second set of components with a second board', () => {
      // Checks a necessary condition for a true johnny-five level reset.
      const boardOne = newBoard();
      const boardTwo = newBoard();
      return Promise.all([
        createCircuitPlaygroundComponents(boardOne),
        createCircuitPlaygroundComponents(boardTwo),
      ]).then(([componentsOne, componentsTwo]) => {
        expect(componentsOne.led.board === boardOne).to.be.true;
        expect(componentsTwo.led.board === boardTwo).to.be.true;
      });
    });

    describe('colorLeds', () => {
      it('creates an array of controllers', () => {
        return createCircuitPlaygroundComponents(board).then(({colorLeds}) => {
          expect(colorLeds).to.be.an.instanceOf(Array);
          expect(colorLeds).to.have.length(10);
        });
      });

      // Describe each Led by key/pin
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(pin => {
        describe(`colorLeds[${pin}]`, () => {
          let led;

          beforeEach(() => {
            return createCircuitPlaygroundComponents(board)
              .then(({colorLeds}) => led = colorLeds[pin]);
          });

          it('creates a five.Led.RGB', () => {
            expect(led).to.be.an.instanceOf(five.Led.RGB);
          });

          it('bound to the board controller', () => {
            expect(led.board).to.equal(board);
          });

          it(`on pin ${pin}`, () => {
            expect(led.pin).to.equal(pin);
          });
        });
      });

      // Note: The Mozilla color value documentation was very
      // helpful when writing these tests:
      // https://developer.mozilla.org/en-US/docs/Web/CSS/color_value
      describe('that each accept color formats', () => {
        let led;
        beforeEach(() => {
          return createCircuitPlaygroundComponents(board)
            .then(({colorLeds}) => led = colorLeds[0]);
        });

        it('hexadecimal color "#306090"', () => {
          led.color('#306090');
          expect(led.color()).to.deep.equal({
            red: 0x30,
            green: 0x60,
            blue: 0x90,
          });
        });

        it('CSS1 color keywords "lime"', () => {
          led.color('lime');
          expect(led.color()).to.deep.equal({
            red: 0x00,
            green: 0xff,
            blue: 0x00,
          });
        });

        it('CSS2 color keywords "orange"', () => {
          led.color('orange');
          expect(led.color()).to.deep.equal({
            red: 0xff,
            green: 0xa5,
            blue: 0x00,
          });
        });

        it('CSS3 color keywords "chocolate"', () => {
          led.color('chocolate');
          expect(led.color()).to.deep.equal({
            red: 0xd2,
            green: 0x69,
            blue: 0x1e,
          });
        });

        it('CSS4 color keywords "rebeccapurple"', () => {
          // See: https://codepen.io/trezy/post/honoring-a-great-man
          led.color('rebeccapurple');
          expect(led.color()).to.deep.equal({
            red: 0x66,
            green: 0x33,
            blue: 0x99,
          });
        });

        it('CSS functional notation "rgb(30, 60, 90)"', () => {
          led.color('rgb(30, 60, 90)');
          expect(led.color()).to.deep.equal({
            red: 30,
            green: 60,
            blue: 90,
          });
        });

        it('CSS functional notation "rgba(30, 60, 90, 0.5)"', () => {
          led.color('rgba(30, 60, 90, 0.5)');
          expect(led.color()).to.deep.equal({
            red: 15,
            green: 30,
            blue: 45,
          });
        });

        it('CSS4 functional notation "rgb(30, 60, 90, 0.5)"', () => {
          led.color('rgb(30, 60, 90, 0.5)');
          expect(led.color()).to.deep.equal({
            red: 15,
            green: 30,
            blue: 45,
          });
        });

        it('CSS4 functional notation "rgba(30, 60, 90)"', () => {
          led.color('rgba(30, 60, 90)');
          expect(led.color()).to.deep.equal({
            red: 30,
            green: 60,
            blue: 90,
          });
        });

        it('Array of color values [30, 60, 90]', () => {
          led.color([30, 60, 90]);
          expect(led.color()).to.deep.equal({
            red: 30,
            green: 60,
            blue: 90,
          });
        });

        it('Color object {red: 30, green: 60, blue: 90}', () => {
          led.color({red: 30, green: 60, blue: 90});
          expect(led.color()).to.deep.equal({
            red: 30,
            green: 60,
            blue: 90,
          });
        });

        it('Separate color arguments (30, 60, 90)', () => {
          led.color(30, 60, 90);
          expect(led.color()).to.deep.equal({
            red: 30,
            green: 60,
            blue: 90,
          });
        });
      });
    });

    describe('led', () => {
      let led;

      beforeEach(() => {
        return createCircuitPlaygroundComponents(board)
          .then((components) => led = components.led);
      });

      it('creates a five.Led', () => {
        expect(led).to.be.an.instanceOf(five.Led);
      });

      it('bound to the board controller', () => {
        expect(led.board).to.equal(board);
      });

      it('on pin 13', () => {
        expect(led.pin).to.equal(13);
      });
    });

    describe('toggleSwitch', () => {
      let toggleSwitch;

      beforeEach(() => {
        return createCircuitPlaygroundComponents(board)
          .then((components) => toggleSwitch = components.toggleSwitch);
      });

      it('creates a five.Switch', () => {
        expect(toggleSwitch).to.be.an.instanceOf(five.Switch);
      });

      it('bound to the board controller', () => {
        expect(toggleSwitch.board).to.equal(board);
      });

      it('on pin 21', () => {
        expect(toggleSwitch.pin).to.equal(21);
      });

      // Note to self: Possible bug with toggleswitch.close event when it was
      // open on app start?
    });

    describe('buzzer', () => {
      let buzzer;

      beforeEach(() => {
        return createCircuitPlaygroundComponents(board)
          .then((components) => buzzer = components.buzzer);
      });

      it('creates a Piezo (our own wrapper around five.Piezo)', () => {
        expect(buzzer).to.be.an.instanceOf(Piezo);
        expect(buzzer).to.be.an.instanceOf(five.Piezo);
      });

      it('bound to the board controller', () => {
        expect(buzzer.board).to.equal(board);
      });

      it('on pin 5', () => {
        expect(buzzer.pin).to.equal(5);
      });

      // See PiezoTest.js for more on our Piezo wrapper
    });

    describe('soundSensor', () => {
      const pin = 4;
      const initialValue = 55;
      let soundSensor;

      beforeEach(() => {
        // Provide a fake analog reading during initialization
        setTimeout(() => setRawAnalogValue(pin, initialValue), 0);
        return createCircuitPlaygroundComponents(board).then((components) => {
          soundSensor = components.soundSensor;
        });
      });

      it('creates a five.Sensor', () => {
        expect(soundSensor).to.be.an.instanceOf(five.Sensor);
      });

      it('bound to the board controller', () => {
        expect(soundSensor.board).to.equal(board);
      });

      it('on pin 4', () => {
        expect(soundSensor.pin).to.equal(4);
      });

      it('with sensor methods', () => {
        expect(soundSensor).to.haveOwnProperty('start');
        expect(soundSensor).to.haveOwnProperty('getAveragedValue');
        expect(soundSensor).to.haveOwnProperty('setScale');
      });

      it('with a non-null value immediately after initialization', () => {
        expect(soundSensor.value).not.to.be.null;
        expect(soundSensor.value).to.equal(initialValue);
      });

      describe('setScale', () => {
        it('adjusts the range of values provided by .value', () => {
          // Before setting scale, raw values are passed through to .value
          setRawAnalogValue(pin, 0);
          expect(soundSensor.value).to.equal(0);
          setRawAnalogValue(pin, 500);
          expect(soundSensor.value).to.equal(500);
          setRawAnalogValue(pin, 1023);
          expect(soundSensor.value).to.equal(1023);

          soundSensor.setScale(0, 100);

          // After setting scale, raw values are mapped to the new range
          setRawAnalogValue(pin, 0);
          expect(soundSensor.value).to.equal(0);
          setRawAnalogValue(pin, 512);
          expect(soundSensor.value).to.equal(50);
          setRawAnalogValue(pin, 1023);
          expect(soundSensor.value).to.equal(100);
        });

        it('clamps values provided by .value to the given range', () => {
          // Before setting scale, values are not clamped
          // (although this should not be necessary)
          setRawAnalogValue(pin, -1);
          expect(soundSensor.value).to.equal(-1);
          setRawAnalogValue(pin, 1024);
          expect(soundSensor.value).to.equal(1024);

          soundSensor.setScale(0, 100);

          // Afterward, values ARE clamped
          setRawAnalogValue(pin, -1);
          expect(soundSensor.value).to.equal(0);
          setRawAnalogValue(pin, 1024);
          expect(soundSensor.value).to.equal(100);
        });

        it('rounds values provided by .value to integers', () => {
          // Before setting scale, raw values are not rounded
          // (although this should not be necessary)
          setRawAnalogValue(pin, Math.PI);
          expect(soundSensor.value).to.equal(Math.PI);
          setRawAnalogValue(pin, 543.21);
          expect(soundSensor.value).to.equal(543.21);

          soundSensor.setScale(0, 100);

          // Afterward, only integer values are returned
          for (let i = 0; i < 1024; i++) {
            setRawAnalogValue(pin, i);
            expect(soundSensor.value % 1).to.equal(0);
          }
        });
      });
    });

    describe('tempSensor', () => {
      let tempSensor;

      beforeEach(() => {
        return createCircuitPlaygroundComponents(board)
          .then((components) => tempSensor = components.tempSensor);
      });

      it('creates a five.Thermometer', () => {
        expect(tempSensor).to.be.an.instanceOf(five.Thermometer);
      });

      it('bound to the board controller', () => {
        expect(tempSensor.board).to.equal(board);
      });

      it('on pin 0', () => {
        expect(tempSensor.pin).to.equal(0);
      });

      it('with a F (farenheit) property', () => {
        expect(tempSensor).to.have.ownProperty('F');
      });

      it('and a C (celsius) property', () => {
        expect(tempSensor).to.have.ownProperty('C');
      });

      it('with non-null values immediately after initialization', () => {
        // This test depends on the fake initial thermometer reading
        // set up in the beforeEach block at the top  of this file.
        expect(tempSensor.F).not.to.be.null;
        expect(tempSensor.F).to.equal(32);
        expect(tempSensor.C).not.to.be.null;
        expect(tempSensor.C).to.equal(0);
      });

    });

    describe('lightSensor', () => {
      const pin = 5;
      const initialValue = 56;
      let lightSensor;

      beforeEach(() => {
        // Provide a fake analog reading during initialization
        setTimeout(() => setRawAnalogValue(pin, initialValue), 0);
        return createCircuitPlaygroundComponents(board).then((components) => {
          lightSensor = components.lightSensor;
        });
      });

      it('creates a five.Sensor', () => {
        expect(lightSensor).to.be.an.instanceOf(five.Sensor);
      });

      it('bound to the board controller', () => {
        expect(lightSensor.board).to.equal(board);
      });

      it('on pin 5', () => {
        expect(lightSensor.pin).to.equal(5);
      });

      it('with sensor methods', () => {
        expect(lightSensor).to.haveOwnProperty('start');
        expect(lightSensor).to.haveOwnProperty('getAveragedValue');
        expect(lightSensor).to.haveOwnProperty('setScale');
      });

      it('with a non-null value immediately after initialization', () => {
        expect(lightSensor.value).not.to.be.null;
        expect(lightSensor.value).to.equal(initialValue);
      });

      describe('setScale', () => {
        it('adjusts the range of values provided by .value', () => {
          // Before setting scale, raw values are passed through to .value
          setRawAnalogValue(pin, 0);
          expect(lightSensor.value).to.equal(0);
          setRawAnalogValue(pin, 500);
          expect(lightSensor.value).to.equal(500);
          setRawAnalogValue(pin, 1023);
          expect(lightSensor.value).to.equal(1023);

          lightSensor.setScale(0, 100);

          // After setting scale, raw values are mapped to the new range
          setRawAnalogValue(pin, 0);
          expect(lightSensor.value).to.equal(0);
          setRawAnalogValue(pin, 512);
          expect(lightSensor.value).to.equal(50);
          setRawAnalogValue(pin, 1023);
          expect(lightSensor.value).to.equal(100);
        });

        it('clamps values provided by .value to the given range', () => {
          // Before setting scale, values are not clamped
          // (although this should not be necessary)
          setRawAnalogValue(pin, -1);
          expect(lightSensor.value).to.equal(-1);
          setRawAnalogValue(pin, 1024);
          expect(lightSensor.value).to.equal(1024);

          lightSensor.setScale(0, 100);

          // Afterward, values ARE clamped
          setRawAnalogValue(pin, -1);
          expect(lightSensor.value).to.equal(0);
          setRawAnalogValue(pin, 1024);
          expect(lightSensor.value).to.equal(100);
        });

        it('rounds values provided by .value to integers', () => {
          // Before setting scale, raw values are not rounded
          // (although this should not be necessary)
          setRawAnalogValue(pin, Math.PI);
          expect(lightSensor.value).to.equal(Math.PI);
          setRawAnalogValue(pin, 543.21);
          expect(lightSensor.value).to.equal(543.21);

          lightSensor.setScale(0, 100);

          // Afterward, only integer values are returned
          for (let i = 0; i < 1024; i++) {
            setRawAnalogValue(pin, i);
            expect(lightSensor.value % 1).to.equal(0);
          }
        });
      });
    });

    describe('buttonL', () => {
      let buttonL;

      beforeEach(() => {
        return createCircuitPlaygroundComponents(board)
          .then(components => buttonL = components.buttonL);
      });

      it('creates a five.Button', () => {
        expect(buttonL).to.be.an.instanceOf(five.Button);
      });

      it('bound to the board controller', () => {
        expect(buttonL.board).to.equal(board);
      });

      it('on pin 4', () => {
        expect(buttonL.pin).to.equal(4);
      });

      it('with an isPressed property', () => {
        expect(buttonL).to.haveOwnProperty('isPressed');
        expect(buttonL.isPressed).to.be.false;
      });
    });

    describe('buttonR', () => {
      let buttonR;

      beforeEach(() => {
        return createCircuitPlaygroundComponents(board)
          .then(components => buttonR = components.buttonR);
      });

      it('creates a five.Button', () => {
        expect(buttonR).to.be.an.instanceOf(five.Button);
      });

      it('bound to the board controller', () => {
        expect(buttonR.board).to.equal(board);
      });

      it('on pin 19', () => {
        expect(buttonR.pin).to.equal(19);
      });

      it('with an isPressed property', () => {
        expect(buttonR).to.haveOwnProperty('isPressed');
        expect(buttonR.isPressed).to.be.false;
      });
    });

    describe('accelerometer', () => {
      let accelerometer;

      beforeEach(() => {
        return createCircuitPlaygroundComponents(board)
          .then(components => accelerometer = components.accelerometer);
      });

      it('creates a five.Accelerometer', () => {
        expect(accelerometer).to.be.an.instanceOf(five.Accelerometer);
      });

      it('bound to the board controller', () => {
        expect(accelerometer.board).to.equal(board);
      });

      // No pin?  Doesn't report one.

      it('with a start() method', () => {
        accelerometer.io.sysexCommand.reset(); // Reset spy
        expect(accelerometer).to.haveOwnProperty('start');
        expect(accelerometer.io.sysexCommand).not.to.have.been.called;

        accelerometer.start();
        expect(accelerometer.io.sysexCommand).to.have.been.calledOnce
            .and.calledWith([CP_COMMAND, CP_ACCEL_STREAM_ON]);
      });

      it('and a getOrientation method', () => {
        expect(accelerometer).to.haveOwnProperty('getOrientation');
        expect(accelerometer.getOrientation('x')).to.equal(0);
        expect(accelerometer.getOrientation('y')).to.equal(0);
        expect(accelerometer.getOrientation('z')).to.equal(0);
      });

      it('and a getAcceleration method', () => {
        expect(accelerometer).to.haveOwnProperty('getAcceleration');
        expect(accelerometer.getAcceleration('x')).to.equal(0);
        expect(accelerometer.getAcceleration('y')).to.equal(0);
        expect(accelerometer.getAcceleration('z')).to.equal(0);
        expect(accelerometer.getAcceleration('total')).to.equal(0);
      });
    });

    // TODO (captouch): Un-skip when we re-enable
    describe.skip('touchPads', () => {
      it('only creates one five.Touchpad for all the TouchSensors', () => {
        return createCircuitPlaygroundComponents(board).then(components => {
          const theOnlyTouchpadController = components.touchPad0.touchpadsController_;
          expect(theOnlyTouchpadController.board).to.equal(board);
          TOUCH_PINS.forEach(pin => {
            expect(components[`touchPad${pin}`].touchpadsController_).to.equal(theOnlyTouchpadController);
          });
        });
      });

      TOUCH_PINS.forEach(pin => {
        describe(`touchPin${pin}`, () => {
          let touchPad;

          beforeEach(() => {
            return createCircuitPlaygroundComponents(board).then(components => {
              touchPad = components[`touchPad${pin}`];
            });
          });

          it('creates a TouchSensor', () => {
            expect(touchPad).to.be.an.instanceOf(TouchSensor);
          });

          it(`on pin ${pin}`, () => {
            expect(touchPad.pinIndex_).to.equal(pin);
          });

          // See TouchSensorTest.js for more details on TouchSensors.
        });
      });
    });
  });

  describe('destroyCircuitPlaygroundComponents()', () => {
    let components;

    beforeEach(() => {
      return createCircuitPlaygroundComponents(board)
        .then(c => components = c);
    });

    it('can be safely called on empty object', () => {
      expect(() => {
        destroyCircuitPlaygroundComponents({});
      }).not.to.throw;
    });

    it('destroys everything that createCircuitPlaygroundComponents creates', () => {
      // TODO (captouch): Add 8 when re-enabled
      expect(Object.keys(components)).to.have.length(10);
      destroyCircuitPlaygroundComponents(components);
      expect(Object.keys(components)).to.have.length(0);
    });

    it('does not destroy components not created by createCircuitPlaygroundComponents', () => {
      components.someOtherComponent = {};
      // TODO (captouch): Add 8 when re-enabled
      expect(Object.keys(components)).to.have.length(11);
      destroyCircuitPlaygroundComponents(components);
      expect(Object.keys(components)).to.have.length(1);
      expect(components).to.haveOwnProperty('someOtherComponent');
    });

    it('calls stop on every color LED', () => {
      const spies = components.colorLeds.map(led => sinon.spy(led, 'stop'));
      destroyCircuitPlaygroundComponents(components);
      spies.forEach(spy => expect(spy).to.have.been.calledOnce);
    });

    it('stops Led.RGB.blink()', () => {
      // Spy on 'toggle' which blink calls internally.
      const spy = sinon.spy(components.colorLeds[0], 'toggle');

      // Set up a blink behavior
      components.colorLeds[0].blink(50);
      expect(spy).not.to.have.been.called;

      // Make sure the blink has started
      clock.tick(50);
      expect(spy).to.have.been.calledOnce;
      clock.tick(50);
      expect(spy).to.have.been.calledTwice;

      // Now destroy the component
      destroyCircuitPlaygroundComponents(components);

      // Blink should no longer be calling toggle().
      clock.tick(50);
      expect(spy).to.have.been.calledTwice;
      clock.tick(50);
      expect(spy).to.have.been.calledTwice;
    });

    it('calls stop on the red LED', () => {
      const spy = sinon.spy(components.led, 'stop');
      destroyCircuitPlaygroundComponents(components);
      expect(spy).to.have.been.calledOnce;
    });

    it('stops Led.blink()', () => {
      // Spy on 'toggle' which blink calls internally.
      const spy = sinon.spy(components.led, 'toggle');

      // Set up a blink behavior
      components.led.blink(50);
      expect(spy).not.to.have.been.called;

      // Make sure the blink has started
      clock.tick(50);
      expect(spy).to.have.been.calledOnce;
      clock.tick(50);
      expect(spy).to.have.been.calledTwice;

      // Now destroy the component
      destroyCircuitPlaygroundComponents(components);

      // Blink should no longer be calling toggle().
      clock.tick(50);
      expect(spy).to.have.been.calledTwice;
      clock.tick(50);
      expect(spy).to.have.been.calledTwice;
    });

    it('calls stop on the buzzer', () => {
      const spy = sinon.spy(components.buzzer, 'stop');
      destroyCircuitPlaygroundComponents(components);
      expect(spy).to.have.been.calledOnce;
    });

    describe('stops Piezo.play()', () => {
      let frequencySpy;

      beforeEach(() => {
        // Spy on 'frequency' which play calls internally.
        frequencySpy = sinon.spy(Playground.Piezo.frequency, 'value');
      });

      afterEach(() => {
        frequencySpy.restore();
      });

      it('stops Piezo.play()', function () {
        // Make a new one since we're spying on a 'prototype'
        return createCircuitPlaygroundComponents(board).then(({buzzer}) => {
          // Set up a song
          const tempoBPM = 120;
          buzzer.play(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'], tempoBPM);
          expect(frequencySpy).to.have.been.calledOnce;

          // Make sure the song is playing
          const msPerBeat = 15000 / tempoBPM;
          clock.tick(msPerBeat);
          expect(frequencySpy).to.have.been.calledTwice;
          clock.tick(msPerBeat);
          expect(frequencySpy).to.have.been.calledThrice;

          // Now destroy the component(s)
          destroyCircuitPlaygroundComponents({buzzer});

          // And ensure the song has stopped
          clock.tick(msPerBeat);
          expect(frequencySpy).to.have.been.calledThrice;
          clock.tick(msPerBeat);
          expect(frequencySpy).to.have.been.calledThrice;
        });
      });
    });

    it('calls disable on the soundSensor', () => {
      const spy = sinon.spy(components.soundSensor, 'disable');
      destroyCircuitPlaygroundComponents(components);
      expect(spy).to.have.been.calledOnce;
    });

    it('calls disable on the lightSensor', () => {
      const spy = sinon.spy(components.lightSensor, 'disable');
      destroyCircuitPlaygroundComponents(components);
      expect(spy).to.have.been.calledOnce;
    });

    it('calls stop on the accelerometer', () => {
      // Spy on the controller template, because stop() ends up readonly on
      // the returned component.
      const spy = sinon.spy(Playground.Accelerometer.stop, 'value');
      return createCircuitPlaygroundComponents(board).then(components => {
        destroyCircuitPlaygroundComponents(components);

        let assertionError;
        try {
          expect(spy).to.have.been.calledOnce;
        } catch (e) {
          assertionError = e;
        }

        spy.restore();
        if (assertionError) {
          throw assertionError;
        }
      });
    });
  });

  describe(`componentConstructors`, () => {
    it('contains a five.Board constructor', () => {
      expect(Object.values(componentConstructors)).to.contain(five.Board);
    });

    it('contains a constructor for every created component', () => {
      const constructors = Object.values(componentConstructors);

      function isPlainObject(obj) {
        // Check whether the constructor is native object
        return obj.constructor === ({}).constructor;
      }

      // Recursively walk component map to check all components
      function hasNeededConstructors(x) {
        if (Array.isArray(x)) {
          x.forEach(hasNeededConstructors);
        } else if (isPlainObject(x)) {
          Object.values(x).forEach(hasNeededConstructors);
        } else {
          expect(constructors).to.contain(x.constructor);
        }
      }

      return createCircuitPlaygroundComponents(board).then(components => {
        hasNeededConstructors(components);
      });
    });

    it('uses the constructor name', () => {
      Object.keys(componentConstructors).forEach(key => {
        expect(key).to.equal(componentConstructors[key].name);
      });
    });
  });

  /**
   * Simulate a raw value coming back from the board on the given pin.
   * @param {number} pin
   * @param {number} rawValue - usually in range 0-1023.
   * @throws if nothing is monitoring the given analog pin
   */
  function setRawAnalogValue(pin, rawValue) {
    const readCallback = board.io.analogRead.args.find(callArgs => callArgs[0] === pin)[1];
    readCallback(rawValue);
  }
});

/**
 * Generate a test board object.
 * From rwaldron/johnny-five's newBoard() test helper:
 * https://github.com/rwaldron/johnny-five/blob/dd47719/test/common/bootstrap.js#L83
 * @returns {*}
 */
function newBoard() {
  // We use real playground-io, but our test configuration swaps in mock-firmata
  // for real firmata (see webpack.js) changing Playground's parent class.
  const io = new Playground({});

  io.SERIAL_PORT_IDs.DEFAULT = 0x08;

  // mock-firmata doesn't implement these (yet) - and we want to monitor how
  // they get called.
  io.sysexCommand = sinon.spy();
  io.sysexResponse = sinon.spy();

  // Spy on this so we can retrieve and use the registered callbacks if needed
  sinon.spy(io, 'analogRead');

  const board = new five.Board({
    io: io,
    debug: false,
    repl: false
  });

  io.emit("connect");
  io.emit("ready");

  return board;
}
