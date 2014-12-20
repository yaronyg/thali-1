#!/usr/bin/env node

"use strict";

var debug = require("debug")("thalinode"),
    morgan = require('morgan'),
    express = require("express"),
    app = express(),
    PouchDB = require("pouchdb"),
    cryptoUtilities = require("../lib/crypto-utilities.js"),
    localNpmDB = new PouchDB("localNPM"),
    skimdb = "https://skimdb.npmjs.com/registry",
    //skimdb = "http://skimdb.iriscouch.com/registry",
    request = require('requestretry'),
    remoteNpmDB = new PouchDB(skimdb, { ajax: {gzip: true, pool: {maxSockets: 15},
        timeout: 5 * 60 * 1000, maximumWait: 5 * 60 * 1000, forever: false, maxAttempts: 10, retryDelay: 1000,
        retryStrategy: request.RetryStrategies.HTTPOrNetworkError}}),
    http = require("http"),
    https = require("https"),
    Promise = require("bluebird"),
    S = require("string");

function sync() {
    var pouchEvent = PouchDB.replicate(remoteNpmDB, localNpmDB, {live: false, batch_size: 1000, retry: true,
        retries: 10000})
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
}

//localNpmDB.info().then(function(value) {debug("localNpmDB - " + JSON.stringify(value));});

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

function countEntryTypes() {
    var results = {};

    function countBrokenEntries(doc, emit) {
        function record(tag) {
            if (results[tag] === undefined) {
                results[tag] = 0;
            } else {
                ++results[tag];
            }
        }
        if (!doc["dist-tags"]) {
            if (doc.time && doc.time.unpublished) {
                record("no-dist-tags-unpublished");
            } else {
                record("no-dist-tags-value");
            }
            return;
        }

        if (!doc["dist-tags"].latest) {
            if (doc.time && doc.time.unpublished) {
                record("no-dist-tags-latest-unpublished");
            } else {
                record("no-dist-tags-latest");
            }
            return;
        }

        var latestVersion = doc["dist-tags"].latest;

        if (!doc.versions) {
            record("no-versions-value");
            return;
        }

        if (!doc.versions[latestVersion]) {
            record("no-latest-version");
            return;
        }

        record("good-doc");
    }

    localNpmDB.query({map: countBrokenEntries}, {reduce: false, include_docs: true})
        .then(function(output) {
            console.log(results);
        })
        .catch(function(err) {
            console.log("Error: " + err);
        });
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

function getFromGit(url, resolve, reject) {
    var splitUrl = url.split("/");
    var pathParts = [];
    var pathPartsIndex = 1;
    for (var i = splitUrl.length - 1; i >= 0 && pathPartsIndex >= 0; --i) {
        if (splitUrl[i]) {
            var pathSegment = S(splitUrl[i]);
            if (pathPartsIndex === 1) {
                pathSegment = pathSegment.chompRight(".git");
            }
            pathParts[pathPartsIndex] = pathSegment.s;
            --pathPartsIndex;
        }
    }

    if (pathParts.length === 2) {
        var gitHubUrl = "https://api.github.com/repos/" + pathParts[0] + "/" + pathParts[1] + "/contents/";
        https.get(gitHubUrl,
            function (res) {
                if (res.statusCode === 403) {
                    // Github seems to use this for properly formatted requests that point at nothing
                    resolve(false);
                }

                if (res.statusCode !== 200) {
                    reject("Status code was " + res.statusCode + "for url " + url);
                    return;
                }
                var responseBody = "";
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    responseBody += chunk;
                });
                res.on('end', function () {
                    var output = JSON.parse(responseBody);
                    output.forEach(function (entry) {
                        if (S(entry.name).endsWith(".gyp")) {
                            resolve(true);
                        }
                    });
                    resolve(false);
                });
            }).on('error', function (err) {
                reject("Http error on git - " + err.message);
            });
    } else {
        reject("Bad value = " + url);
    }
}

function designDoc(db) {
    var startTime;
    db.get('_design/goodDocIndex').then(function(doc) {
        goodDocIndex._rev = doc._rev;
        return db.put(goodDocIndex);
    }).catch(function(err) {
        if (err.status !== 404) {
            console.log("Failing error: " + err);
            return;
        }
        return db.put(goodDocIndex);
    }).then(function() {
        startTime = new Date().getTime();
        return db.query('goodDocIndex');
    }).then(function(results) {
        console.log("Runtime: " + (new Date().getTime() - startTime));
        var installs = 0;
        var installsWithGyp = 0;
        var repos = 0;
        var git = {
            gitRepos: 0,
            gitReposStartingWithHttp: 0,
            gitReposStartingWithGit: 0,
            gitReposContainingGitHub: 0,
            githubSitesWithGypInRoot: 0
        };
        Promise.all(results.rows.map(function(doc) {
            return new Promise(function (resolve, reject) {
                var value = doc.value;
                if (value.scripts && value.scripts.install) {
                    installs++;
                    if (value.scripts.install.indexOf("gyp") > -1) {
                        installsWithGyp++;
                    }
                }

                if (value.repository) {
                    repos++;
                    if (value.repository.type === "git") {
                        git.gitRepos++;
                        if (value.repository.url) {
                            if (value.repository.url.indexOf("http") === 0) {
                                git.gitReposStartingWithHttp++;
                            }
                            if (value.repository.url.indexOf("git") === 0) {
                                git.gitReposStartingWithGit++;
                            }
                            if (value.repository.url.indexOf("github") > -1) {
                                git.gitReposContainingGitHub++;
                                getFromGit(value.repository.url, resolve, reject);
                            } else {
                                resolve(false);
                            }
                        }
                    }
                }
            });
        })).then(function(promiseResults) {
            promiseResults.forEach(function(value) {
                if (value) {
                    git.githubSitesWithGypInRoot++;
                }
            });
            console.log("installs = " + installs + ", installs with gyp = " + installsWithGyp);
            console.log(JSON.stringify(git));
        });
    }).catch(function(err) {
        console.log(err);
    });
}

designDoc(localNpmDB);

function areWeDoneYet(startTime) {
    http.get("http://localhost:5984/registry/_design/goodDocIndex/_info", function(res) {
        var responseBody = "";
        res.setEncoding('utf8');
        res.on('data', function(chunk) {
            responseBody += chunk;
        });
        res.on('end', function() {
            var output = JSON.parse(responseBody);
            if (output.view_index.updater_running) {
                setTimeout(function () { areWeDoneYet(startTime);}, 100);
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
        areWeDoneYet(startTime);
    }).then(function(results) {
        console.log("Runtime: " + (new Date().getTime() - startTime));
        console.log(results);
    }).catch(function(err) {
        console.log(err);
    });
}

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
