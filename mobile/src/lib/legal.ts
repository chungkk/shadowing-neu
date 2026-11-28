import * as WebBrowser from "expo-web-browser";
import { API_URL } from "./api";
import { showError } from "./dialogs";
import { currentLang } from "./i18n";
import { C } from "./theme";

/** Chính sách quyền riêng tư / Điều khoản sử dụng / Impressum / Hỗ trợ / Giới thiệu: trang web của server (hallovn.de/<doc>?lang=vi|de) mở trong trình duyệt nhúng. */
export type LegalDoc = "privacy" | "terms" | "impressum" | "support" | "about";

export const legalUrl = (doc: LegalDoc) => `${API_URL}/${doc}?lang=${currentLang() === "de" ? "de" : "vi"}`;

export function openLegal(doc: LegalDoc) {
  WebBrowser.openBrowserAsync(legalUrl(doc), {
    controlsColor: C.accentText,
    toolbarColor: C.background,
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  }).catch((e) => showError(e));
}
