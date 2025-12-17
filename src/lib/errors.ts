export type UiError = {
  title: string;
  message: string;
  status?: number;
};

export function toUiError(err: unknown): UiError {
  const msg = err instanceof Error ? err.message : String(err);

  // Bắt lỗi Supabase REST/RPC kiểu: "Supabase 401: {...}" hoặc "Supabase RPC 403: {...}"
  const m = msg.match(/Supabase(?: RPC)?\s(\d{3}):\s(.+)/);
  if (m) {
    const status = Number(m[1]);
    if (status === 401 || status === 403) {
      return {
        title: "Không có quyền truy cập dữ liệu",
        message:
          "Thiếu quyền (RLS) hoặc thiếu API key env. Hãy kiểm tra NEXT_PUBLIC_SUPABASE_URL/ANON_KEY và policy SELECT cho anon.",
        status,
      };
    }
    if (status >= 500) {
      return {
        title: "Máy chủ dữ liệu đang lỗi",
        message: "Supabase đang gặp sự cố hoặc quá tải. Thử lại sau.",
        status,
      };
    }
    return {
      title: "Lỗi dữ liệu",
      message: msg,
      status,
    };
  }

  // Lỗi network / fetch failed
  if (msg.includes("fetch failed") || msg.includes("NetworkError")) {
    return {
      title: "Không kết nối được dữ liệu",
      message:
        "Không gọi được Supabase (network/DNS). Kiểm tra hosting outbound HTTPS, domain Supabase, hoặc giới hạn tài nguyên.",
    };
  }

  return {
    title: "Có lỗi xảy ra",
    message: msg || "Không rõ nguyên nhân",
  };
}
