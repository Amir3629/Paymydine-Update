package com.paymydine.mobile

import android.app.Application
import android.content.Intent
import com.paymydine.mobile.data.local.BootstrapRepository
import com.paymydine.mobile.data.local.PmdDatabase
import com.paymydine.mobile.network.ConnectivityObserver
import com.paymydine.mobile.network.EdgeDiscovery
import com.paymydine.mobile.security.DeviceCredentialStore
import com.paymydine.mobile.sync.SyncRepository
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow

class PayMyDineApplication : Application() {
    lateinit var database: PmdDatabase
        private set
    lateinit var syncRepository: SyncRepository
        private set
    lateinit var bootstrapRepository: BootstrapRepository
        private set

    private val _pairingLinks = MutableSharedFlow<String>(extraBufferCapacity = 4)
    val pairingLinks = _pairingLinks.asSharedFlow()
    lateinit var credentials: DeviceCredentialStore
        private set
    lateinit var connectivity: ConnectivityObserver
        private set
    lateinit var edgeDiscovery: EdgeDiscovery
        private set

    override fun onCreate() {
        super.onCreate()
        database = PmdDatabase(this)
        syncRepository = SyncRepository(database)
        bootstrapRepository = BootstrapRepository(database)
        credentials = DeviceCredentialStore(this)
        connectivity = ConnectivityObserver(this).also { it.start() }
        edgeDiscovery = EdgeDiscovery(this).also { it.start() }
    }

    fun handleIntent(intent: Intent?) {
        val uri = intent?.data ?: return
        if (uri.scheme == "paymydine" && uri.host == "pair") {
            _pairingLinks.tryEmit(uri.toString())
        }
    }
}
