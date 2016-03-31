var fs     = require('fs'),
    _      = require('lodash'),
    stream = require('stream');

var streamUtils = require_src('utils').stream;

describe('utils.stream', function() {
  describe('.readFileToObjectStream()', function() {
    beforeEach(function() {
      spyOn(fs, 'readFile').and.callFake(function(file, callback) {
        _.delay(function() { callback(null, 'test-file-content'); }, 100);
      });
    });

    describe('when the parsed content is an object', function() {
      it('streams the object through', function(done) {
        streamUtils.readFileToObjectStream('test/file', function(data) {
          return { obj: data };
        })
        .on('data', function(obj) {
          expect(obj).toEqual({ obj: 'test-file-content' });
        })
        .once('end', done);
      });
    });

    describe('when the parsed content is not an object', function() {
      it('returns an empty stream', function(done) {
        var data = null;
        streamUtils.readFileToObjectStream('test/file', function() {})
        .on('data', function(obj) { data = obj; })
        .once('end', function() {
          expect(data).toBeNull();
          done();
        });
      });
    });

    describe('when an error occurs reading the file', function() {
      it('generates an error in the stream', function(done) {
        fs.readFile.and.callFake(function(file, callback) {
          _.delay(function() {
            callback(new Error('Something went wrong'), null);
          });
        });

        streamUtils.readFileToObjectStream('test/file', function() {})
        .on('error', function(err) {
          expect(err.message).toEqual('Something went wrong');
          done();
        })
      });
    });
  });

  describe('.reduceToObjectStream()', function() {
    describe('when the parsed stream is an object', function() {
      it('streams through the object', function(done) {
        var input = new stream.PassThrough();

        input.pipe(streamUtils.reduceToObjectStream(function(data) {
          return { obj: data.toString() };
        }))
        .on('data', function(obj) {
          expect(obj).toEqual({ obj: 'test-stream-content' });
        })
        .once('end', done);

        _.each(['test-', 'stream-', 'content'], function(s) {
          input.write(s);
        });
        input.end();
      });
    });

    describe('when the parsed stream is not an object', function() {
      it('returns an empty stream', function(done) {
        var data = null;
        var input = new stream.PassThrough();
        input.pipe(streamUtils.reduceToObjectStream(function() {}))
        .on('data', function(obj) { data = obj; })
        .once('end', function() {
          expect(data).toBeNull();
          done();
        });

        input.write("test");
        input.end();
      });
    });
  });

  describe('.streamToPromise()', function() {
    describe('with a readable stream', function() {
      it('returns a promise that completes when the stream ends', function(done) {
        var completed = false;
        var readable = new stream.PassThrough();
        readable.on('end', function() { completed = true; });

        streamUtils.streamToPromise(readable).then(function() {
          expect(completed).toBe(true);
          done();
        });

        readable.resume();
        readable.push('something');
        readable.push(null);
      });

      it('returns a promise that fails when the stream emits an error', function(done) {
        var readable = new stream.PassThrough();
        streamUtils.streamToPromise(readable).catch(function(err) {
          expect(err.message).toEqual('Something went wrong');
          done();
        });

        readable.push('something');
        readable.emit('error', new Error('Something went wrong'));
      });
    });

    describe('with a writable stream', function() {
      it('returns a promise that completes when the stream finishes', function(done) {
        var completed = false;
        var writable = new stream.PassThrough();
        writable.on('finish', function() { completed = true; });

        streamUtils.streamToPromise(writable).then(function() {
          expect(completed).toBe(true);
          done();
        });

        writable.write('something');
        writable.end();
      });

      it('returns a promise that fails when the stream emits an error', function(done) {
        var writable = new stream.PassThrough();

        streamUtils.streamToPromise(writable).catch(function(err) {
          expect(err.message).toEqual('Something went wrong');
          done();
        });

        writable.write('something');
        writable.emit('error', new Error('Something went wrong'));
      });
    });

    describe('with an invalid stream', function() {
      it('returns a promise that fails', function() {
        streamUtils.streamToPromise("not really a stream").catch(function(err) {
          expect(err.message).toEqual('Not a valid stream');
          done();
        });
      });
    });
  });

  describe('.streamToArray()', function() {
    it('collects all stream chunks into an array', function(done) {
      var readable = new stream.PassThrough();

      streamUtils.streamToArray(readable).then(function(data) {
        expect(data.join(' ')).toEqual('not many things');
        done();
      });

      readable.push('not');
      readable.push('many');
      readable.push('things');
      readable.push(null);
    });

    it('fails if the stream emits an error', function(done) {
      var readable = new stream.PassThrough();

      streamUtils.streamToArray(readable).catch(function(err) {
        expect(err.message).toEqual('Something went wrong');
        done();
      });

      readable.push('not');
      readable.push('many');
      readable.emit('error', new Error('Something went wrong'));
    });
  });
});
