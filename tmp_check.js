const fs=require('fs');
const s=fs.readFileSync('client/src/app/core/models/home-layout.model.ts','utf8');
const i=s.indexOf("type: 'image_slider'");
console.log('index:', i);
if (i>=0) console.log(JSON.stringify(s.slice(i-40, i+160)));
console.log('defs has image_slider:', s.includes("type: 'image_slider'"));