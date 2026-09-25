package com.paymydine.mobile.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class ConnectivityObserver(context: Context) {
    private val manager = context.getSystemService(ConnectivityManager::class.java)
    private val _online = MutableStateFlow(false)
    val online: StateFlow<Boolean> = _online

    private val callback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) = refresh()
        override fun onLost(network: Network) = refresh()
        override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) = refresh()
    }

    fun start() {
        refresh()
        manager.registerDefaultNetworkCallback(callback)
    }

    // PMD_ANDROID_CONNECTIVITY_SYNC_PROBE_V21
    // Request-path failover cannot wait for NetworkCallback delivery. Quick POS
    // asks this synchronously immediately before a Cloud fetch.
    fun isOnlineNow(): Boolean {
        val network = manager.activeNetwork
        val capabilities = network?.let(manager::getNetworkCapabilities)
        return capabilities
            ?.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) == true
    }

    private fun refresh() {
        _online.value = isOnlineNow()
    }
}
