"use strict";

function countBrokenEntries(doc, emit) {
    if (!doc["dist-tags"]) {
        return emit(doc.time && doc.time.unpublished ? "no-dist-tags-unpublished" : "no-dist-tags-value");
    }

    if (!doc["dist-tags"].latest) {
        return emit(doc.time && doc.time.unpublished ? "no-dist-tags-latest-unpublished" : "no-dist-tags-latest");
    }

    var latestVersion = doc["dist-tags"].latest;

    if (!doc.versions) {
        return emit("no-versions-value");
    }

    if (!doc.versions[latestVersion]) {
        return emit("no-latest-version");
    }

    return emit("good-doc");
}


function countEntryTypes(localNpmDB) {
    localNpmDB.query({map: countBrokenEntries, reduce: "_count"}, {include_docs: true})
        .then(function(output) {
            console.log(output);
        })
        .catch(function(err) {
            console.log("Error: " + err);
        });
}

exports.countEntryTypes = countEntryTypes;