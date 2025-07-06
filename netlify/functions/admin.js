import * as Bytescale from "@bytescale/sdk";
import { getStore } from "@netlify/blobs";

const ok = (data) =>
  new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" }
  });

export default async (req) => {
  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const id = url.searchParams.get("id");

  const store = getStore("files");
  const fileApi = new Bytescale.FileApi({
    apiKey: process.env.UPLOAD_IO_SECRET_KEY,
fetchApi: fetch
  });

  if (action === "list") {
    const files = [];
    for await (const { key } of await store.list()) {
      const data = await store.getJSON(key);
      files.push({ id: key, ...data });
    }
    return ok(files);
  }

  if (action === "delete") {
    if (!id) return new Response("id required", { status: 400 });
    const data = await store.getJSON(id);
    if (!data) return new Response("Not found", { status: 404 });

    await fileApi.deleteFile({
      accountId: process.env.UPLOAD_IO_ACCOUNT_ID,
      filePath: data.filePath
    });
    await store.delete(id);
    return ok({ deleted: true });
  }

  if (action === "rename") {
    const newName = url.searchParams.get("new");
    if (!id || !newName) return new Response("id and new required", { status: 400 });

    const data = await store.getJSON(id);
    if (!data) return new Response("Not found", { status: 404 });

    const parts = data.filePath.split("/");
    parts[parts.length - 1] = newName;
    const newPath = parts.join("/");

    await fileApi.copyFile({
      accountId: process.env.UPLOAD_IO_ACCOUNT_ID,
      filePath: data.filePath,
      newFilePath: newPath
    });
    await fileApi.deleteFile({
      accountId: process.env.UPLOAD_IO_ACCOUNT_ID,
      filePath: data.filePath
    });

    data.filePath = newPath;
    data.fileUrl = data.fileUrl.replace(data.filePath, newPath);
    await store.setJSON(id, data);
    return ok({ renamed: true, filePath: newPath });
  }

  return new Response("Unknown action", { status: 400 });
};
