import * as WebBrowser from "expo-web-browser";
import { API_URL } from "./api";
import { showError } from "./dialogs";
import { currentLang } from "./i18n";
import { C } from "./theme";

/** Chính sách quyền riêng tư / Điều khoản sử dụng: trang web của server (hallovn.de/privacy?lang=vi|de, /terms…) mở trong trình duyệt nhúng.
 * Gọi thẳng đường dẫn mới — đường cũ /deutsch-shadowing/… chỉ còn chuyển hướng 308. */
export type LegalDoc = "privacy" | "terms";

export const legalUrl = (doc: LegalDoc) => `${API_URL}/${doc}?lang=${currentLang() === "de" ? "de" : "vi"}`;

export function openLegal(doc: LegalDoc) {
  WebBrowser.openBrowserAsync(legalUrl(doc), {
    controlsColor: C.accentText,
    toolbarColor: C.background,
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  }).catch((e) => showError(e));
}
