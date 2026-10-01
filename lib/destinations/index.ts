/**
 * Public surface of the destination layer.
 */

export * from "./base";
export * from "./registry";
export { WebDestinationAdapter, webDescriptor } from "./web/adapter";
export { PowerPointDestinationAdapter, powerpointDescriptor } from "./powerpoint/adapter";
export {
  GoogleSlidesDestinationAdapter,
  googleSlidesDescriptor,
} from "./google-slides/adapter";
export { PdfDestinationAdapter, pdfDescriptor } from "./pdf/adapter";
