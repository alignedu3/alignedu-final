import { ImageResponse } from "next/og";
import { PwaIcon } from "./pwa-icons/IconTemplate";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";
export const runtime = "edge";

export default function AppleIcon() {
  return new ImageResponse(<PwaIcon size={180} />, {
    width: 180,
    height: 180,
  });
}
