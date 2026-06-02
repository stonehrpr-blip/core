// CoreClient.swift — Swift client SDK for the CORE backend.
//
// Drop this into your iOS app target. Wraps every backend endpoint into a
// strongly-typed async API. Handles JWT cookies, CSRF, push registration,
// StoreKit handoff.
//
// Usage:
//   let core = CoreClient(baseURL: URL(string: "https://core.harperlinks.com")!)
//   try await core.signIn(email: "...", password: "...", fingerprint: deviceFp)
//   let me = try await core.me()
//
// Requires iOS 16+ for `async/await` + StoreKit 2.

import Foundation
import StoreKit

public actor CoreClient {
    public let baseURL: URL
    private let session: URLSession
    private var csrfToken: String?

    public init(baseURL: URL) {
        self.baseURL = baseURL
        let cfg = URLSessionConfiguration.default
        cfg.httpCookieAcceptPolicy = .always
        cfg.httpShouldSetCookies = true
        self.session = URLSession(configuration: cfg)
    }

    // MARK: - Models

    public struct User: Codable {
        public let id: String
        public let email: String
        public let handle: String
        public let displayName: String
        public let avatarKey: String
        public let tier: String
        public let coins: Int
        public let xp: Int
    }
    public struct Entitlement: Codable {
        public let tier: String
        public let status: String
        public let expiresAt: Date?
    }
    public struct MeResponse: Codable {
        public let user: User
        public let entitlement: Entitlement
    }

    // MARK: - Auth

    @discardableResult
    public func signIn(email: String, password: String, fingerprint: String) async throws -> User {
        let body: [String: Any] = ["email": email, "password": password, "fingerprint": fingerprint]
        let res: SignInResponse = try await post("/api/auth/sign-in", body: body)
        return res.user
    }
    public func signOut() async throws {
        try await postVoid("/api/auth/sign-out", body: [:])
    }

    public struct SignInResponse: Codable { public let user: User }

    // MARK: - Me

    public func me() async throws -> MeResponse {
        try await get("/api/me")
    }

    // MARK: - Push

    /// Register the device's APNs token with the backend. Call from
    /// `application(_:didRegisterForRemoteNotificationsWithDeviceToken:)`.
    public func registerPushToken(_ token: Data, timezone: String = TimeZone.current.identifier) async throws {
        let hex = token.map { String(format: "%02x", $0) }.joined()
        try await postVoid("/api/me/push/register", body: [
            "token": hex,
            "kind": "ios",
            "timezone": timezone,
        ])
    }

    // MARK: - Coach (streaming)

    public struct CoachDelta: Decodable {
        public let delta: String?
        public let done: Bool?
        public let error: String?
    }

    /// Send a message to the AI Coach. Yields each token as it streams.
    public func coachMessage(_ text: String) -> AsyncThrowingStream<String, Error> {
        AsyncThrowingStream { continuation in
            Task {
                do {
                    var req = try await buildRequest("/api/coach/message", method: "POST")
                    req.httpBody = try JSONSerialization.data(withJSONObject: ["text": text])
                    let (bytes, response) = try await session.bytes(for: req)
                    guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                        throw NSError(domain: "CoreClient", code: -1, userInfo: [NSLocalizedDescriptionKey: "coach_request_failed"])
                    }
                    for try await line in bytes.lines {
                        guard line.hasPrefix("data:") else { continue }
                        let payload = line.dropFirst(5).trimmingCharacters(in: .whitespaces)
                        if let data = payload.data(using: .utf8),
                           let evt = try? JSONDecoder().decode(CoachDelta.self, from: data) {
                            if let delta = evt.delta { continuation.yield(delta) }
                            if evt.done == true { break }
                            if let err = evt.error { throw NSError(domain: "CoreClient", code: -2, userInfo: [NSLocalizedDescriptionKey: err]) }
                        }
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
        }
    }

    // MARK: - StoreKit handoff

    /// After a successful StoreKit purchase, send the JWS-signed transaction to the
    /// backend for verification + Subscription row creation.
    public func recordStoreKitTransaction(_ verification: VerificationResult<StoreKit.Transaction>) async throws {
        switch verification {
        case .verified(let txn):
            let jws = verification.jwsRepresentation
            try await postVoid("/api/storekit/transaction", body: [
                "signedTransactionInfo": jws,
            ])
            await txn.finish()
        case .unverified(_, let err):
            throw err
        }
    }

    // MARK: - HTTP helpers

    private func buildRequest(_ path: String, method: String) async throws -> URLRequest {
        var req = URLRequest(url: baseURL.appendingPathComponent(path))
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "content-type")
        if method != "GET", let csrf = csrfToken ?? extractCsrfFromCookies() {
            req.setValue(csrf, forHTTPHeaderField: "x-csrf-token")
            csrfToken = csrf
        }
        return req
    }

    private func extractCsrfFromCookies() -> String? {
        guard let storage = session.configuration.httpCookieStorage,
              let cookies = storage.cookies(for: baseURL) else { return nil }
        return cookies.first(where: { $0.name == "core_csrf" })?.value
    }

    private func get<T: Decodable>(_ path: String) async throws -> T {
        let req = try await buildRequest(path, method: "GET")
        let (data, _) = try await session.data(for: req)
        return try JSONDecoder().decode(T.self, from: data)
    }
    private func post<T: Decodable>(_ path: String, body: [String: Any]) async throws -> T {
        var req = try await buildRequest(path, method: "POST")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await session.data(for: req)
        if let http = response as? HTTPURLResponse, http.statusCode >= 400 {
            throw NSError(domain: "CoreClient", code: http.statusCode, userInfo: [NSLocalizedDescriptionKey: String(data: data, encoding: .utf8) ?? ""])
        }
        return try JSONDecoder().decode(T.self, from: data)
    }
    private func postVoid(_ path: String, body: [String: Any]) async throws {
        var req = try await buildRequest(path, method: "POST")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await session.data(for: req)
        if let http = response as? HTTPURLResponse, http.statusCode >= 400 {
            throw NSError(domain: "CoreClient", code: http.statusCode, userInfo: [NSLocalizedDescriptionKey: String(data: data, encoding: .utf8) ?? ""])
        }
    }
}
