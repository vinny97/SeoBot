import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { loadWorkerConfig } from "../lib/config/worker-env.js";
import { runWorker } from "./worker-loop.js";
const controller=new AbortController();let stopping=false;function stop(){if(stopping)return;stopping=true;console.info("Crawler worker is stopping gracefully.");controller.abort()}process.once("SIGTERM",stop);process.once("SIGINT",stop);
try{const config=loadWorkerConfig();const workerId=`${hostname().slice(0,80)}-${randomUUID().slice(0,8)}`;console.info("Crawler worker started.");await runWorker(config,workerId,controller.signal);console.info("Crawler worker stopped.")}catch(error){console.error(error instanceof Error?error.message:"Crawler worker failed during startup.");process.exitCode=1}
