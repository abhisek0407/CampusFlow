import { POST as proposePOST } from '../propose/route';

export async function POST(request) {
  return proposePOST(request);
}
