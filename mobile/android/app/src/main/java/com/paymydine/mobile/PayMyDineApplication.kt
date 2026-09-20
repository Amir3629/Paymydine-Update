package com.paymydine.mobile

import android.app.Application
import com.paymydine.mobile.data.local.PmdDatabase
import com.paymydine.mobile.network.ConnectivityObserver
import com.paymydine.mobile.network.EdgeDiscovery
import com.paymydine.mobile.security.DeviceCredentialStore
import com.paymydine.mobile.sync.SyncRepository

class PayMyDineApplication : Application() {
    lateinit var database: PmdDatabase
        private set
    lateinit var syncRepository: SyncRepository
        private set
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
        credentials = DeviceCredentialStore(this)
        connectivity = ConnectivityObserver(this).also { it.start() }
        edgeDiscovery = EdgeDiscovery(this).also { it.start() }
    }
}
