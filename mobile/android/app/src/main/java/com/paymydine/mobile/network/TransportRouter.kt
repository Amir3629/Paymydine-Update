package com.paymydine.mobile.network

enum class TransportKind { EDGE, CLOUD, OFFLINE }

data class TransportDecision(val kind: TransportKind, val baseUrl: String?, val reason: String)

class TransportRouter {
    fun decide(cloudOnline: Boolean, edge: EdgeEndpoint?, pinnedEdgeFingerprint: String?): TransportDecision {
        if (
            edge != null && !edge.fingerprint.isNullOrBlank() && !pinnedEdgeFingerprint.isNullOrBlank() &&
            edge.fingerprint.equals(pinnedEdgeFingerprint, ignoreCase = true)
        ) {
            return TransportDecision(
                TransportKind.EDGE,
                "https://${edge.host}:${edge.port}",
                "Trusted restaurant Edge is reachable on the LAN."
            )
        }
        if (cloudOnline) {
            return TransportDecision(
                TransportKind.CLOUD, null,
                if (edge == null) "Cloud reachable; no Edge discovered."
                else "Cloud reachable; discovered Edge is not paired."
            )
        }
        return TransportDecision(
            TransportKind.OFFLINE, null,
            if (edge == null) "No validated internet and no restaurant Edge."
            else "Discovered Edge is not trusted; traffic is blocked."
        )
    }
}
