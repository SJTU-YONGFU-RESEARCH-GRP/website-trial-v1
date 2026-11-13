import fs from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./preparedModuleJob.ts";
export interface ModelSourceSegment {sourcePath:string;section:string|null;firstLine:number;lastLine:number;sha256:string;}
/** Resolve native SPICE .lib FILE SECTION semantics. A section self-reference is not a file cycle. */
export async function flattenModelSection(root:string,entry:string,section:string):Promise<{content:string;segments:ModelSourceSegment[];sourceHashes:Record<string,string>}>{
 const realRoot=await fs.realpath(root),active=new Set<string>(),segments:ModelSourceSegment[]=[],sourceHashes:Record<string,string>={};let total=0;
 async function visit(filename:string,selected:string|null):Promise<string>{
  const real=await fs.realpath(filename),relative=path.relative(realRoot,real);
  if(relative===".."||relative.startsWith(".."+path.sep)||path.isAbsolute(relative))throw new Error("Model section escapes catalog root");
  const key=real+"#"+(selected??"");if(active.has(key))throw new Error("True model include/section cycle: "+key);active.add(key);
  try{
   const stat=await fs.stat(real);if(!stat.isFile()||stat.size>32*1024*1024)throw new Error("Model source size/type invalid");
   const bytes=await fs.readFile(real),text=bytes.toString("utf8"),lines=text.split(/\r?\n/);sourceHashes[relative.split(path.sep).join("/")]=sha256(bytes);
   let inside=selected===null,found=selected===null,openSection:string|null=null;const output:string[]=[];
   for(let i=0;i<lines.length;i++){
    const line=lines[i]!,start=line.match(/^\s*\.lib\s+([^\s"']+)\s*(?:\$.*)?$/i),end=line.match(/^\s*\.endl(?:\s+\S+)?\s*(?:\$.*)?$/i);
    if(start){if(openSection)throw new Error("Nested named model libraries unsupported");openSection=start[1]!;if(selected!==null){inside=openSection.toLowerCase()===selected.toLowerCase();if(inside)found=true;continue;}}
    if(end){if(selected!==null){inside=false;openSection=null;continue;}openSection=null;}
    if(!inside)continue;
    const directive=line.match(/^\s*\.(include|inc|lib)\s+(?:"([^"]+)"|'([^']+)'|(\S+))(?:\s+(\S+))?\s*(?:\$.*)?$/i);
    if(directive&&!(directive[1]!.toLowerCase()==="lib"&&!directive[5])){
     const target=directive[2]??directive[3]??directive[4]!;
     if(path.isAbsolute(target)||target.includes("\0"))throw new Error("Absolute model includes unsupported");
     output.push(await visit(path.resolve(path.dirname(real),target),directive[1]!.toLowerCase()==="lib"?directive[5]!:null));
    }else{
     output.push(line);
     segments.push({sourcePath:relative.split(path.sep).join("/"),section:selected,firstLine:i+1,lastLine:i+1,sha256:sha256(line+"\n")});
    }
   }
   if(!found)throw new Error("Missing model section "+selected+" in "+relative);
   const content=output.join("\n");total+=Buffer.byteLength(content);if(total>128*1024*1024||segments.length>500000)throw new Error("Expanded model exceeds bounds");return content;
  }finally{active.delete(key);}
 }
 const content=await visit(path.resolve(realRoot,entry),section);return{content:content+"\n",segments,sourceHashes};
}
export interface MosModelBlock {name:string;polarity:"nmos"|"pmos";start:number;end:number;content:string;}
/** Preserve complete logical statements, including continuation lines and intervening comments. */
export function selectedMosModelNames(source:string,families:string[]):string[]{
 const allowed=new Set(families.map(f=>f.toLowerCase())),names=new Set<string>();
 for(const match of source.matchAll(/^\s*\.model\s+(\S+)\s+(?:nmos|pmos)\b/gim)){
  const name=match[1]!.toLowerCase(),base=name.replace(/\.\d+$/,"").replace(/__model$/,"");
  if(allowed.has(base))names.add(name);
 }
 if(!names.size)throw new Error("No MOS cards match the exact selected device families");return [...names].sort();
}
export function mosModelBlocks(source:string,selectedNames?:readonly string[]):MosModelBlock[]{
 const lines=source.replaceAll("\r\n","\n").split("\n"),blocks:MosModelBlock[]=[],names=new Set<string>();
 for(let i=0;i<lines.length;i++){
  const header=lines[i]!.match(/^\s*\.model\s+(\S+)\s+(nmos|pmos)\b/i);if(!header||selectedNames&&!selectedNames.includes(header[1]!.toLowerCase()))continue;
  const start=i;let end=i+1,cursor=i+1;
  while(cursor<lines.length){const line=lines[cursor]!;
   if(/^\s*\+/.test(line)){end=cursor+1;cursor++;continue;}
   if(/^\s*(?:\*.*)?$/.test(line)){cursor++;continue;}break;
  }
  const name=header[1]!.toLowerCase();if(names.has(name))throw new Error("Duplicate MOS model identity: "+name);names.add(name);
  blocks.push({name,polarity:header[2]!.toLowerCase() as "nmos"|"pmos",start,end,content:lines.slice(start,end).join("\n")});i=end-1;
 }
 if(!blocks.length)throw new Error("Selected model contains no MOS cards");return blocks;
}
export function extractMosModelCards(source:string,selectedNames?:readonly string[]):string{return mosModelBlocks(source,selectedNames).map(b=>b.content).join("\n\n")+"\n";}
export function recombineNormalizedMos(source:string,normalized:string,selectedNames?:readonly string[]):string{
 const original=mosModelBlocks(source,selectedNames),translated=mosModelBlocks(normalized),mapping=new Map(translated.map(b=>[b.name,b]));
 if(mapping.size!==original.length||original.some(b=>!mapping.has(b.name)||mapping.get(b.name)!.polarity!==b.polarity))throw new Error("Translated MOS model names/polarities are not a bijection");
 const normalizedLines=normalized.replaceAll("\r\n","\n").split("\n"),covered=new Set<number>();
 for(const b of translated)for(let i=b.start;i<b.end;i++)covered.add(i);
 for(let i=0;i<normalizedLines.length;i++)if(!covered.has(i)&&!/^\s*(?:\*.*)?$/.test(normalizedLines[i]!))throw new Error("Unexpected directive outside normalized MOS cards");
 const lines=source.replaceAll("\r\n","\n").split("\n");for(const b of [...original].reverse())lines.splice(b.start,b.end-b.start,mapping.get(b.name)!.content);
 return lines.join("\n");
}
