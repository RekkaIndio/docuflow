import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width="1em"
      height="1em"
      {...props}
    >
      <path fill="none" d="M0 0h256v256H0z" />
      <path
        fill="currentColor"
        d="M213.33 200a8 8 0 0 1-8 8H42.67a8 8 0 0 1-5.66-13.66l64-64a8 8 0 0 1 11.32 0l40 40 45.31-45.31a8 8 0 0 1 11.32 11.32L152 144l-40 40h93.33a8 8 0 0 1 8 8Z"
        opacity={0.2}
      />
      <path
        fill="currentColor"
        d="M208 40H72a16 16 0 0 0-16 16v40a8 8 0 0 0 16 0V56h128v128H96a8 8 0 0 0 0 16h112a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16Zm-34.34 93.66a8 8 0 0 1 0 11.32l-48 48a8 8 0 0 1-11.32 0l-32-32a8 8 0 0 1 11.32-11.32L120 148.69l42.34-42.35a8 8 0 0 1 11.32 0Z"
      />
    </svg>
  );
}
