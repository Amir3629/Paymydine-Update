package com.paymydine.mobile.network

enum class TransportKind { EDGE, CLOUD, OFFLINE }

data class TransportDecision(
    val kind: TransportKind,
    val baseUrl: String?,
    val reason: String,
)

class TransportRouter {
    fun decide(
        cloudOnline: Boolean,
        edge: EdgeEndpoint?,
        pinnedEdgeFingerprint: String?,
        expectedSiteId: String? = null,
    ): TransportDecision {
        val fingerprintMatches =
            edge != null &&
                !edge.fingerprint.isNullOrBlank() &&
                !pinnedEdgeFingerprint.isNullOrBlank() &&
                edge.fingerprint.equals(
                    pinnedEdgeFingerprint,
                    ignoreCase = true,
                )
        val siteMatches =
            expectedSiteId.isNullOrBlank() ||
                edge?.siteId?.trim() == expectedSiteId.trim()

        if (fingerprintMatches && siteMatches) {
            return TransportDecision(
                TransportKind.EDGE,
                "https://${edge!!.host}:${edge.port}",
                "Trusted restaurant Edge is reachable on the LAN.",
            )
        }

        if (cloudOnline) {
            return TransportDecision(
                TransportKind.CLOUD,
                null,
                when {
                    edge == null ->
                        "Cloud reachable; no Edge discovered."
                    fingerprintMatches && !siteMatches ->
                        "Cloud reachable; discovered Edge belongs to another restaurant site."
                    else ->
                        "Cloud reachable; discovered Edge is not paired."
                },
            )
        }

        return TransportDecision(
            TransportKind.OFFLINE,
            null,
            when {
                edge == null ->
                    "No validated internet and no restaurant Edge."
                fingerprintMatches && !siteMatches ->
                    "Discovered Edge site identity does not match this restaurant."
                else ->
                    "Discovered Edge is not trusted; traffic is blocked."
            },
        )
    }
}
