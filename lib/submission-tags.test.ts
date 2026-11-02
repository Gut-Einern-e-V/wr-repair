import { describe, expect, it } from "vitest";
import { CAPTCHA_REJECTED_TAG, DUPLICATE_SUSPECT_TAG, RECOVERED_TAG, captchaRejectionTags, submissionWarnings } from "./submission-tags";

describe("captchaRejectionTags", () => {
  it("markiert ein zweimal eingeloestes Wort als moegliche Doppeleinreichung", () => {
    expect(captchaRejectionTags("response_duplicate")).toEqual([DUPLICATE_SUSPECT_TAG]);
  });

  it("markiert jede andere Absage allgemein", () => {
    expect(captchaRejectionTags("response_invalid")).toEqual([CAPTCHA_REJECTED_TAG]);
    expect(captchaRejectionTags(null)).toEqual([CAPTCHA_REJECTED_TAG]);
  });
});

describe("submissionWarnings", () => {
  it("zeigt den Doppel-Hinweis nur bei passendem Tag", () => {
    expect(submissionWarnings(["testlauf"])).toEqual([]);
    expect(submissionWarnings([DUPLICATE_SUSPECT_TAG]).map((warning) => warning.title)).toEqual(["VORSICHT DOPPELEINREICHUNG?"]);
  });

  it("haelt die Reihenfolge fest, egal wie die Tags stehen", () => {
    expect(submissionWarnings([RECOVERED_TAG, DUPLICATE_SUSPECT_TAG]).map((warning) => warning.tag)).toEqual([DUPLICATE_SUSPECT_TAG, RECOVERED_TAG]);
  });
});
