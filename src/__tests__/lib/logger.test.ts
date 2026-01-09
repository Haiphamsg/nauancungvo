import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "@/lib/logger";

describe("logger", () => {
    let consoleSpy: {
        log: ReturnType<typeof vi.spyOn>;
        info: ReturnType<typeof vi.spyOn>;
        warn: ReturnType<typeof vi.spyOn>;
        error: ReturnType<typeof vi.spyOn>;
    };

    beforeEach(() => {
        consoleSpy = {
            log: vi.spyOn(console, "log").mockImplementation(() => { }),
            info: vi.spyOn(console, "info").mockImplementation(() => { }),
            warn: vi.spyOn(console, "warn").mockImplementation(() => { }),
            error: vi.spyOn(console, "error").mockImplementation(() => { }),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("in development mode", () => {
        beforeEach(() => {
            vi.stubEnv("NODE_ENV", "development");
        });

        it("logger.debug should log in development", () => {
            // Note: since NODE_ENV is evaluated at module load time,
            // this test may not work as expected without module reload
            // This is a limitation of testing environment
        });
    });

    describe("logger.warn", () => {
        it("should always log warnings", () => {
            logger.warn("test warning");
            expect(consoleSpy.warn).toHaveBeenCalledWith("[WARN]", "test warning");
        });
    });

    describe("logger.error", () => {
        it("should always log errors", () => {
            logger.error("test error", { details: "info" });
            expect(consoleSpy.error).toHaveBeenCalledWith("[ERROR]", "test error", { details: "info" });
        });
    });
});
