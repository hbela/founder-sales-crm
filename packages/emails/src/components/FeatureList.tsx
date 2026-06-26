/** @jsxRuntime automatic */
/** @jsxImportSource react */
import type { ReactNode } from "react";
import { Column, Row, Section, Text } from "@react-email/components";
import { SECTION_PX, colors, type } from "./tokens.js";

export interface FeatureListProps {
  items: ReactNode[];
}

/** Feature list with black bullets (no dated green-check pills). */
export function FeatureList({ items }: FeatureListProps) {
  return (
    <Section style={{ padding: `0 ${SECTION_PX}` }}>
      {items.map((item, i) => (
        <Row key={i} style={{ marginBottom: "8px" }}>
          <Column style={{ width: "20px", verticalAlign: "top" }}>
            <Text style={bullet}>&bull;</Text>
          </Column>
          <Column>
            <Text style={text}>{item}</Text>
          </Column>
        </Row>
      ))}
    </Section>
  );
}

const bullet = {
  fontSize: type.body,
  lineHeight: 1.5,
  color: colors.ink,
  margin: 0,
};

const text = {
  fontSize: type.body,
  lineHeight: 1.5,
  color: colors.body,
  margin: 0,
};
