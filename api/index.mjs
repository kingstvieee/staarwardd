import { handleRequest } from '../guardian-runtime-server.mjs';

export default function handler(request, response) {
  return handleRequest(request, response);
}
