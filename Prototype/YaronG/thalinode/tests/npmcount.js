"use strict";

/* global describe, it */

// The goal is to figure out how many NPM projects use native code

var chai = require("chai"),
    chaiAsPromised = require("chai-as-promised"),
    expect = require("chai").expect,
    assert = chai.assert,
    PouchDB = require("pouchdb"),
    localNpmDB = new PouchDB("localNPM"), //, {ajax: { proxy: 'http://127.0.0.1:8888'}});
    request = require("request"),
    q = require('q');

chai.use(chaiAsPromised);

describe.only("Testing silly foreach issue", function() {
    it("should enumerate fine even if I delete entries we have already iterated over", function () {
        var testArray = ["a", "b", "c", "d", "e", "f", "g"];
        var newArray = [];
        Object.keys(testArray).map(function (key) {
            console.log("Key is " + key);
            newArray.push(testArray[key]);
            delete testArray[key];
        });
        console.log("Contents of testArray" + testArray);
        console.log("Contents of newArray" + newArray);
    });
});

describe("Testing request3", function() {
    it("should make a get request", function(done) {
        this.timeout(10000);
        var totalRequests = 200,
            requestsSoFar = 0,
            startTime = new Date().getTime();

        //var baseRequest = request.defaults({pool: {maxSockets: 5}});

        for(var i = 0; i < totalRequests; ++i) {
            request.get("http://127.0.0.1:5984/delme", {proxy: "http://127.0.0.1:8888"})
                .on('response', function(response) {
                    expect(response).to.have.property('statusCode', 200);
                    ++requestsSoFar;
                    if (requestsSoFar === totalRequests) {
                        console.log("Elapsed time - " + (new Date().getTime() - startTime));
                        done();
                    }
                })
                .on('error', function(err) { done(err); });
        }
    });
});

describe("Loading NPM", function() {
   it("Should load fine", function() {
        this.timeout(100000000);

       //function getLatestVersion(doc) {
       //    var latest = doc["dist-tags"] ? doc["dist-tags"].latest : null;
       //    if (latest === null) return;
       //    for(var version in doc.versions) {
       //        if (version[latest]) {
       //            emit version[latest];
       //        }
       //    }
       //}
       //
       //function map(doc) {
       //    getLatestVersion(doc);
       //}
       //
       //localNpmDB.query({map: map}, {reduce: false})
       //    .then(function(result) { console.log(JSON.stringify(result));})
       //    .error(function(err) { console.log(JSON.stringify(err));});

       var remoteNpmDB = new PouchDB("https://skimdb.npmjs.com/registry/", { ajax: {gzip: true}}); //, {ajax: { proxy: 'http://127.0.0.1:8888'}});
       //assert.isFulfilled(remoteNpmDB.allDocs({include_docs: true}));
       //expect(remoteNpmDB.info()).to.eventually.have.property("doc_count");
       //remoteNpmDB.info().then(function(value) {console.log(value);});

       //remoteNpmDB.allDocs({include_docs:true, limit:10}).then(function(value) { console.log(JSON.stringify(value)); });

       //localNpmDB.info().then(function(value) {console.log("localNpmDB - " + JSON.stringify(value));});

       var pouchEvent = PouchDB.replicate(remoteNpmDB, localNpmDB, {live: false})
       //var pouchEvent = localNpmDB.replicate.from("https://skimdb.npmjs.com/registry/", {live: false, batch_size: 1, ajax: { proxy: "https://127.0.0.1:8888"}})
           .on('change', function(info) {
               console.log("Change - " + JSON.stringify(info));
           })
           .on('complete', function(info) {
               console.log("Complete - " + JSON.stringify(info) );
           })
           .on('uptodate', function(info) {
               console.log("uptodate - " + JSON.stringify(info));
           })
           .on('error', function(err) {
               console.log("error - " + JSON.stringify(err));
           });

       //var pouchEvent = localNpmDB.replicate.from("https://skimdb.npmjs.com/registry/", {live: false}).then(function(happy) {
        //    console.log("Happy is " + happy);
        //},
        //function(err) {
        //    console.log("error is " + err);
        //});
        return expect(pouchEvent).to.eventually.satisfy(function(value) {
            console.log("I'm here!")
            return false;
        });
   });
});
