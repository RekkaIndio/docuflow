import type { SVGProps } from "react";
import Image from "next/image";
import neurodiversityLogo from "@/assets/Neurodiversity_Symbol.png";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <Image
      src={neurodiversityLogo}
      alt="CG-360 Logo"
      width={128}
      height={128}
      className={props.className}
      style={{ width: "4em", height: "4em" }}
    />
  );
}
