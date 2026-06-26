/** @jsxRuntime automatic */
/** @jsxImportSource react */
import { Img, Link, Section, Text } from "@react-email/components";
import { SECTION_PX, colors, type } from "./tokens.js";

export interface VideoBlockProps {
  /** Optional title shown above the frame. */
  title?: string;
  /** Animated GIF preview (absolute https URL). Never embed <video>. */
  gifSrc: string;
  /** Click-through — your landing page or the full MP4. */
  href: string;
  /** Pre-blurred brand image used as the colourful glass bed behind the GIF. */
  blurredBgSrc: string;
  /** GIF render width in px (defaults to 475 inside the 560 card). */
  width?: number;
}

/**
 * Frost-glass video block. A pre-blurred brand image sits behind a translucent
 * glass panel holding the GIF. In Apple Mail/iOS the backdrop-filter renders
 * real glass; in Gmail/Outlook the blurred image alone sells the effect.
 */
export function VideoBlock({ title, gifSrc, href, blurredBgSrc, width = 475 }: VideoBlockProps) {
  return (
    <Section style={{ padding: `8px ${SECTION_PX} 16px` }}>
      <Link href={href} target="_blank" style={{ textDecoration: "none" }}>
        {title ? <Text style={titleStyle}>{title}</Text> : null}
        <div style={{ ...bed, backgroundImage: `url('${blurredBgSrc}')` }}>
          <div style={glass}>
            <Img src={gifSrc} width={width} alt={title ?? "Watch the demo"} style={gif} />
          </div>
        </div>
      </Link>
    </Section>
  );
}

const titleStyle = {
  fontSize: type.body,
  fontWeight: 600,
  color: colors.ink,
  margin: "0 0 10px",
};

const bed = {
  backgroundSize: "cover",
  backgroundPosition: "center",
  borderRadius: "3px",
  padding: "14px",
  boxShadow: "0 4px 14px rgba(24,24,27,0.1)",
};

const glass = {
  backgroundColor: "rgba(255,255,255,0.55)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.6)",
  borderRadius: "3px",
  padding: "10px",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
};

const gif = {
  display: "block",
  width: "100%",
  maxWidth: "475px",
  borderRadius: "3px",
  margin: "0 auto",
};
