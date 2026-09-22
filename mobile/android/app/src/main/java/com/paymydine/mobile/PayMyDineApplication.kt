package com.paymydine.mobile

import android.app.Application
import android.content.Intent
import com.paymydine.mobile.data.local.BootstrapRepository
import com.paymydine.mobile.data.local.KdsRepository
import com.paymydine.mobile.data.local.LocalPosRepository
import com.paymydine.mobile.data.local.OfflineImageCache
import com.paymydine.mobile.data.local.PmdDatabase
import com.paymydine.mobile.edge.EdgeService
import com.paymydine.mobile.network.ConnectivityObserver
import com.paymydine.mobile.network.EdgeDiscovery
import com.paymydine.mobile.security.DeviceCredentialStore
import com.paymydine.mobile.sync.SyncEngine
import com.paymydine.mobile.sync.SyncRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

class PayMyDineApplication : Application() {
    lateinit var database: PmdDatabase
        private set
    lateinit var syncRepository: SyncRepository
        private set
    lateinit var bootstrapRepository: BootstrapRepository
        private set
    lateinit var localPosRepository: LocalPosRepository
        private set
    lateinit var offlineImageCache: OfflineImageCache
        private set
    lateinit var kdsRepository: KdsRepository
        private set

    private val _pairingLink = MutableStateFlow<String?>(null)
    val pairingLink = _pairingLink.asStateFlow()
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
        localPosRepository = LocalPosRepository(database)
        offlineImageCache = OfflineImageCache(this)
        kdsRepository = KdsRepository(database)
        credentials = DeviceCredentialStore(this)
        connectivity = ConnectivityObserver(this).also { it.start() }
        edgeDiscovery = EdgeDiscovery(this).also { it.start() }
        SyncEngine.schedulePeriodic(this)
        EdgeService.startIfEnabled(this)
    }

    fun handleIntent(intent: Intent?) {
        val uri = intent?.data ?: return
        if (uri.scheme == "paymydine" && uri.host == "pair") {
            _pairingLink.value = uri.toString()
        }
    }

    fun consumePairingLink(value: String) {
        if (_pairingLink.value == value) {
            _pairingLink.value = null
        }
    }
}
