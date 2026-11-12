import fs from 'node:fs/promises';
import path from 'node:path';
import * as sass from 'sass';
import { zipSync } from 'fflate';
const out='dist';
await fs.mkdir(`${out}/vendor`,{recursive:true});
for(const file of ['index.html','app.css','app.js','preview.html','preview.js','LICENSE.md']) await fs.copyFile(file,`${out}/${file}`);
for(const [from,to] of [['marked/lib/marked.umd.js','marked.umd.js'],['dompurify/dist/purify.min.js','purify.min.js'],['bootstrap/dist/css/bootstrap.min.css','bootstrap.min.css']]) await fs.copyFile(`node_modules/${from}`,`${out}/vendor/${to}`);
await fs.cp('node_modules/mathjax/es5',`${out}/vendor/mathjax`,{recursive:true});
const setup=await fs.readFile('upstream/setup-marked.js','utf8');
const tags=(await fs.readFile('upstream/allowed-tags.js','utf8')).replace('export const','const');
const renderer=`/* OpenReview web 1.15.42, 50c61b795383029ef03ce1f56d5b4e3759c4d599. AGPL-3.0-or-later. */
(function(){
const $ = () => { const el=document.createElement('div'); return {text(value){el.textContent=value;return this;},html(){return el.innerHTML;}}; };
${tags}
DOMPurify.setConfig({ALLOWED_TAGS:allowedHtmlTags});
DOMPurify.addHook('afterSanitizeAttributes',(node)=>{if(node.tagName==='A'){node.setAttribute('target','_blank');node.setAttribute('rel','noopener noreferrer');} node.removeAttribute?.('style');node.removeAttribute?.('action');node.removeAttribute?.('formaction');});
${setup}
setupMarked();
window.renderOpenReview = (text) => DOMPurify.sanitize(marked.parse(text));
})();`;
await fs.writeFile(`${out}/renderer.js`,renderer);
const config=(await fs.readFile('upstream/mathjax-config.js','utf8')).replace('export default mathjaxConfig', 'window.MathJax = mathjaxConfig');
await fs.writeFile(`${out}/math-config.js`,config);
const note=(await fs.readFile('upstream/note-content.scss','utf8')).replace("@use '../utils/constants';","@use 'constants';").replace("@use '../utils/mixins';","@use 'mixins';");
const compiled=sass.compileString(note,{loadPaths:[path.resolve('upstream')],style:'compressed'}).css;
const css=`html{font-size:16px;scrollbar-gutter:stable}body{margin:0;padding:28px 30px;background:#fffdfa;color:#333;font-family:'Noto Sans','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:.875rem}h1,h2,h3,h4,h5,h6{font-family:inherit;line-height:1.1;font-weight:500;color:#2c3a4a}a{color:#3e6775}a:hover,a:focus{color:#3e6775}pre{font-size:.8125rem}#empty{color:#a2a5aa;font-family:Arial,sans-serif;font-size:12px;padding-top:5px}#empty[hidden]{display:none}mjx-container[display=true]{overflow-x:auto;overflow-y:hidden}table{border-collapse:collapse}#content:empty{display:none}@media(max-width:767px){html{font-size:14px}body{padding:24px}}\n${compiled}`;
await fs.writeFile(`${out}/preview.css`,(await fs.readFile('upstream/fonts.css','utf8').catch(()=>''))+css);
if(await fs.stat('upstream/fonts').catch(()=>null)) await fs.cp('upstream/fonts',`${out}/fonts`,{recursive:true});
// Source is included to make the adapted OpenReview components inspectable and reproducible.
const source={};
for(const file of ['package.json','package-lock.json','build.mjs','serve.mjs','index.html','app.css','app.js','preview.html','preview.js','README.md','LICENSE.md']) source[file]=new Uint8Array(await fs.readFile(file));
async function collect(dir){for(const item of await fs.readdir(dir,{withFileTypes:true})){const file=`${dir}/${item.name}`;if(item.isDirectory())await collect(file);else source[file]=new Uint8Array(await fs.readFile(file));}}
await collect('upstream');
await fs.writeFile(`${out}/source.zip`,zipSync(source));
console.log('Built static app with bundled Markdown, MathJax, fonts and source.');
