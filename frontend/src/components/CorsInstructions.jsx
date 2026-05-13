import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

// ─── Provider-specific setup instructions ───────────

const AWS_INSTRUCTIONS = {
  title: 'AWS S3 Setup Instructions',
  signupUrl: 'https://aws.amazon.com/free/',
  freeTier: '5 GB storage • 20,000 GET • 2,000 PUT requests/month • 12 months free',
  steps: [
    { text: 'Create a free AWS account', link: 'https://aws.amazon.com/free/', linkText: 'aws.amazon.com/free' },
    { text: 'Open the S3 Console and click "Create Bucket"', link: 'https://s3.console.aws.amazon.com/s3/buckets', linkText: 'S3 Console' },
    { text: 'Enter a unique bucket name (e.g., my-ultracloud-bucket) and select a region (e.g., us-east-1)' },
    { text: 'Leave all defaults (Block Public Access ON is correct) → Create Bucket' },
    { text: 'Open IAM Console → Users → Create User', link: 'https://console.aws.amazon.com/iam/home#/users', linkText: 'IAM Console' },
    { text: 'Name it (e.g., ultracloud-user), click Next' },
    { text: 'Select "Attach policies directly" → search for AmazonS3FullAccess → check it → Next → Create User' },
    { text: 'Click on the user → Security Credentials tab → Create Access Key' },
    { text: 'Select "Application running outside AWS" → Next → Create' },
    { text: 'Copy the Access Key ID and Secret Access Key (shown only once!)' },
  ],
  code: `{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "s3:ListBucket", "s3:GetObject",
      "s3:PutObject", "s3:DeleteObject",
      "s3:CopyObject", "s3:HeadBucket",
      "s3:GetObjectVersion", "s3:ListBucketVersions"
    ],
    "Resource": [
      "arn:aws:s3:::YOUR-BUCKET-NAME",
      "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    ]
  }]
}`,
  codeLabel: 'Custom IAM Policy (alternative to AmazonS3FullAccess)',
  credentials: [
    { field: 'Access Key ID', example: 'AKIAIOSFODNN7EXAMPLE', where: 'IAM → Users → Security Credentials → Access Keys' },
    { field: 'Secret Access Key', example: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', where: 'Shown once when creating the access key' },
    { field: 'Region', example: 'us-east-1', where: 'Selected when creating the bucket' },
    { field: 'Bucket Name', example: 'my-ultracloud-bucket', where: 'S3 Console → Buckets' },
  ],
};

const AZURE_INSTRUCTIONS = {
  title: 'Azure Blob Storage Setup Instructions',
  signupUrl: 'https://azure.microsoft.com/en-us/free/',
  freeTier: '5 GB LRS storage • 20,000 read + 10,000 write ops/month • 12 months free',
  steps: [
    { text: 'Create a free Azure account (free $200 credit for 30 days)', link: 'https://azure.microsoft.com/en-us/free/', linkText: 'azure.microsoft.com/free' },
    { text: 'Go to Azure Portal → Storage Accounts → Create', link: 'https://portal.azure.com/#create/Microsoft.StorageAccount', linkText: 'Create Storage Account' },
    { text: 'Fill in: Subscription, Resource Group (create new), Storage Account Name (globally unique, lowercase)' },
    { text: 'Select region, Performance: Standard, Redundancy: LRS (cheapest) → Review + Create' },
    { text: 'Once created, go to the Storage Account → Containers → + Container' },
    { text: 'Enter a name (e.g., ultracloud), Access level: Private → Create' },
    { text: 'Go to Storage Account → Security + Networking → Access Keys' },
    { text: 'Click "Show" next to key1 → copy the entire Connection String' },
  ],
  code: `DefaultEndpointsProtocol=https;
AccountName=yourstorageaccount;
AccountKey=abc123...==;
EndpointSuffix=core.windows.net`,
  codeLabel: 'Connection String Format',
  credentials: [
    { field: 'Connection String', example: 'DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...', where: 'Storage Account → Access Keys → Connection string' },
    { field: 'Container Name', example: 'ultracloud', where: 'Storage Account → Containers' },
  ],
};

const GCP_INSTRUCTIONS = {
  title: 'Google Cloud Storage Setup Instructions',
  signupUrl: 'https://cloud.google.com/free',
  freeTier: '5 GB US regional storage • 5,000 Class A + 50,000 Class B ops/month • Always free',
  steps: [
    { text: 'Create a GCP account (free $300 credit for 90 days)', link: 'https://cloud.google.com/free', linkText: 'cloud.google.com/free' },
    { text: 'Create a new project in GCP Console', link: 'https://console.cloud.google.com/projectcreate', linkText: 'Create Project' },
    { text: 'Enable Cloud Storage API for your project', link: 'https://console.cloud.google.com/apis/library/storage.googleapis.com', linkText: 'Enable API' },
    { text: 'Go to Cloud Storage → Create Bucket', link: 'https://console.cloud.google.com/storage/create-bucket', linkText: 'Create Bucket' },
    { text: 'Enter a globally unique name, select region (us-central1 is cheapest), Standard storage → Create' },
    { text: 'Go to IAM & Admin → Service Accounts → Create Service Account', link: 'https://console.cloud.google.com/iam-admin/serviceaccounts/create', linkText: 'Create SA' },
    { text: 'Name it (e.g., ultracloud-sa), grant role "Storage Admin" → Done' },
    { text: 'Click on the service account → Keys tab → Add Key → Create new key → JSON' },
    { text: 'A JSON file will download — paste the ENTIRE contents into the credentials field' },
  ],
  code: `{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
  "client_email": "sa@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://oauth2.googleapis.com/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}`,
  codeLabel: 'Service Account JSON Key (downloaded file)',
  credentials: [
    { field: 'Service Account JSON', example: '{ "type": "service_account", ... }', where: 'IAM → Service Accounts → Keys → JSON download' },
    { field: 'Bucket Name', example: 'my-ultracloud-gcs', where: 'Cloud Storage → Buckets' },
    { field: 'Project ID', example: 'my-project-12345', where: 'GCP Console → Project selector dropdown (top bar)' },
  ],
};

const BACKBLAZE_INSTRUCTIONS = {
  title: 'Backblaze B2 Setup Instructions',
  signupUrl: 'https://www.backblaze.com/sign-up/cloud-storage',
  freeTier: '10 GB storage • 1 GB/day downloads • 2,500 transactions/day • Always free',
  steps: [
    { text: 'Create a free Backblaze account (no credit card needed!)', link: 'https://www.backblaze.com/sign-up/cloud-storage', linkText: 'backblaze.com/sign-up' },
    { text: 'Go to B2 Cloud Storage → Buckets → Create a Bucket', link: 'https://secure.backblaze.com/b2_buckets.htm', linkText: 'B2 Buckets' },
    { text: 'Enter a name, set Files in Bucket are: Private → Create' },
    { text: 'Note the bucket Region (e.g., us-west-004) from the bucket list' },
    { text: 'Go to App Keys → Add a New Application Key', link: 'https://secure.backblaze.com/app_keys.htm', linkText: 'App Keys' },
    { text: 'Name of Key: ultracloud, Allow access to bucket: select your bucket' },
    { text: 'Type of access: Read and Write → Create New Key' },
    { text: '⚠️ IMPORTANT: Copy the applicationKey immediately — it is shown ONLY ONCE!' },
  ],
  code: `keyID (Application Key ID)   →  "Access Key ID" field
applicationKey              →  "Secret Access Key" field
Region from bucket list     →  e.g., "us-west-004"
Bucket Name                 →  Your B2 bucket name

✅ Best free tier: 10 GB free forever, no credit card required!`,
  codeLabel: 'Credential Field Mapping',
  credentials: [
    { field: 'Application Key ID', example: '005a1b2c3d4e5f0000000001', where: 'App Keys page → keyID column' },
    { field: 'Application Key', example: 'K005abc123...', where: 'Shown once when creating the key' },
    { field: 'Region', example: 'us-west-004', where: 'Buckets page → Region column' },
    { field: 'Bucket Name', example: 'my-ultracloud-b2', where: 'Buckets page → Bucket Name column' },
  ],
};

const INSTRUCTIONS_MAP = {
  aws: AWS_INSTRUCTIONS,
  azure: AZURE_INSTRUCTIONS,
  gcp: GCP_INSTRUCTIONS,
  backblaze: BACKBLAZE_INSTRUCTIONS,
};

export default function CorsInstructions({ provider = 'aws' }) {
  const [copied, setCopied] = useState(false);
  const instructions = INSTRUCTIONS_MAP[provider] || AWS_INSTRUCTIONS;

  const handleCopy = () => {
    navigator.clipboard.writeText(instructions.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="cors-instructions">
      <h3>{instructions.title}</h3>

      {/* Free Tier Info */}
      <div className="free-tier-banner">
        <span className="free-tier-icon">🎁</span>
        <div>
          <strong>Free Tier:</strong> {instructions.freeTier}
          <br />
          <a href={instructions.signupUrl} target="_blank" rel="noopener noreferrer" className="setup-link">
            Sign up here <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {/* Step-by-step guide */}
      <p style={{ marginTop: 12 }}>Follow these steps:</p>
      <ol className="setup-steps">
        {instructions.steps.map((step, i) => (
          <li key={i}>
            {step.text || step}
            {step.link && (
              <>
                {' → '}
                <a href={step.link} target="_blank" rel="noopener noreferrer" className="setup-link">
                  {step.linkText} <ExternalLink size={10} />
                </a>
              </>
            )}
          </li>
        ))}
      </ol>

      {/* Where to find each credential */}
      {instructions.credentials && (
        <div className="credentials-guide">
          <h4>Where to Find Each Credential</h4>
          <table className="credentials-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Where to Get It</th>
              </tr>
            </thead>
            <tbody>
              {instructions.credentials.map((c) => (
                <tr key={c.field}>
                  <td><strong>{c.field}</strong></td>
                  <td>{c.where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Code block */}
      <div className="cors-code-block">
        <div className="code-label">{instructions.codeLabel}</div>
        <button className="copy-btn" onClick={handleCopy}>
          {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
        </button>
        <pre>{instructions.code}</pre>
      </div>
    </div>
  );
}
