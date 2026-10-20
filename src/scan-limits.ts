// Max length of page-controlled strings (label text, placeholder, nearby).
// Shared by the scan side (src/dom/scan-fields.ts) and the wire decode side
// (src/messages.ts) so both ends cap identical page-controlled strings at the
// same length.
export const MAX_TEXT_LENGTH = 200;
