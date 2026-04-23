package com.storage.service;

import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Component
public class S3SessionManager {

    private S3Client s3Client;
    private S3Presigner s3Presigner;
    private String bucket;
    private String region;
    private boolean connected = false;

    public synchronized void connect(String accessKeyId, String secretAccessKey, String regionStr, String bucketName) {
        disconnect(); // Clean up any existing connection

        Region awsRegion = Region.of(regionStr);
        AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKeyId, secretAccessKey);
        StaticCredentialsProvider credentialsProvider = StaticCredentialsProvider.create(credentials);

        this.s3Client = S3Client.builder()
                .region(awsRegion)
                .credentialsProvider(credentialsProvider)
                .build();

        this.s3Presigner = S3Presigner.builder()
                .region(awsRegion)
                .credentialsProvider(credentialsProvider)
                .build();

        // Validate connection by checking if bucket exists
        this.s3Client.headBucket(b -> b.bucket(bucketName));

        this.bucket = bucketName;
        this.region = regionStr;
        this.connected = true;
    }

    public synchronized void disconnect() {
        if (s3Client != null) {
            s3Client.close();
            s3Client = null;
        }
        if (s3Presigner != null) {
            s3Presigner.close();
            s3Presigner = null;
        }
        bucket = null;
        region = null;
        connected = false;
    }

    public S3Client getClient() {
        if (!connected || s3Client == null) {
            throw new IllegalStateException("Not connected to S3. Please connect first.");
        }
        return s3Client;
    }

    public S3Presigner getPresigner() {
        if (!connected || s3Presigner == null) {
            throw new IllegalStateException("Not connected to S3. Please connect first.");
        }
        return s3Presigner;
    }

    public String getBucket() {
        if (!connected) {
            throw new IllegalStateException("Not connected to S3. Please connect first.");
        }
        return bucket;
    }

    public String getRegion() {
        return region;
    }

    public boolean isConnected() {
        return connected;
    }
}
