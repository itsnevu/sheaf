import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

// Source: anonymous, Flammarion engraving (1888), public domain.
// Kept locally so builds need no network. Output is a transparent 1-bit ink plate.
const root = new URL('../public/art/engraving/', import.meta.url);
await mkdir(root, { recursive: true });
const bayer = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
const algorithm = process.argv.includes('--floyd') ? 'floyd' : 'bayer';
for (const [name, width] of [['plate',1200],['particle-map',210]]) {
 const { data, info } = await sharp(new URL('flammarion-source.jpg',root).pathname.replace(/^\/(\w:)/,'$1')).resize({width}).greyscale().normalize().raw().toBuffer({resolveWithObject:true});
 const errors = new Float32Array(data.length);
 const rgba = Buffer.alloc(info.width * info.height * 4);
 for(let y=0;y<info.height;y++) for(let x=0;x<info.width;x++) {
  const i=y*info.width+x;
  const value=Math.max(0,Math.min(255,data[i]+errors[i]));
  const threshold=algorithm==='bayer' ? (bayer[y%4][x%4]+.5)*16 : 128;
  const ink=value<threshold;
  rgba[i*4]=rgba[i*4+1]=rgba[i*4+2]=255;
  rgba[i*4+3]=ink?255:0;
  if(algorithm==='floyd') {
   const err=value-(ink?0:255);
   if(x+1<info.width) errors[i+1]+=err*7/16;
   if(y+1<info.height) { if(x>0)errors[i+info.width-1]+=err*3/16;errors[i+info.width]+=err*5/16;if(x+1<info.width)errors[i+info.width+1]+=err/16; }
  }
 }
 await sharp(rgba,{raw:{width:info.width,height:info.height,channels:4}}).png({palette:true}).toFile(new URL(name+'.png',root).pathname.replace(/^\/(\w:)/,'$1'));
 if(name==='particle-map') {
  const points=[];
  for(let y=0;y<info.height;y+=2) for(let x=0;x<info.width;x+=2) if(rgba[(y*info.width+x)*4+3])points.push([x/info.width,y/info.height]);
  await writeFile(new URL('particles.json',root),JSON.stringify(points));
 }
}
console.log('Built local '+algorithm+' ink plates and particle coordinates.');
