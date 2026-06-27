import { env } from 'https://unpkg.com/@huggingface/transformers@3.8.1/dist/transformers.min.js';
console.log(JSON.stringify(env.backends, null, 2));
