import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const html=fs.readFileSync(path.join(root,"public","index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"public","styles.css"),"utf8");
const js=fs.readFileSync(path.join(root,"public","app.js"),"utf8");

const panels=["chat","operations","capabilities","models","collaboration","knowledge","research","development","dream","security","integrations","memory","wellbeing","evidence"];
for(const panel of panels){
  assert.match(html,new RegExp(`data-panel="${panel}"`),`navigation missing ${panel}`);
  assert.match(html,new RegExp(`data-panel-view="${panel}"`),`panel missing ${panel}`);
}
for(const id of ["navToggle","workspaceNav","themeBtn","themeStudio","themeClose","commandBtn","commandPalette","composer","chatIn","sendBtn","rightRail"]){
  assert.match(html,new RegExp(`id="${id}"`),`UI control missing #${id}`);
}
for(const theme of ["forge","neon","ember","aurora","light"]){
  assert.match(html,new RegExp(`data-theme="${theme}"`),`theme option missing ${theme}`);
}
for(const selector of [".left-nav",".nav-item",".theme-studio",".composer",".right-rail",".panel.active"]){
  assert.ok(css.includes(selector),`style contract missing ${selector}`);
}
assert.ok(css.includes("@media"),"responsive CSS contract missing");
assert.ok(js.includes("addEventListener"),"browser interaction handlers missing");
for(const id of ["navToggle","themeBtn","themeClose","commandBtn","composer"]){
  assert.ok(js.includes(id),`app.js does not reference interactive control ${id}`);
}
assert.ok(/localStorage/.test(js),"theme/UI persistence contract missing");
assert.ok(/fetch\s*\(/.test(js),"UI has no API request path");

console.log(JSON.stringify({
  state:"SUCCESS",
  contract:"ui-shell-v078",
  panels:panels.length,
  themes:5,
  checks:"navigation + panels + themes + responsive styles + interaction bindings + API path"
},null,2));
