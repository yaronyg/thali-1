"use strict";

var PouchDB = require("pouchdb");
var debug = require("debug")("thalinode:remoteUtilities");
var memoize = require("./memoizeUtilities");
var Promise = require("bluebird");
var S = require("string");
var request = require('requestretry');
var http = require("http");
var https = require("https");
var url = require("url");
var rp = require('request-promise');
var _ = require("underscore");

function syncNpm(remoteNpmDB, localNpmDB) {
    return PouchDB.replicate(remoteNpmDB, localNpmDB, {live: false, batch_size: 1000, retry: true,
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

exports.syncNpm = syncNpm;

function getFromGitMemoize(memoizeDb, gitHubIdForUserAgent, rawUrl) {
    return memoize.memoizeInDb(memoizeDb, "gitData", function() {
        return getFromGit(rawUrl, gitHubIdForUserAgent);
    });
}

exports.getFromGitMemoize = getFromGitMemoize;

function taggedResponse(tag, description) {
    return {tag: tag, description: description};
}

function getFromGit(rawUrl, gitHubIdForUserAgent) {
    return new Promise(function(resolve, reject) {
        var splitUrl = rawUrl.split("/");
        var pathParts = [];
        var pathPartsIndex = 1;
        for (var i = splitUrl.length - 1; i >= 0 && pathPartsIndex >= 0; --i) {
            if (splitUrl[i]) {
                var pathSegment = S(splitUrl[i]);
                if (pathPartsIndex === 1) {
                    pathSegment = pathSegment.chompRight(".git");
                }
                if (pathPartsIndex === 0) {
                    pathSegment = pathSegment.chompLeft("git@github.com:");
                }
                pathParts[pathPartsIndex] = pathSegment.s;
                --pathPartsIndex;
            }
        }

        if (pathParts.length === 2) {
            var gitHubUrl = "https://api.github.com/repos/" + pathParts[0] + "/" + pathParts[1] + "/contents/";
            var options = {
                url: gitHubUrl,
                json: true,
                headers: {
                    // Github requires that requests contain a user-agent header with the github ID of the requester
                    "User-Agent": gitHubIdForUserAgent
                },
                maxAttempts: 5,
                retryDelay: 5000,
                retryStrategy: request.RetryStrategies.HTTPOrNetworkError
            };
            request(options,
                function (error, res, body) {
                    if (error) {
                        return reject(error);
                    }

                    if (res.statusCode !== 200) {
                        return resolve(taggedResponse("git_protocol_error", "Status code was " + res.statusCode + "for url " + rawUrl));
                    }
                    body.forEach(function (entry) {
                        if (S(entry.name).endsWith(".gyp")) {
                            return resolve(taggedResponse("found_gyp_file", entry.name));
                        }
                    });
                    return resolve(taggedResponse("no_gyp_file"));
                });
        } else {
            return resolve(taggedResponse("no_good_url", rawUrl));
        }
    });
}


function memoizeGetSizeOfTGZ(memoizeDb, docId, tgzUrl) {
    return memoize.memoizeInDb(memoizeDb, docId, "contentLengthTaggedResponse", function() {
        return getSizeOfTGZ(tgzUrl);
    });
}

exports.memoizeGetSizeOfTGZ = memoizeGetSizeOfTGZ;

function getSizeOfTGZ(tgzUrl) {
    return new Promise(function(resolve, reject) {
        var httpOrHttps = S(tgzUrl).startsWith("https") ? https : http;
        var options = url.parse(tgzUrl);
        options.method = "HEAD";
        http.globalAgent.maxSockets = 20;
        https.globalAgent.maxSockets = 20;
        httpOrHttps.request(options, function(res) {
            if (res.statusCode !== 200) {
                resolve(taggedResponse("tgz_protocol_error", "Status code was" + res.statusCode + "for url " + tgzUrl));
                return;
            }

            var contentLength = res.headers["content-length"];
            if (contentLength) {
                resolve(taggedResponse("content_length", contentLength));
                return;
            }

            resolve(taggedResponse("no_content_length", tgzUrl + " - " + JSON.stringify(res.headers)));
        }).on('error', function(err) {
            resolve(taggedResponse("oops", err.message + "-" + tgzUrl));
        }).end();
    });
}

function countDownloadSizeOfProjects(memoizationDb) {
    function processDoc(doc, emit) {
        var contentResponse = doc.doc.contentLengthTaggedResponse;
        var tag = contentResponse.tag;
        return emit(tag, tag === "content_length" ? S(contentResponse.description).toInt() : 1);
    }

    memoizationDb.query({map: processDoc, reduce: "_sum"}, {include_docs: true})
    .then(function(results) {
        console.log(JSON.stringify(results));
    });
}

exports.countDownloadSizeOfProjects = countDownloadSizeOfProjects;

function getMonthlyDownload(npmName) {
    var baseNpmStatsUrl = "https://api.npmjs.org/downloads/point/last-month/";
    return rp(baseNpmStatsUrl + npmName)
        .then(function(result) {
            return JSON.parse(result).downloads;
        });
}

// get total monthly download for level down
// search through all good entries and pull out projects that have level down as a dependency
//  for each of those entries count their downloads for the last month
//  Sum all those values
// Print both values out

function compareGypDownloadsToDependencySum(localNpmDB, gypDownloadName) {
    var totalDownloadsLastMonthForGypPackage;
    var totalDependencies = 0;
    getMonthlyDownload(gypDownloadName)
        .then(function(monthlyDownloads) {
            totalDownloadsLastMonthForGypPackage = monthlyDownloads;
            return localNpmDB.query('goodDocIndex');
        }).then(function(docs) {
            return Promise.all(docs.rows.map(function(doc) {
                var value = doc.value;
                if (value.dependencies && value.dependencies[gypDownloadName]) {
                    ++totalDependencies;
                    return getMonthlyDownload(doc.id);
                }
                return Promise.resolve();
            }));
        }).then(function(dependentNumbers) {
            var totalDependencyDownloadCount =
                _.chain(dependentNumbers).compact().reduce(function(memo, num) { return memo + num; }, 0).value();
            console.log("Name of gyp package: " + gypDownloadName);
            console.log("Total downloads last month for gyp package: " + totalDownloadsLastMonthForGypPackage);
            console.log("Total dependencies on gyp package we found: " + totalDependencies);
            console.log("Total downloads last month for those dependencies: " + totalDependencyDownloadCount);
        });
}

exports.compareGypDownloadsToDependencySum = compareGypDownloadsToDependencySum;