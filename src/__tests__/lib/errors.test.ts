import { describe, it, expect, vi, beforeEach } from "vitest";
import { toUiError } from "@/lib/errors";

describe("toUiError", () => {
    it("should parse Supabase 401 error", () => {
        const error = new Error("Supabase 401: {\"message\":\"unauthorized\"}");
        const result = toUiError(error);

        expect(result.status).toBe(401);
        expect(result.title).toBe("Không có quyền truy cập dữ liệu");
    });

    it("should parse Supabase 403 error", () => {
        const error = new Error("Supabase RPC 403: {\"message\":\"forbidden\"}");
        const result = toUiError(error);

        expect(result.status).toBe(403);
        expect(result.title).toBe("Không có quyền truy cập dữ liệu");
    });

    it("should parse Supabase 500 error", () => {
        const error = new Error("Supabase 500: {\"message\":\"internal error\"}");
        const result = toUiError(error);

        expect(result.status).toBe(500);
        expect(result.title).toBe("Máy chủ dữ liệu đang lỗi");
    });

    it("should handle network errors", () => {
        const error = new Error("fetch failed");
        const result = toUiError(error);

        expect(result.title).toBe("Không kết nối được dữ liệu");
    });

    it("should handle unknown errors", () => {
        const error = new Error("Something went wrong");
        const result = toUiError(error);

        expect(result.title).toBe("Có lỗi xảy ra");
        expect(result.message).toBe("Something went wrong");
    });

    it("should handle non-Error values", () => {
        const result = toUiError("string error");

        expect(result.title).toBe("Có lỗi xảy ra");
        expect(result.message).toBe("string error");
    });
});
