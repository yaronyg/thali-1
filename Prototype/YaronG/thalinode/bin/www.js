#!/usr/bin/env node

"use strict";

var morgan = require('morgan');
var express = require("express");
var app = express();
var PouchDB = require("pouchdb");
var expressPouchDB = require("express-pouchdb");
var localNpmDB = new PouchDB("localNPM");
var _ = require("underscore");
var Immutable = require("immutable");


app.use(morgan("combined"));
app.use("/", expressPouchDB(PouchDB));
app.listen(3000);

//var debug = require("debug")("thalinode"),

//    cryptoUtilities = require("../lib/crypto-utilities.js"),
//    skimdb = "https://skimdb.npmjs.com/registry",
//    //skimdb = "http://skimdb.iriscouch.com/registry",
//    request = require('requestretry'),
//    remoteNpmDB = new PouchDB(skimdb, { ajax: {gzip: true, pool: {maxSockets: 15},
//        timeout: 5 * 60 * 1000, maximumWait: 5 * 60 * 1000, forever: false, maxAttempts: 10, retryDelay: 1000,
//        retryStrategy: request.RetryStrategies.HTTPOrNetworkError}}),
//    http = require("http"),
//    https = require("https"),
//    Promise = require("bluebird"),
//    S = require("string"),
//    url = require("url"),
//    goodDocIndexDb = new PouchDB("goodDocIndexDb"),

//    rp = require('request-promise');
//
//var gitHubIdForUserAgent = "yaronyg";
//

//
//var entriesWithGypFile = [];
//var entriesWithInstallScript = [];
//var entriesWithInstallScriptMentioningGyp = [];
//
//function localGypCount() {
//    localNpmDB.query('goodDocIndex')
//    .then(function(docs) {
//        docs.rows.forEach(function(doc) {
//            var value = doc.value;
//            if (value.gypfile) {
//                entriesWithGypFile.push(doc.key);
//            }
//
//            if (value.scripts && value.scripts.install) {
//                entriesWithInstallScript.push(doc.key);
//                if (value.scripts.install.indexOf("gyp") > -1) {
//                    entriesWithInstallScriptMentioningGyp.push(doc.key);
//                }
//            }
//        });
//        console.log("Total entries = " + docs.rows.length);
//        console.log("Total entries with Gyp File = " + entriesWithGypFile.length);
//        console.log("Total entries with install script = " + entriesWithInstallScript.length);
//        console.log("Total entries with install script mentioning gyp = " + entriesWithInstallScriptMentioningGyp.length);
//        console.log("Size of intersection of install script and gyp file = " +
//        _.intersection(entriesWithGypFile, entriesWithInstallScript).length);
//        console.log("Size of intersection of install script mentioning gyp and gyp file = " +
//        _.intersection(entriesWithGypFile, entriesWithInstallScriptMentioningGyp).length);
//        console.log("Union of entries with gyp file and install script = " +
//        _.union(entriesWithGypFile, entriesWithInstallScript).length);
//        console.log("Union of entries with gyp file and install script mentioning gyp = " +
//        _.union(entriesWithGypFile, entriesWithInstallScriptMentioningGyp).length);
//
//        //var allLocalGypIds =
//        //    _.union(entriesWithGypFile, entriesWithInstallScript, entriesWithInstallScriptMentioningGyp);
//        //
//        //var checkForGitHub = docs.rows.map(function(doc) {
//        //    if (allLocalGypIds[doc.key]) {
//        //        var id = doc.key;
//        //        var value = doc.value;
//        //        if (value.repository && value.repository.type === "git" && value.repository.url &&
//        //            value.repository.url.indexOf("github") > -1) {
//        //            return getFromGitMemoize(id, value.repository.url);
//        //        }
//        //    }
//        //
//        //    return Promise.resolve();
//        //});
//
//        //return Promise.all(checkForGitHub)
//        //.then(function(results) {
//        //    var cleanResults = _.compact(results);
//        //    console.log("Number of entries claiming to be in Github " + results.length);
//        //    var countEmUp = _.reduce(cleanResults, function(memo, doc) {
//        //        if (memo[doc.tag]) {
//        //            ++memo[doc.tag];
//        //        } else {
//        //            memo[doc.tag] = 1;
//        //        }
//        //    }, {});
//        //    console.log("Github counts: " + countEmUp);
//        //});
//    });
//}
//
//localGypCount();





//compareGypDownloadsToDependencySum("engine.io");

//Put a record in PouchDB to force use to use level DB
//app.post('/slowtest', function(req, res) {
////    console.log("Got request " + req.query.title + " at " + new Date().getTime());
//    setTimeout(function() {
//        res.send("hi!");
////        console.log("Sent response to " + req.query.title + " at " + new Date().getTime());
//    }, 100);
//});




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
