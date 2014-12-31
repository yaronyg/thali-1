"use strict";

var http = require("http");
var PouchDB = require("pouchdb");
var Promise = require("bluebird");

// Let's create an index with just a map that outputs as the key the _id of the input record
// and the value will be the latest version. We'll calculate that by looking for dist-tags/latest and then
// using that value in versions and output the specific version data
function mapToLatestVersion(doc, emit) {
    if (!doc["dist-tags"] || !doc["dist-tags"].latest) {
        console.log("No latest for " + doc._id);
        return;
    }

    var latestVersion = doc["dist-tags"].latest;

    if (!doc.versions || !doc.versions[latestVersion]) {
        console.log("No latest version for " + doc._id);
        return;
    }

    emit(doc._id, doc.versions[latestVersion]);
}

var goodDocIndex = {
    _id: '_design/goodDocIndex',
    views: {
        'goodDocIndex': {
            map: function(doc) {
                if (!doc["dist-tags"] || !doc["dist-tags"].latest) {
//                    console.log("No latest for " + doc._id);
                    return;
                }

                var latestVersion = doc["dist-tags"].latest;

                if (!doc.versions || !doc.versions[latestVersion]) {
//                    console.log("No latest version for " + doc._id);
                    return;
                }

                emit(doc._id, doc.versions[latestVersion]);
            }.toString()
        }
    }
};

function designDoc(db) {
    return db.get('_design/goodDocIndex').then(function (doc) {
        goodDocIndex._rev = doc._rev;
        return db.put(goodDocIndex);
    }).catch(function (err) {
        if (err.status !== 404) {
            console.log("Failing error: " + err);
            return;
        }
        return db.put(goodDocIndex);
    });
}

exports.designDoc = designDoc;


function seeIfLocalCouchDbIndexGenerationIsDone(startTime) {
    http.get("http://localhost:5984/registry/_design/goodDocIndex/_info", function(res) {
        var responseBody = "";
        res.setEncoding('utf8');
        res.on('data', function(chunk) {
            responseBody += chunk;
        });
        res.on('end', function() {
            var output = JSON.parse(responseBody);
            if (output.view_index.updater_running) {
                setTimeout(function () { seeIfLocalCouchDbIndexGenerationIsDone(startTime); }, 100);
            } else {
                console.log("Runtime: " + (new Date().getTime() - startTime));
            }
        });
    });

}

function couchDesignDoc() {
    var db = new PouchDB("http://localhost:5984/registry/");
    var startTime;
    db.get('_design/goodDocIndex').then(function(doc) {
        return Promise.reject("Go delete and clean up the bloody view!");
    }).catch(function(err) {
        if (err.status !== 404) {
            return Promise.reject("Huh? " + err);
        }
        return db.put(goodDocIndex);
    }).then(function() {
        startTime = new Date().getTime();
        return db.query('goodDocIndex', {limit: 10});
    }).catch(function(err) {
        if (err.status !== 400) {
            console.log("Failing error, we should have gotten a timeout: " + err);
            return;
        }
        seeIfLocalCouchDbIndexGenerationIsDone(startTime);
    }).then(function(results) {
        console.log("Runtime: " + (new Date().getTime() - startTime));
        console.log(results);
    }).catch(function(err) {
        console.log(err);
    });
}

exports.couchDesignDoc = couchDesignDoc;