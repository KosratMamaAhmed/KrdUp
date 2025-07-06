import * as Bytescale from "@bytescale/sdk";
import { getStore } from "@netlify/blobs";
import { v4 as uuid } from "uuid";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!file) {
    return new Response("file field is required", { status: 400 });
  }

  const uploadManager = new Bytescale.UploadManager({
    apiKey: process.env.UPLOAD_IO_PUBLIC_KEY,
fetchApi: fetch
  });

  const { fileUrl, filePath } = await uploadManager.uploadFile(file);
  const id = uuid();

  const store = getStore("files");
  await store.setJSON(id, {
    fileUrl,
    filePath,
    downloads: 0,
    uploadedAt: Date.now()
  });

  return new Response(JSON.stringify({ id, fileUrl }), {
    headers: { "Content-Type": "application/json" }
  });
};
