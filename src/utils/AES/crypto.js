/* AES 암호화 정의 */

const CryptoJS = require("crypto-js");

const encrypt = (payload, secretKey) => {
  try {
    const encrypted = CryptoJS.AES.encrypt(payload, secretKey).toString();
    return encrypted;
  } catch (e) {
    console.log("Encryption error occur : ", e);
    return null;
  }
};

const decrypt = (encrypted, secretKey) => {
  try {
    const decryptedBytes = CryptoJS.AES.decrypt(encrypted, secretKey);
    const decrypted = decryptedBytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
  } catch (e) {
    console.log("Decryption error occur : ", e);
    return null;
  }
};

module.exports = { encrypt, decrypt };




// const CryptoJS = require("crypto-js/seedForNodeJs.js")

// const encrypt = (payload) => {
//   try {
//     const secret_key = process.env.CRYPTO_SECRET_KEY;
//     if (!secret_key) {
//       console.log("No Secret Key.");
//       return null;
//     }
//     const encrypted = CryptoJS.AES.encrypt(payload, secret_key).toString();
//     return encrypted;
//   } catch (e) {
//     console.log("Encryption error occur : ", e);
//     return null;
//   }
// };

// const decrypt = (encrypted) => {
//   try {
//     const secret_key = process.env.CRYPTO_SECRET_KEY;
//     if (!secret_key) {
//       console.log("No Secret Key.");
//       return null;
//     }
//     const decrypted_bytes = CryptoJS.AES.decrypt(encrypted, secret_key);
//     const decrypted = decrypted_bytes.toString(CryptoJS.enc.Utf8);
//     return decrypted;
//   } catch (e) {
//     console.log("Decryption error occur : ", e);
//     return null;
//   }
// };


// module.exports = { encrypt, decrypt };
