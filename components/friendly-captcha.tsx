"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { FriendlyCaptchaSDK } from "@friendlycaptcha/sdk";

let sdk: FriendlyCaptchaSDK | undefined;

function getSdk() {
  sdk ??= new FriendlyCaptchaSDK();
  return sdk;
}

type FriendlyCaptchaProps = {
  sitekey: string;
  onError: (message: string) => void;
};

export function FriendlyCaptcha({ sitekey, onError }: FriendlyCaptchaProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const reportError = useEffectEvent(onError);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const widget = getSdk().createWidget({ element: mount, sitekey, startMode: "auto" });
    const handleComplete = () => reportError("");
    const handleError = () => reportError("Der Spam-Schutz konnte nicht geladen werden. Bitte versuche es erneut.");
    const handleExpiry = () => reportError("Der Spam-Schutz ist abgelaufen. Bitte starte ihn erneut.");

    mount.addEventListener("frc:widget.complete", handleComplete);
    mount.addEventListener("frc:widget.error", handleError);
    mount.addEventListener("frc:widget.expire", handleExpiry);

    return () => {
      mount.removeEventListener("frc:widget.complete", handleComplete);
      mount.removeEventListener("frc:widget.error", handleError);
      mount.removeEventListener("frc:widget.expire", handleExpiry);
      widget.destroy();
    };
  }, [sitekey]);

  return <div ref={mountRef} className="frc-captcha" />;
}
