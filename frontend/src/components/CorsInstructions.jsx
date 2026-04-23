import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

const corsJson = `[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": [
      "ETag",
      "x-amz-request-id",
      "x-amz-id-2"
    ],
    "MaxAgeSeconds": 3600
  }
]`;

export default function CorsInstructions() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(corsJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="cors-instructions">
      <h3>S3 Bucket CORS Configuration</h3>
      <p>
        To use this app, your S3 bucket needs CORS enabled. Follow these steps:
      </p>

      <ol>
        <li>Go to your S3 bucket in the AWS Console</li>
        <li>Navigate to <strong>Permissions</strong> → <strong>Cross-origin resource sharing (CORS)</strong></li>
        <li>Click <strong>Edit</strong> and paste the following JSON configuration:</li>
      </ol>

      <div className="cors-code-block">
        <button className="copy-btn" onClick={handleCopy}>
          {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
        </button>
        <pre>{corsJson}</pre>
      </div>

      <p style={{ marginTop: '12px' }}>
        <strong>Required IAM Permissions:</strong>
      </p>
      <div className="permissions-list">
        {['s3:PutObject', 's3:GetObject', 's3:DeleteObject', 's3:ListBucket'].map((perm) => (
          <span key={perm} className="permission-badge">{perm}</span>
        ))}
      </div>
    </div>
  );
}
