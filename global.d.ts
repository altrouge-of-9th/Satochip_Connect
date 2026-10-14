import { TextDecoder as PolyfillTextDecoder, TextEncoder as PolyfillTextEncoder } from 'text-encoding';

declare global {
  var TextEncoder: typeof PolyfillTextEncoder;
  var TextDecoder: typeof PolyfillTextDecoder;
}
