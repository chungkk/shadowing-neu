import * as WebBrowser from "expo-web-browser";
import { API_URL } from "./api";
import { showError } from "./dialogs";
import { currentLang } from "./i18n";
import { C } from "./theme";

/** Chính sách quyền riêng tư / Điều khoản sử dụng: trang web của server (ckk.biz/deutsch-shadowing/privacy, …/privacy/de…) mở trong trình duyệt nhúng */
export type LegalDoc = "privacy" | "terms";

export const legalUrl = (doc: LegalDoc) => `${API_URL}/deutsch-shadowing/${doc}${currentLang() === "de" ? "/de" : ""}`;

export function openLegal(doc: LegalDoc) {
  WebBrowser.openBrowserAsync(legalUrl(doc), {
    controlsColor: C.accentText,
    toolbarColor: C.background,
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  }).catch((e) => showError(e));
}
