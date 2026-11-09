import {mkdir,writeFile} from 'node:fs/promises';
import {tableRepository} from '../lib/table-storage.ts';
const posts=await tableRepository.list();
await mkdir('exports',{recursive:true});
const path=`exports/blog-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
await writeFile(path,JSON.stringify({posts},null,2),{flag:'wx',mode:0o600});
console.log(`Saved ${posts.length} entries to ${path}. Store a protected backup outside the repository.`);
