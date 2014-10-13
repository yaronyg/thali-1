"use strict";

/* global describe, it */

var chai = require("chai"),
    chaiAsPromised = require("chai-as-promised"),
    expect = require("chai").expect,
    cryptoUtilities = require("../lib/crypto-utilities.js"),
    forge = require("node-forge");

chai.use(chaiAsPromised);

describe("Stuff", function() {
    it("should be equal to 0", function() {
        expect(0).to.equal(0);
    });
});

describe("cryptoUtilities - delme", function() {
    it("should generate a key", function() {
        var keyBitLength = 4096;
        return cryptoUtilities.generateRsaPublicPrivateKeyPairAsPEMEncodedString(keyBitLength);
    });
});

describe("cryptoUtilities - generateRsaPublicPrivateKeyPairAsPEMEncodedString", function() {
   it("should generate a key", function() {
       var keyBitLength = 4096;
       return expect(cryptoUtilities.generateRsaPublicPrivateKeyPairAsPEMEncodedString(keyBitLength))
           .to
           .eventually
           .satisfy(function(pemEncodedKeyPair) {
                var receivedKeyBitLength = forge.pki.encryptedPrivateKeyFromPem(pemEncodedKeyPair)
                                        .keys.publicKey.key.n.bitLength;
               expect(receivedKeyBitLength).to.equal(keyBitLength);
           });
   });
});
