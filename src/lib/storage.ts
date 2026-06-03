import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;
const containerName = process.env.AZURE_STORAGE_CONTAINER ?? "tenants";

function getClient() {
  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  return new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, credential);
}

/**
 * Blob path convention:
 *  Freelancer:       freelancers/{profileId}/profile/{filename}
 *                    freelancers/{profileId}/portfolio/{filename}
 *  Business:         {businessId}/profile/{filename}
 *                    {businessId}/portfolio/{filename}
 *  Business agent:   {businessId}/agents/{agentId}/profile/{filename}
 *                    {businessId}/agents/{agentId}/portfolio/{filename}
 */
export function getBlobPath(opts: {
  providerType: "FREELANCER" | "BUSINESS";
  profileId: string;
  parentBusinessId: string | null;
  folder: "profile" | "portfolio";
  filename: string;
}): string {
  const { providerType, profileId, parentBusinessId, folder, filename } = opts;

  if (providerType === "BUSINESS") {
    return `${profileId}/${folder}/${filename}`;
  }
  if (parentBusinessId) {
    // Agent within a business
    return `${parentBusinessId}/agents/${profileId}/${folder}/${filename}`;
  }
  // Standalone freelancer — shared freelancers tenant
  return `freelancers/${profileId}/${folder}/${filename}`;
}

export async function uploadBlob(blobPath: string, data: Buffer, contentType: string): Promise<string> {
  const client = getClient();
  const container = client.getContainerClient(containerName);
  const blockBlob = container.getBlockBlobClient(blobPath);

  await blockBlob.uploadData(data, {
    blobHTTPHeaders: { blobContentType: contentType }
  });

  return blockBlob.url;
}

export async function deleteBlob(blobPath: string): Promise<void> {
  const client = getClient();
  const container = client.getContainerClient(containerName);
  await container.getBlockBlobClient(blobPath).deleteIfExists();
}
