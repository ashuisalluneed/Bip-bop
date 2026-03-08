import { config } from "dotenv";
config();
import { env } from "./src/env.js";
console.log("Success:", Object.keys(env));
