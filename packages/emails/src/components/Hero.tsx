/** @jsxRuntime automatic */
/** @jsxImportSource react */
import { Img, Link, Section } from "@react-email/components";

export interface HeroProps {
  /** Absolute https URL — relative paths break in inboxes. */
  src: string;
  alt: string;
  /** Optional click-through (whole image becomes a link). */
  href?: string;
}

/** Full-width image flush with the top of the card. */
export function Hero({ src, alt, href }: HeroProps) {
  const img = <Img src={src} alt={alt} width={560} style={image} />;
  return <Section style={{ lineHeight: 0 }}>{href ? <Link href={href} target="_blank">{img}</Link> : img}</Section>;
}

const image = {
  display: "block",
  width: "100%",
  maxWidth: "560px",
  border: 0,
};
