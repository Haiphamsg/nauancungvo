import { NextResponse } from "next/server";
import nodeFetch from "node-fetch";

export async function GET() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    const results: Record<string, any> = {
        supabaseUrl: supabaseUrl ? "[SET]" : null,
        serviceKey: serviceKey ? "[SET]" : null,
        anonKey: anonKey ? "[SET]" : null,
        usingNodeFetch: true,
    };

    // Test 1: Can we resolve the hostname?
    try {
        const url = new URL(supabaseUrl);
        results.hostname = url.hostname;
    } catch (e: any) {
        results.urlParseError = e.message;
    }

    // Test 2: Can we make a simple fetch to the Supabase REST API?
    if (supabaseUrl && serviceKey) {
        try {
            const testUrl = `${supabaseUrl}/rest/v1/`;
            const res = await nodeFetch(testUrl, {
                method: "GET",
                headers: {
                    apikey: serviceKey,
                    Authorization: `Bearer ${serviceKey}`,
                },
            });
            results.fetchStatus = res.status;
            results.fetchOk = res.ok;
            if (!res.ok) {
                results.fetchBody = await res.text().catch(() => "unable to read body");
            }
        } catch (e: any) {
            results.fetchError = e.message;
            results.fetchCause = e.cause
                ? { name: e.cause.name, code: e.cause.code, message: e.cause.message }
                : null;
        }
    }

    // Test 3: Can we ping a known external URL?
    try {
        const pingRes = await nodeFetch("https://httpbin.org/get", { method: "GET" });
        results.externalPingStatus = pingRes.status;
    } catch (e: any) {
        results.externalPingError = e.message;
    }

    return NextResponse.json(results);
}
