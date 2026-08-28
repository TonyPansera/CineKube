const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const R2_BUCKET = process.env.R2_BUCKET || 'cinekube-images';

function hasR2Credentials() {
    return Boolean(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);
}

function createClient() {
    return new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
    });
}

async function uploadFile(client, localPath, key, contentType) {
    const body = fs.readFileSync(localPath);
    await client.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
    }));
    console.log(`Uploaded: ${key} (${(body.length / 1024).toFixed(0)} KB)`);
}

module.exports = { R2_BUCKET, hasR2Credentials, createClient, uploadFile };
