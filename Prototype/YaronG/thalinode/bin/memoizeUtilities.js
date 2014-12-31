"use strict";

var Promise = require("bluebird");

function memoizeInDb(memoizeDb, docId, fieldName, dataProducingFunction) {
    return new Promise(function(resolve, reject) {
        memoizeDb.get(docId, function(err, doc) {
            if (doc && doc[fieldName]) {
                resolve(doc[fieldName]);
                return;
            }

            var functionOutput;
            var newDoc;

            dataProducingFunction()
                .then(function(result) {
                    functionOutput = result;
                    newDoc = doc || { _id: docId };
                    newDoc[fieldName] = functionOutput;
                    return memoizeDb.put(newDoc);
                }).then(function() {
                    return resolve(functionOutput);
                }).catch(function(err) {
                    return reject(err);
                });
        });
    });
}

exports.memoizeInDb = memoizeInDb;