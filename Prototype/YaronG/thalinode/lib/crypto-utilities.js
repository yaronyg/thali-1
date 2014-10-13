"use strict";

var openssl = require("openssl-wrapper");

// Generate public/private key pair as PEM - openssl genrsa 4096
// Generate the certificate signing request - openssl req -new
// Generate a PKCS12 file with a cert chain and private key -  openssl pkcs12 -export -in (both the PEM key
// and the CSR) -name ?

// openssl genrsa 4096
// We will output to standard out rather than a file so we can avoid the file functions in Javascript
// We will not encrypt the file because if the device's file system is compromised then our passphrase will be as well
// 4096 - This is the number of bits we will use
exports.generateRsaPublicPrivateKeyPairAsPEMEncodedString = function(sizeOfKey) {
    return openssl.qExec("genrsa", { "2048": false });
};
