// Read secrets outside the checkout; never print credentials or persist them into artifacts.
import {readFileSync,statSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
const file=process.env.STOCK_LENS_CREDENTIALS_FILE||join(homedir(),'Documents','Codex','.stock-lens-secrets','credentials.json');
let credentials;try{if((statSync(file).mode&0o077)!==0)throw Error();credentials=JSON.parse(readFileSync(file,'utf8'))}catch{console.error('Protected credentials missing or permissions too broad. Use a private JSON file (0600) outside the checkout.');process.exit(1)}
const [command,...args]=process.argv.slice(2);if(!command){console.error('Usage: node scripts/with-credentials.mjs <command> [args]');process.exit(1)}
const allowed=['LLM_API_KEY','LLM_BASE_URL','LLM_MODEL','HITHINK_FINANCE_API_KEY','IFIND_API_TOKEN'];
const env={...process.env};for(const k of allowed)if(typeof credentials[k]==='string')env[k]=credentials[k];
const child=spawn(command,args,{env,stdio:'inherit',shell:false});child.on('error',()=>{console.error('Cannot start requested command.');process.exitCode=1});child.on('exit',code=>{process.exitCode=code??1});
