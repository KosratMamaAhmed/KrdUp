import { getStore } from "@netlify/blobs";

export default async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return new Response("id parameter required", { status: 400 });

  const store = getStore("files");
  const record = await store.getJSON(id);
  if (!record) return new Response("Not Found", { status: 404 });

  record.downloads = (record.downloads || 0) + 1;
  await store.setJSON(id, record);

  return Response.redirect(record.fileUrl, 302);
};
