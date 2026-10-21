import { useWindowDimensions } from "react-native";

/** Độ rộng tối đa của cột nội dung (form, danh sách) trên iPad để chữ không bị kéo dài cả màn hình */
export const CONTENT_MAX = 720;
export const FORM_MAX = 560;

/**
 * Bố cục theo kích thước cửa sổ (không theo loại máy): iPad chia đôi màn hình / Stage Manager có thể hẹp như điện thoại.
 * - tablet: cửa sổ đủ rộng để chữ to hơn, nhiều cột
 * - split: đủ rộng & nằm ngang → màn học đặt video và transcript cạnh nhau
 */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const tablet = width >= 700;
  return {
    width,
    height,
    tablet,
    split: width >= 900 && width > height,
    /** Cỡ chữ: iPad to hơn một chút để đọc từ xa (dựng trên giá) */
    fs: (n: number) => (tablet ? Math.round(n * 1.15) : n),
  };
}
