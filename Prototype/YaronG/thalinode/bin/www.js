#!/usr/bin/env node

"use strict";

var debug = require("debug")("thalinode"),
    morgan = require('morgan'),
    express = require("express"),
    app = express(),
    PouchDB = require("pouchdb"),
    cryptoUtilities = require("../lib/crypto-utilities.js"),
    localNpmDB = new PouchDB("localNPM"),
    //skimdb = "https://skimdb.npmjs.com/registry",
    skimdb = "http://skimdb.iriscouch.com/registry",
    request = require('requestretry'),
    remoteNpmDB = new PouchDB(skimdb, { ajax: {gzip: true, pool: {maxSockets: 15},
        timeout: 5 * 60 * 1000, maximumWait: 5 * 60 * 1000, forever: false, maxAttempts: 5, retryDelay: 5,
        retryStrategy: request.RetryStrategies.HTTPOrNetworkError}});

localNpmDB.info().then(function(value) {debug("localNpmDB - " + JSON.stringify(value));});
var pouchEvent = PouchDB.replicate(remoteNpmDB, localNpmDB, {live: false, batch_size: 1000})
    .on('change', function(info) {
        debug("Change - " + JSON.stringify(info));
    })
    .on('complete', function(info) {
        debug("Complete - " + JSON.stringify(info) );
    })
    .on('uptodate', function(info) {
        debug("uptodate - " + JSON.stringify(info));
    })
    .on('error', function(err) {
        debug("error - " + JSON.stringify(err));
    });

//Put a record in PouchDB to force use to use level DB
//app.post('/slowtest', function(req, res) {
////    console.log("Got request " + req.query.title + " at " + new Date().getTime());
//    setTimeout(function() {
//        res.send("hi!");
////        console.log("Sent response to " + req.query.title + " at " + new Date().getTime());
//    }, 100);
//});


app.use(morgan("combined"));
app.use("/", require("express-pouchdb")(PouchDB));
app.listen(3000);

//require('http').globalAgent.maxSockets = 1;
//
//var eventHandler = function(title, timeout) {
//    var nameAndDate = function() { return title + " - " + new Date().getTime() + " - "; };
////    console.log("Posting request " + title + " at " + new Date().getTime());
//    request.post({url: "http://192.168.56.1:3000/slowtest?title=" + title , pool: {maxSockets: 1}, timeout: timeout})
//        .on('response', function(response) { console.log("response = " + nameAndDate() + response.statusCode); })
//        .on('error', function(err) { console.log("error = " + nameAndDate() + JSON.stringify(err)); });
//};

//var timeout = 1000;
//for(var i = 0; i < 20000; ++i) {
//    eventHandler(i, timeout);
//}


//var keyBitLength = 4096;
//cryptoUtilities.generateRsaPublicPrivateKeyPairAsPEMEncodedString(keyBitLength).then(function(pemvalue) {
//    console.error(pemvalue);
//}).fail(function(error) {
//    console.error(error);
//});

//    app = require('../app');
//
//app.set("port", process.env.PORT || 3000);
//
//var server = app.listen(app.get("port"), function() {
//  debug("Express server listening on port " + server.address().port);
//});
