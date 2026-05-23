import type { AppDomain } from "./provisioner/types";

export type DomainPillTone = "ok" | "warn" | "crit" | "muted";

export type DomainPill = {
  label: string;
  tone: DomainPillTone;
  className: string;
  hint: string;
};

function toneClass(tone: DomainPillTone): string {
  switch (tone) {
    case "ok":
      return "pill-ok";
    case "warn":
      return "pill-warn";
    case "crit":
      return "pill-crit";
    default:
      return "pill-muted";
  }
}

export function domainPill(d: AppDomain): DomainPill {
  if (d.status === "deleted") {
    return {
      label: "deleted",
      tone: "muted",
      className: toneClass("muted"),
      hint: "Hostname has been removed from Cloudflare and the tunnel.",
    };
  }
  if (d.status === "failed") {
    return {
      label: "failed",
      tone: "crit",
      className: toneClass("crit"),
      hint:
        d.verification_errors?.[0] ??
        "Cloudflare verification failed. Check the CNAME and try again.",
    };
  }

  const cf = (d.cf_status ?? "").toLowerCase();
  const ssl = (d.cf_ssl_status ?? d.ssl_status ?? "").toLowerCase();

  if (d.status === "pending") {
    if (cf === "pending" || cf === "" || cf === "pending_validation") {
      return {
        label: "awaiting CNAME",
        tone: "warn",
        className: toneClass("warn"),
        hint: "Cloudflare has not yet seen the CNAME record propagate.",
      };
    }
    if (cf === "active" && ssl !== "active") {
      return {
        label: "issuing SSL",
        tone: "warn",
        className: toneClass("warn"),
        hint: "CNAME validated. Cloudflare is issuing the SSL certificate.",
      };
    }
    return {
      label: "verifying",
      tone: "warn",
      className: toneClass("warn"),
      hint: "Cloudflare is verifying ownership.",
    };
  }

  if (d.status === "active") {
    if (ssl === "active" || ssl === "") {
      return {
        label: "active",
        tone: "ok",
        className: toneClass("ok"),
        hint: "Hostname is live with a valid SSL certificate.",
      };
    }
    return {
      label: "ssl pending",
      tone: "warn",
      className: toneClass("warn"),
      hint: "Hostname is active but SSL is still being issued.",
    };
  }

  return {
    label: d.status,
    tone: "muted",
    className: toneClass("muted"),
    hint: "",
  };
}

export function expiryTone(iso: string | null | undefined): {
  tone: DomainPillTone;
  daysLeft: number | null;
} {
  if (!iso) return { tone: "muted", daysLeft: null };
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms)) return { tone: "muted", daysLeft: null };
  const days = Math.floor(ms / 86_400_000);
  if (days <= 7) return { tone: "crit", daysLeft: days };
  if (days <= 30) return { tone: "warn", daysLeft: days };
  return { tone: "ok", daysLeft: days };
}
