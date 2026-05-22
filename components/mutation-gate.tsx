"use client";

import { Children, cloneElement, isValidElement } from "react";

type Props = {
  active: boolean;
  reason?: string;
  children: React.ReactNode;
};

export default function MutationGate({
  active,
  reason = "Disabled in impersonate mode — exit to make changes.",
  children,
}: Props) {
  if (!active) return <>{children}</>;

  return (
    <span title={reason} style={{ position: "relative", display: "inline-block" }}>
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        const el = child as React.ReactElement<Record<string, unknown>>;
        return cloneElement(el, {
          ...el.props,
          disabled: true,
          "aria-disabled": true,
          onClick: (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
          },
          onSubmit: (e: React.FormEvent) => {
            e.preventDefault();
            e.stopPropagation();
          },
          style: {
            ...(el.props.style as React.CSSProperties | undefined),
            opacity: 0.5,
            cursor: "not-allowed",
          },
        });
      })}
    </span>
  );
}
