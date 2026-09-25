package com.paymydine.mobile.network

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.util.concurrent.ConcurrentHashMap

data class EdgeEndpoint(
    val serviceName: String,
    val host: String,
    val port: Int,
    val fingerprint: String?,
    val siteId: String?,
)

class EdgeDiscovery(context: Context) {
    private val nsd = context.getSystemService(NsdManager::class.java)
    private val resolved = ConcurrentHashMap.newKeySet<String>()
    private val _endpoint = MutableStateFlow<EdgeEndpoint?>(null)
    val endpoint: StateFlow<EdgeEndpoint?> = _endpoint

    private val resolveListener = object : NsdManager.ResolveListener {
        override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
            resolved.remove(serviceInfo.serviceName)
        }

        override fun onServiceResolved(serviceInfo: NsdServiceInfo) {
            val tls = serviceInfo.attributes["tls"]?.toString(Charsets.UTF_8)
            if (tls != "1") {
                resolved.remove(serviceInfo.serviceName)
                return
            }
            val host = serviceInfo.host?.hostAddress?.trim().orEmpty()
            if (host.isBlank() || serviceInfo.port !in 1..65535) {
                resolved.remove(serviceInfo.serviceName)
                return
            }
            _endpoint.value = EdgeEndpoint(
                serviceName = serviceInfo.serviceName,
                host = host,
                port = serviceInfo.port,
                fingerprint = serviceInfo.attributes["fingerprint"]?.toString(Charsets.UTF_8),
                siteId = serviceInfo.attributes["site"]?.toString(Charsets.UTF_8),
            )
        }
    }

    private val discoveryListener = object : NsdManager.DiscoveryListener {
        override fun onDiscoveryStarted(serviceType: String) = Unit
        override fun onDiscoveryStopped(serviceType: String) = Unit
        override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) = Unit
        override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) = Unit
        override fun onServiceFound(serviceInfo: NsdServiceInfo) {
            if (serviceInfo.serviceType != SERVICE_TYPE) return
            if (!serviceInfo.serviceName.startsWith("PayMyDine", ignoreCase = true)) return
            if (resolved.add(serviceInfo.serviceName)) {
                @Suppress("DEPRECATION")
                nsd.resolveService(serviceInfo, resolveListener)
            }
        }
        override fun onServiceLost(serviceInfo: NsdServiceInfo) {
            resolved.remove(serviceInfo.serviceName)
            if (_endpoint.value?.serviceName == serviceInfo.serviceName) _endpoint.value = null
        }
    }

    fun start() {
        runCatching {
            nsd.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, discoveryListener)
        }
    }

    companion object { const val SERVICE_TYPE = "_paymydine-edge._tcp." }
}
