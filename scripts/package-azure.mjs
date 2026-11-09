import {access,cp,mkdir,rm} from "node:fs/promises";
try {await access("public/images/brielle-profile.jpg");}
catch {throw new Error("Portrait asset missing. Resolve the portrait publication choice before deploying; see README.md.");}
await rm("azure-package",{recursive:true,force:true});
await mkdir("azure-package",{recursive:true});
await cp(".next/standalone","azure-package",{recursive:true});
await cp("public","azure-package/public",{recursive:true});
await cp(".next/static","azure-package/.next/static",{recursive:true});
console.log("Azure package ready. Startup command: node server.js");
