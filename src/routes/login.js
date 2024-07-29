const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const iconv = require('iconv-lite');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();
const getCurrentDateTime = require('../utils/Time/DateTime.js');

const testServerUrl = process.env.testServerUrl;
const secret_key = Buffer.from(process.env.CRYPTO_SECRET_KEY, 'utf8');
const IV = Buffer.from(process.env.IV, 'utf8');

const generateAccessToken = (user) => {
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '12h' });
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

router.post('/login', async (req, res, next) => {
    try {
        const { USERID, USERPW } = req.body;
        const { year, month, day, hour, minute, second } = getCurrentDateTime();

        const sendingdata = JSON.stringify({
            "request": {
                "DOCTRDCDE": "1000",
                "DOCPORTAL": "M",
                "DOCSNDDAT": `${year}${month}${day}`,
                "DOCSNDTIM": `${hour}${minute}${second}`,
                "RGTFLDUSR": "",
                "RGTFLDPWR": "",
            },
            "data": {
                "USERID": USERID,
                "USERPW": USERPW
            }
        });

        if (!secret_key) {
            return res.status(500).send('No Secret Key.');
        }

        function encrypt(text, key, iv) {
            const encodedText = iconv.encode(text, 'euc-kr');
            const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
            let encrypted = cipher.update(encodedText, 'euc-kr', 'base64');
            encrypted += cipher.final('base64');
            return encrypted;
        }

        function decrypt(encrypted, key, iv) {
            const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
            let decrypted = decipher.update(Buffer.from(encrypted, 'base64'));
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            return iconv.decode(decrypted, 'euc-kr');
        }

        const encryptedData = encrypt(sendingdata, secret_key, IV);
        const decryptedData = decrypt(encryptedData, secret_key, IV);

        const response = await axios.post(testServerUrl, encryptedData, {
            headers: {
                'Content-Type': 'text/plain'
            }
        });

        const decryptedresponse = JSON.parse(decrypt(response.data, secret_key, IV));

        if (decryptedresponse.result.CODE === '0000') {
            const user = { USERID: USERID };
            const accessToken = generateAccessToken(user);

            res.status(200).send({
                message: decryptedresponse.result.MSGE,
                data: decryptedresponse.data,
                accessToken
            });
        } else {
            res.status(400).send({
                message: decryptedresponse.result.MSGE,
                data: null
            });
        }

    } catch (error) {
        console.error('통신 에러: ', error.message);
        res.status(500).send('통신 에러');
    }
});

router.get('/auth', authenticateToken, async (req, res, next) => {
    try {
        const { year, month, day, hour, minute, second } = getCurrentDateTime();
        const sendingdata = JSON.stringify({
            "request": {
                "DOCTRDCDE": "1000",
                "DOCPORTAL": "M",
                "DOCSNDDAT": `${year}${month}${day}`,
                "DOCSNDTIM": `${hour}${minute}${second}`,
                "RGTFLDUSR": "",
                "RGTFLDPWR": "",
            },
            "data": {
                "USERID": "H202404010", //req.user.USERID,
                "USERPW": "!Ekdzhd123"  //req.body.USERPW
            }
        });

        if (!secret_key) {
            return res.status(500).send('No Secret Key.');
        }

        function encrypt(text, key, iv) {
            const encodedText = iconv.encode(text, 'euc-kr');
            const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
            let encrypted = cipher.update(encodedText, 'euc-kr', 'base64');
            encrypted += cipher.final('base64');
            return encrypted;
        }

        function decrypt(encrypted, key, iv) {
            const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
            let decrypted = decipher.update(Buffer.from(encrypted, 'base64'));
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            return iconv.decode(decrypted, 'euc-kr');
        }

        const encryptedData = encrypt(sendingdata, secret_key, IV);
        const decryptedData = decrypt(encryptedData, secret_key, IV);

        const response = await axios.post(testServerUrl, encryptedData, {
            headers: {
                'Content-Type': 'text/plain'
            }
        });

        const decryptedresponse = JSON.parse(decrypt(response.data, secret_key, IV));

        if (decryptedresponse.result.CODE === '0000') {
            res.status(200).send({
                message: 'SUCCESS'
            });
        } else {
            res.status(400).send({
                message: 'FAIL'
            });
        }

    } catch (error) {
        console.error('통신 에러: ', error.message);
        res.status(500).send('통신 에러');
    }
});

module.exports = router;
