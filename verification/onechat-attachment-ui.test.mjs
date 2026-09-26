import assert from "node:assert/strict";
import fs from "node:fs";

const html=fs.readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
const app=fs.readFileSync(new URL("../public/app.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../public/styles.css",import.meta.url),"utf8");

assert.equal((html.match(/id="composer"/g)||[]).length,1);
assert.equal((html.match(/id="chatIn"/g)||[]).length,1);
assert.ok(html.includes('id="filePicker"'));
assert.ok(html.includes('id="attachmentTray"'));
assert.ok(html.includes('id="attachBtn"'));
assert.ok(!/<textarea[^>]+id="chatIn"[^>]+required/i.test(html));

assert.ok(app.includes('UPLOAD_CHUNK_BYTES=1_500_000'));
assert.ok(app.includes('post("/api/media/upload"'));
assert.ok(app.includes('post("/api/onechat"'));\nassert.ok(app.includes('/api/onechat/history'));\nassert.ok(app.includes('/api/media/content?id='));\nassert.ok(app.includes('data-turn-action'));\nassert.ok(app.includes('/api/onechat/retry'));\nassert.ok(app.includes('/api/onechat/branch'));\nassert.ok(app.includes('/api/onechat/turn-export'));\nassert.ok(app.includes('/api/onechat/start'));\nassert.ok(app.includes('/api/onechat/events'));\nassert.ok(app.includes('/api/onechat/stop'));\nassert.ok(html.includes('id="stopBtn"'));\nassert.ok(app.includes('mediaId:item.mediaId'));
assert.ok(app.includes('attachments:uploaded'));
assert.ok(app.includes('pendingAttachments.length>=MAX_ATTACHMENTS'));
assert.ok(app.includes('item.uploadedPath'));
assert.ok(css.includes(".attachment-tray"));
assert.ok(css.includes(".upload-bar"));

console.log("onechat attachment UI: ok");
